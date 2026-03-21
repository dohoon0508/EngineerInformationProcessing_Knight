import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useKakaoAuth } from "../context/KakaoAuthContext";
import "./LoginPage.css";

export default function LoginPage() {
  const {
    kakaoConfigured,
    sessionReady,
    user,
    login,
    oauthWorking,
    authError,
    clearAuthError,
  } = useKakaoAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? "/";

  useEffect(() => {
    if (sessionReady && !kakaoConfigured) {
      navigate("/", { replace: true });
    }
  }, [sessionReady, kakaoConfigured, navigate]);

  useEffect(() => {
    if (sessionReady && user) {
      navigate(from, { replace: true });
    }
  }, [sessionReady, user, navigate, from]);

  if (!sessionReady) {
    return (
      <div className="login-page">
        <p className="login-page__status" role="status" aria-live="polite">
          로그인 상태 확인 중…
        </p>
      </div>
    );
  }

  if (!kakaoConfigured) {
    return null;
  }

  return (
    <div className="login-page">
      <div className="login-page__card">
        <h1 className="login-page__title">정보처리기사 암기 퀴즈</h1>
        <p className="login-page__lead">이용을 위해 카카오 로그인이 필요합니다.</p>

        {authError ? (
          <div className="login-page__alert" role="alert">
            <p className="login-page__alert-title">{authError.title}</p>
            {authError.detail ? (
              <p className="login-page__alert-detail">{authError.detail}</p>
            ) : null}
            <button type="button" className="login-page__alert-dismiss" onClick={clearAuthError}>
              닫기
            </button>
          </div>
        ) : null}

        {oauthWorking ? (
          <p className="login-page__working" role="status" aria-live="polite">
            카카오 로그인 처리 중…
          </p>
        ) : null}

        <button
          type="button"
          className="login-page__kakao"
          onClick={login}
          disabled={oauthWorking}
        >
          {oauthWorking ? "처리 중…" : "카카오 로그인"}
        </button>
      </div>
    </div>
  );
}
