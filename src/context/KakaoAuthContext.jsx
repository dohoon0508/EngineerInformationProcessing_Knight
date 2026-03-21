import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { mergeGuestStatsIntoUser } from "../utils/storage";
import { registerStatsPusher, schedulePushStats } from "../utils/statsSync";
import { syncQuizStatsWithCloudOnLogin } from "../utils/cloudStatsMerge";
import {
  KAKAO_SDK_SCRIPT_URL,
  KAKAO_OAUTH_PENDING_CODE_KEY,
  getKakaoOAuthRedirectUri,
  exchangeKakaoCodeViaApi,
} from "../kakao/index.js";

const KakaoAuthContext = createContext(null);

function loadKakaoScript() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    if (window.Kakao) return resolve();
    const existing = document.querySelector(`script[src="${KAKAO_SDK_SCRIPT_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Kakao SDK load failed")));
      return;
    }
    const script = document.createElement("script");
    script.src = KAKAO_SDK_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Kakao SDK load failed"));
    document.head.appendChild(script);
  });
}

export function KakaoAuthProvider({ children }) {
  const [sdkReady, setSdkReady] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [user, setUser] = useState(null);
  /** 인가 코드 → /api/kakao-token 교환 중 (로그인 페이지 스피너용) */
  const [oauthWorking, setOauthWorking] = useState(false);
  /** 화면에 표시할 로그인 관련 오류 (alert 대신) */
  const [authError, setAuthError] = useState(null);

  const jsKey = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY;

  const clearAuthError = useCallback(() => setAuthError(null), []);

  useEffect(() => {
    if (!jsKey) {
      setSdkReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await loadKakaoScript();
        if (cancelled || typeof window === "undefined" || !window.Kakao) return;
        if (!window.Kakao.isInitialized()) {
          window.Kakao.init(jsKey);
        }
        if (!cancelled) setSdkReady(true);
      } catch {
        if (!cancelled) setSdkReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jsKey]);

  const fetchMe = useCallback(() => {
    if (typeof window === "undefined" || !window.Kakao?.API) return Promise.resolve(null);
    return new Promise((resolve) => {
      window.Kakao.API.request({
        url: "/v2/user/me",
        success: (res) => resolve(res),
        fail: () => resolve(null),
      });
    });
  }, []);

  const completeLoginWithAccessToken = useCallback(
    async (token) => {
      if (typeof window === "undefined" || !token || !window.Kakao?.Auth) return;
      window.Kakao.Auth.setAccessToken(token);
      const res = await fetchMe();
      if (!res?.id) {
        setAuthError({
          title: "프로필을 불러오지 못했습니다",
          detail: "액세스 토큰은 받았으나 카카오 사용자 정보(/v2/user/me) 조회에 실패했습니다. 동의항목·앱 설정을 확인하세요.",
        });
        return;
      }
      mergeGuestStatsIntoUser(res.id);
      const u = {
        id: res.id,
        nickname: res.properties?.nickname ?? res.kakao_account?.profile?.nickname ?? "카카오 사용자",
        profileImage:
          res.properties?.profile_image ??
          res.kakao_account?.profile?.profile_image_url ??
          null,
        accessToken: token,
      };
      setUser(u);
      await syncQuizStatsWithCloudOnLogin(token, res.id);
    },
    [fetchMe]
  );

  /**
   * 1) 카카오가 redirectUri 로 돌려보낸 ?code=… 처리
   * 2) Vercel `/api/kakao-token` 으로 code 교환 (REST client_id/secret 은 서버에만 존재)
   * SDK v2: Kakao.Auth.login 미지원 → 반드시 authorize + 이 단계 필요
   */
  useEffect(() => {
    if (!jsKey || !sdkReady || typeof window === "undefined" || !window.Kakao?.isInitialized?.()) {
      return;
    }
    const url = new URL(window.location.href);
    const oauthError = url.searchParams.get("error");
    const oauthDesc = url.searchParams.get("error_description");
    if (oauthError) {
      sessionStorage.removeItem(KAKAO_OAUTH_PENDING_CODE_KEY);
      window.history.replaceState({}, "", `${url.pathname}`);
      setAuthError({
        title: "카카오 로그인이 완료되지 않았습니다",
        detail: oauthDesc || oauthError,
      });
      return;
    }
    const fromUrl = url.searchParams.get("code");
    if (fromUrl) {
      sessionStorage.setItem(KAKAO_OAUTH_PENDING_CODE_KEY, fromUrl);
      window.history.replaceState({}, "", `${url.pathname}`);
    }
    const code = fromUrl || sessionStorage.getItem(KAKAO_OAUTH_PENDING_CODE_KEY);
    if (!code) return;

    const redirectUri = getKakaoOAuthRedirectUri();
    if (!redirectUri) return;

    let cancelled = false;
    setOauthWorking(true);

    (async () => {
      try {
        const result = await exchangeKakaoCodeViaApi(code, redirectUri);
        if (cancelled) return;
        if (!result.ok) {
          sessionStorage.removeItem(KAKAO_OAUTH_PENDING_CODE_KEY);
          setAuthError({
            title: result.message,
            detail: result.detail,
          });
          return;
        }
        sessionStorage.removeItem(KAKAO_OAUTH_PENDING_CODE_KEY);
        await completeLoginWithAccessToken(result.accessToken);
      } catch (e) {
        if (!cancelled) {
          sessionStorage.removeItem(KAKAO_OAUTH_PENDING_CODE_KEY);
          setAuthError({
            title: "로그인 처리 중 오류가 발생했습니다",
            detail: e instanceof Error ? e.message : String(e),
          });
        }
      } finally {
        if (!cancelled) setOauthWorking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [jsKey, sdkReady, completeLoginWithAccessToken]);

  useEffect(() => {
    if (!sdkReady) {
      setSessionReady(false);
      return;
    }
    if (!jsKey) {
      setSessionReady(true);
      return;
    }
    if (typeof window === "undefined" || !window.Kakao?.isInitialized?.()) {
      setUser(null);
      setSessionReady(true);
      return;
    }
    const token = window.Kakao.Auth.getAccessToken();
    if (!token) {
      setUser(null);
      setSessionReady(true);
      return;
    }
    let cancelled = false;
    fetchMe()
      .then((res) => {
        if (cancelled) return;
        if (!res?.id) {
          setUser(null);
          return;
        }
        const u = {
          id: res.id,
          nickname: res.properties?.nickname ?? res.kakao_account?.profile?.nickname ?? "카카오 사용자",
          profileImage:
            res.properties?.profile_image ??
            res.kakao_account?.profile?.profile_image_url ??
            null,
          accessToken: token,
        };
        setUser(u);
        mergeGuestStatsIntoUser(res.id);
        syncQuizStatsWithCloudOnLogin(token, res.id);
      })
      .finally(() => {
        if (!cancelled) setSessionReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [sdkReady, jsKey, fetchMe]);

  const login = useCallback(() => {
    clearAuthError();
    if (!jsKey || typeof window === "undefined" || !window.Kakao?.Auth?.authorize) {
      setAuthError({
        title: "카카오 로그인을 시작할 수 없습니다",
        detail: "VITE_KAKAO_JAVASCRIPT_KEY 가 설정되어 있는지 확인하세요.",
      });
      return;
    }
    if (!window.Kakao.isInitialized?.()) {
      setAuthError({
        title: "카카오 SDK를 준비하는 중입니다",
        detail: "잠시 후 다시 시도하세요.",
      });
      return;
    }
    const redirectUri = getKakaoOAuthRedirectUri();
    if (!redirectUri) {
      setAuthError({
        title: "리다이렉트 URI를 만들 수 없습니다",
        detail: "VITE_KAKAO_REDIRECT_URI / VITE_KAKAO_REDIRECT_PATH 설정을 확인하세요.",
      });
      return;
    }
    window.Kakao.Auth.authorize({
      redirectUri,
    });
  }, [jsKey, clearAuthError]);

  const logout = useCallback(() => {
    clearAuthError();
    if (typeof window !== "undefined" && window.Kakao?.Auth?.getAccessToken()) {
      window.Kakao.Auth.logout(() => setUser(null));
    } else {
      setUser(null);
    }
  }, [clearAuthError]);

  const kakaoUserId = user?.id ?? null;
  const accessToken = user?.accessToken ?? null;

  useEffect(() => {
    registerStatsPusher((stats, uid) => {
      if (accessToken != null && uid != null && user?.id === uid) {
        schedulePushStats(stats, accessToken);
      }
    });
    return () => registerStatsPusher(null);
  }, [accessToken, user?.id]);

  const value = useMemo(
    () => ({
      sdkReady,
      sessionReady,
      kakaoConfigured: Boolean(jsKey),
      user,
      kakaoUserId,
      accessToken,
      login,
      logout,
      oauthWorking,
      authError,
      clearAuthError,
    }),
    [
      sdkReady,
      sessionReady,
      jsKey,
      user,
      kakaoUserId,
      accessToken,
      login,
      logout,
      oauthWorking,
      authError,
      clearAuthError,
    ]
  );

  return <KakaoAuthContext.Provider value={value}>{children}</KakaoAuthContext.Provider>;
}

/* eslint-disable react-refresh/only-export-components -- 훅은 Provider와 같은 모듈에서 export */
export function useKakaoAuth() {
  const ctx = useContext(KakaoAuthContext);
  if (!ctx) {
    throw new Error("useKakaoAuth는 KakaoAuthProvider 안에서만 사용하세요.");
  }
  return ctx;
}
