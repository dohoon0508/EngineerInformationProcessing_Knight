import { Navigate, useLocation } from "react-router-dom";
import { useKakaoAuth } from "../context/KakaoAuthContext";

export default function RequireAuth({ children }) {
  const { kakaoConfigured, sessionReady, user } = useKakaoAuth();
  const location = useLocation();

  if (!kakaoConfigured) return children;
  if (!sessionReady) {
    return (
      <div className="auth-gate-loading" role="status" aria-live="polite">
        로그인 상태 확인 중…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}
