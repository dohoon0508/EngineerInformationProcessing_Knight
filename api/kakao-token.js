/**
 * Vercel Serverless Function — POST /api/kakao-token
 *
 * 역할
 * ----
 * 브라우저는 카카오 JavaScript SDK로 `Kakao.Auth.authorize`만 호출하고, 돌아온 `code`를
 * 이 API로 보낸다. 여기서만 카카오 REST `POST https://kauth.kakao.com/oauth/token` 을 호출하며
 * `client_secret` 이 사용된다 (절대 프론트·VITE_ 에 넣지 말 것).
 *
 * 키 구분 (혼동 금지)
 * -----------------
 * - 브라우저 SDK 초기화: JavaScript 키 → VITE_KAKAO_JAVASCRIPT_KEY
 * - 이 파일의 토큰 요청: REST API 키 → KAKAO_REST_API_KEY, 시크릿 → KAKAO_CLIENT_SECRET
 *
 * redirect_uri
 * ------------
 * `authorize()` 에 넣은 값과 토큰 요청의 `redirect_uri` 는 문자 단위로 동일해야 한다.
 * 카카오 콘솔의 "JavaScript 키 → Redirect URI" 에 등록된 값과 맞출 것.
 *
 * 환경 변수
 * ---------
 * - KAKAO_REST_API_KEY (필수)
 * - KAKAO_CLIENT_SECRET (필수)
 * - KAKAO_OAUTH_REDIRECT_PATHS (선택) 허용 pathname, 쉼표 구분. 기본 `/login`
 */

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

/**
 * authorize() 에 넣은 redirect_uri 와 토큰 요청의 redirect_uri 가 완전히 같아야 함.
 * 보안상 허용 경로만 통과 (기본 /login). 추가 시 Vercel 에 KAKAO_OAUTH_REDIRECT_PATHS=/login,/auth/kakao/callback
 */
function isAllowedRedirectUri(redirectUri) {
  if (typeof redirectUri !== "string" || !redirectUri.startsWith("http")) return false;
  try {
    const u = new URL(redirectUri);
    if (!/^https?:$/i.test(u.protocol)) return false;
    const pathNorm = u.pathname.replace(/\/$/, "") || "/";
    const allowed = (process.env.KAKAO_OAUTH_REDIRECT_PATHS || "/login")
      .split(",")
      .map((s) => {
        const t = s.trim();
        if (!t) return "";
        return t.startsWith("/") ? t.replace(/\/$/, "") || "/" : `/${t.replace(/\/$/, "")}`;
      })
      .filter(Boolean);
    return allowed.includes(pathNorm);
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method not allowed" });
  }

  const clientId = process.env.KAKAO_REST_API_KEY;
  const clientSecret = process.env.KAKAO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return res.status(503).json({
      error: "kakao token exchange not configured",
      detail: "Vercel에 KAKAO_REST_API_KEY, KAKAO_CLIENT_SECRET 을 설정하세요.",
    });
  }

  let body = req.body;
  if (Buffer.isBuffer(body)) {
    body = JSON.parse(body.toString("utf8"));
  } else if (typeof body === "string") {
    body = JSON.parse(body);
  }

  const code = body?.code;
  const redirectUri = body?.redirectUri;
  if (!code || typeof code !== "string" || !redirectUri || typeof redirectUri !== "string") {
    return res.status(400).json({ error: "missing code or redirectUri" });
  }
  if (!isAllowedRedirectUri(redirectUri)) {
    return res.status(400).json({
      error: "invalid redirectUri",
      detail: "서버에서 허용하지 않는 redirect_uri 입니다. KAKAO_OAUTH_REDIRECT_PATHS 를 확인하세요.",
    });
  }

  const params = new URLSearchParams();
  params.set("grant_type", "authorization_code");
  params.set("client_id", clientId);
  params.set("redirect_uri", redirectUri);
  params.set("code", code);
  params.set("client_secret", clientSecret);

  const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: params.toString(),
  });

  const data = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok) {
    return res.status(401).json({
      error: data.error_description || data.error || "token request failed",
      kakao_error: data.error,
      kakao_error_description: data.error_description,
    });
  }

  if (!data.access_token) {
    return res.status(502).json({ error: "no access_token in response" });
  }

  return res.status(200).json({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  });
}
