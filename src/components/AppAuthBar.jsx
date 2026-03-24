import { Link, useLocation } from "react-router-dom";
import { useKakaoAuth } from "../context/KakaoAuthContext";
import { tryConfirmLeaveQuiz } from "../utils/quizLeaveConfirm";

export default function AppAuthBar() {
  const { kakaoConfigured, sessionReady, user, logout } = useKakaoAuth();
  const { pathname } = useLocation();

  if (!kakaoConfigured) return null;

  return (
    <header className="app-auth-bar">
      <Link
        to="/"
        className="app-auth-bar__brand"
        onClick={(e) => {
          if (!tryConfirmLeaveQuiz()) e.preventDefault();
        }}
      >
        정보처리기사 암기 퀴즈
      </Link>
      <div className="app-auth-bar__actions">
        {!sessionReady ? (
          <span className="app-auth-bar__muted">로그인 확인 중…</span>
        ) : user ? (
          <>
            {user.profileImage && (
              <img src={user.profileImage} alt="" className="app-auth-bar__avatar" width={26} height={26} />
            )}
            <span className="app-auth-bar__name" title="카카오 로그인됨">
              {user.nickname}
            </span>
            <button type="button" className="app-auth-bar__btn app-auth-bar__btn--ghost" onClick={logout}>
              로그아웃
            </button>
          </>
        ) : pathname !== "/login" ? (
          <Link
            to="/login"
            className="app-auth-bar__btn app-auth-bar__btn--kakao"
            onClick={(e) => {
              if (!tryConfirmLeaveQuiz()) e.preventDefault();
            }}
          >
            로그인
          </Link>
        ) : null}
      </div>
    </header>
  );
}
