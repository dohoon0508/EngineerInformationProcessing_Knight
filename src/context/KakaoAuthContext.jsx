import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { mergeGuestStatsIntoUser } from "../utils/storage";
import { registerStatsPusher, schedulePushStats } from "../utils/statsSync";
import { syncQuizStatsWithCloudOnLogin } from "../utils/cloudStatsMerge";

const KakaoAuthContext = createContext(null);

const KAKAO_SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";

function loadKakaoScript() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    if (window.Kakao) return resolve();
    const existing = document.querySelector(`script[src="${KAKAO_SDK_URL}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Kakao SDK load failed")));
      return;
    }
    const script = document.createElement("script");
    script.src = KAKAO_SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Kakao SDK load failed"));
    document.head.appendChild(script);
  });
}

export function KakaoAuthProvider({ children }) {
  const [sdkReady, setSdkReady] = useState(false);
  const [user, setUser] = useState(null);

  const jsKey = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY;

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

  useEffect(() => {
    if (!sdkReady || !jsKey || typeof window === "undefined" || !window.Kakao?.isInitialized?.()) {
      return;
    }
    const token = window.Kakao.Auth.getAccessToken();
    if (!token) return;
    fetchMe().then((res) => {
      if (!res?.id) return;
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
    });
  }, [sdkReady, jsKey, fetchMe]);

  const login = useCallback(() => {
    if (!jsKey || typeof window === "undefined" || !window.Kakao?.Auth) {
      alert("카카오 로그인이 설정되지 않았습니다. VITE_KAKAO_JAVASCRIPT_KEY 를 확인하세요.");
      return;
    }
    window.Kakao.Auth.login({
      success: async (authObj) => {
        const token = authObj.access_token;
        const res = await new Promise((resolve) => {
          window.Kakao.API.request({
            url: "/v2/user/me",
            success: (r) => resolve(r),
            fail: () => resolve(null),
          });
        });
        if (!res?.id) {
          alert("카카오 사용자 정보를 가져오지 못했습니다.");
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
      fail: () => {
        alert("카카오 로그인에 실패했습니다.");
      },
    });
  }, [jsKey]);

  const logout = useCallback(() => {
    if (typeof window !== "undefined" && window.Kakao?.Auth?.getAccessToken()) {
      window.Kakao.Auth.logout(() => setUser(null));
    } else {
      setUser(null);
    }
  }, []);

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
      kakaoConfigured: Boolean(jsKey),
      user,
      kakaoUserId,
      accessToken,
      login,
      logout,
    }),
    [sdkReady, jsKey, user, kakaoUserId, accessToken, login, logout]
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
