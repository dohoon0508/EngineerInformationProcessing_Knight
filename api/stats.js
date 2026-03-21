/**
 * Vercel Serverless — 카카오 액세스 토큰으로 본인 확인 후 통계 저장/조회
 * 환경 변수: DATABASE_URL (Neon 등 PostgreSQL)
 *
 * Admin 키는 여기서 사용하지 않습니다. (브라우저/깃에 넣지 마세요.)
 */

import { neon } from "@neondatabase/serverless";

async function verifyKakaoUser(accessToken) {
  const r = await fetch("https://kapi.kakao.com/v2/user/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!r.ok) return null;
  const j = await r.json();
  return j.id != null ? String(j.id) : null;
}

export default async function handler(req, res) {
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ error: "cloud sync not configured" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "missing token" });
  }
  const token = authHeader.slice(7);
  const kakaoId = await verifyKakaoUser(token);
  if (!kakaoId) {
    return res.status(401).json({ error: "invalid kakao token" });
  }

  const sql = neon(process.env.DATABASE_URL);

  await sql`
    CREATE TABLE IF NOT EXISTS quiz_user_stats (
      kakao_id VARCHAR(32) PRIMARY KEY,
      stats_json TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  if (req.method === "GET") {
    const rows = await sql`
      SELECT stats_json, updated_at FROM quiz_user_stats WHERE kakao_id = ${kakaoId}
    `;
    const row = rows[0];
    if (!row) return res.status(200).json({ stats: null });
    let stats = null;
    try {
      stats = JSON.parse(row.stats_json);
    } catch {
      /* ignore */
    }
    return res.status(200).json({ stats, updatedAt: row.updated_at });
  }

  if (req.method === "POST") {
    let body = req.body;
    if (Buffer.isBuffer(body)) {
      body = JSON.parse(body.toString("utf8"));
    } else if (typeof body === "string") {
      body = JSON.parse(body);
    }
    const stats = body?.stats;
    if (!stats || typeof stats !== "object") {
      return res.status(400).json({ error: "invalid stats" });
    }
    const jsonStr = JSON.stringify(stats);
    await sql`
      INSERT INTO quiz_user_stats (kakao_id, stats_json, updated_at)
      VALUES (${kakaoId}, ${jsonStr}, NOW())
      ON CONFLICT (kakao_id) DO UPDATE SET
        stats_json = EXCLUDED.stats_json,
        updated_at = NOW()
    `;
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "method not allowed" });
}
