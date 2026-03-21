/**
 * 카카오 로그인 관련 상수 (한곳 모음)
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ JavaScript SDK (브라우저)                                                  │
 * │  - Kakao.init(VITE_KAKAO_JAVASCRIPT_KEY)  ← "JavaScript 키"              │
 * │  - Kakao.Auth.authorize({ redirectUri })  ← 동일 문자열을 콘솔에 등록      │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ REST 토큰 API (서버에서만 — Vercel Function `/api/kakao-token`)            │
 * │  - POST https://kauth.kakao.com/oauth/token                               │
 * │  - client_id = KAKAO_REST_API_KEY  ← "REST API 키" (JS 키와 다름)         │
 * │  - client_secret = KAKAO_CLIENT_SECRET                                    │
 * │  - redirect_uri = authorize()에 넣은 값과 문자 단위 동일                   │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * 구형 Kakao.Auth.login() 은 SDK v2에서 제거됨. 반드시 authorize + 서버 교환 흐름 사용.
 */

/** 카카오에서 제공하는 번들 URL (프로젝트에서 고정 버전 사용) */
export const KAKAO_SDK_SCRIPT_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";

/**
 * Strict Mode 대비: 리다이렉트 직후 URL에서 code가 지워져도 교환을 이어가기 위한 sessionStorage 키
 */
export const KAKAO_OAUTH_PENDING_CODE_KEY = "kakao.oauth.code.pending";
