/**
 * redirect_uri 규칙 (카카오 공식):
 * - Auth.authorize({ redirectUri }) 로 보낸 값
 * - 토큰 요청 시 redirect_uri 파라미터
 * - 카카오 개발자 콘솔에 등록한 Redirect URI
 * 위 셋이 완전히 같아야 함 (슬래시, http/https, 포트 포함).
 */

/**
 * @returns {string} 현재 환경 기준 OAuth redirect URI (authorize + 토큰 교환 공통)
 */
export function getKakaoOAuthRedirectUri() {
  if (typeof window === "undefined") return "";
  const full = import.meta.env.VITE_KAKAO_REDIRECT_URI;
  if (full != null && String(full).trim() !== "") {
    return String(full).trim();
  }
  const path = import.meta.env.VITE_KAKAO_REDIRECT_PATH;
  const p = path != null && String(path).trim() !== "" ? String(path).trim() : "/login";
  const normalized = p.startsWith("/") ? p : `/${p}`;
  return new URL(normalized, window.location.origin).href;
}
