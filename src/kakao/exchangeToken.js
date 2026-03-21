import { getClientApiOrigin } from "../utils/apiOrigin";

/**
 * 브라우저에서 Vercel 서버리스 `/api/kakao-token` 으로 인가 코드를 넘겨 액세스 토큰을 받는다.
 *
 * 로컬 `npm run dev`에서는 Vite가 `/api/*`를 배포 URL로 프록시해야 한다 (vite.config.js).
 * 그렇지 않으면 POST /api/kakao-token 이 404가 된다.
 *
 * @param {string} code 카카오 인가 코드
 * @param {string} redirectUri authorize()에 사용한 것과 동일한 redirect_uri
 * @returns {Promise<{ ok: true, accessToken: string } | { ok: false, message: string, detail?: string, status?: number }>}
 */
export async function exchangeKakaoCodeViaApi(code, redirectUri) {
  const origin = getClientApiOrigin();
  if (!origin) {
    return {
      ok: false,
      message: "API 주소를 알 수 없습니다.",
      detail: "VITE_STATS_API_BASE 또는 브라우저 origin을 확인하세요.",
    };
  }

  const url = `${origin}/api/kakao-token`;
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, redirectUri }),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      message: "네트워크 오류로 토큰 요청에 실패했습니다.",
      detail: msg,
    };
  }

  const data = await res.json().catch(() => ({}));

  if (res.status === 404) {
    return {
      ok: false,
      status: 404,
      message: "토큰 API를 찾을 수 없습니다 (404).",
      detail:
        "로컬에서는 vite.config.js의 /api 프록시가 배포된 Vercel 주소를 가리키는지, npm run dev를 재시작했는지 확인하세요. 배포 환경에서는 Vercel에 api/kakao-token.js가 포함돼 있는지 확인하세요.",
    };
  }

  if (res.status === 405) {
    return {
      ok: false,
      status: 405,
      message: "토큰 API가 POST를 허용하지 않습니다 (405).",
      detail:
        "Vercel에서 SPA용 rewrite가 `/(.*)` → index.html 로 `/api`까지 덮어쓴 경우, POST가 index.html로 가며 405가 납니다. vercel.json에서 `/api`를 제외한 뒤 재배포했는지 확인하세요.",
    };
  }

  if (!res.ok) {
    const detail =
      data.kakao_error_description ||
      data.kakao_error ||
      data.error ||
      `HTTP ${res.status}`;
    return {
      ok: false,
      status: res.status,
      message: "카카오 로그인 토큰 발급에 실패했습니다.",
      detail,
    };
  }

  const accessToken = data.access_token;
  if (!accessToken || typeof accessToken !== "string") {
    return {
      ok: false,
      message: "서버 응답에 액세스 토큰이 없습니다.",
      detail: JSON.stringify(data).slice(0, 200),
    };
  }

  return { ok: true, accessToken };
}
