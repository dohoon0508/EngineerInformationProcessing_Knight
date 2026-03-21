/**
 * 관리자용 요약 — DB에 동기화된 카카오 사용자별 통계·즐겨찾기 건수
 * 헤더: X-Admin-Secret: <ADMIN_DASHBOARD_SECRET> (Vercel 환경 변수, 브라우저에 넣지 말 것)
 */

import { neon } from "@neondatabase/serverless";

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Secret");
}

function aggregateStatsJson(statsJson) {
  let stats = null;
  try {
    stats = JSON.parse(statsJson);
  } catch {
    return {
      topicsTouched: 0,
      totalCorrect: 0,
      totalWrong: 0,
      totalAttempts: 0,
      parseError: true,
    };
  }
  if (!stats || typeof stats !== "object") {
    return { topicsTouched: 0, totalCorrect: 0, totalWrong: 0, totalAttempts: 0 };
  }
  let totalCorrect = 0;
  let totalWrong = 0;
  let topicsTouched = 0;
  for (const topicId of Object.keys(stats)) {
    const t = stats[topicId];
    if (!t || typeof t !== "object") continue;
    topicsTouched += 1;
    totalCorrect += Number(t.totalCorrect) || 0;
    totalWrong += Number(t.totalWrong) || 0;
  }
  return {
    topicsTouched,
    totalCorrect,
    totalWrong,
    totalAttempts: totalCorrect + totalWrong,
  };
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "method not allowed" });
  }

  const configured = process.env.ADMIN_DASHBOARD_SECRET;
  if (!configured || String(configured).trim() === "") {
    return res.status(503).json({ error: "admin not configured" });
  }

  const sent = req.headers["x-admin-secret"];
  if (!sent || sent !== configured) {
    return res.status(401).json({ error: "unauthorized" });
  }

  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ error: "database not configured" });
  }

  const sql = neon(process.env.DATABASE_URL);

  await sql`
    CREATE TABLE IF NOT EXISTS quiz_user_stats (
      kakao_id VARCHAR(32) PRIMARY KEY,
      stats_json TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS quiz_user_favorites (
      kakao_id VARCHAR(32) NOT NULL,
      topic_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (kakao_id, topic_id, item_id)
    )
  `;

  const statRows = await sql`
    SELECT kakao_id, stats_json, updated_at FROM quiz_user_stats ORDER BY updated_at DESC
  `;

  let favRows = [];
  try {
    favRows = await sql`
      SELECT kakao_id, COUNT(*)::int AS favorite_count
      FROM quiz_user_favorites
      GROUP BY kakao_id
    `;
  } catch {
    /* 테이블 없음 등 */
  }

  const favByUser = new Map(favRows.map((r) => [r.kakao_id, r.favorite_count]));

  const byId = new Map();

  for (const row of statRows) {
    const agg = aggregateStatsJson(row.stats_json);
    byId.set(row.kakao_id, {
      kakaoId: row.kakao_id,
      lastStatsSyncAt: row.updated_at,
      favoriteCount: favByUser.get(row.kakao_id) ?? 0,
      ...agg,
    });
    favByUser.delete(row.kakao_id);
  }

  for (const [kakaoId, favoriteCount] of favByUser) {
    byId.set(kakaoId, {
      kakaoId,
      lastStatsSyncAt: null,
      favoriteCount,
      topicsTouched: 0,
      totalCorrect: 0,
      totalWrong: 0,
      totalAttempts: 0,
    });
  }

  const users = [...byId.values()].sort((a, b) => {
    const ta = a.lastStatsSyncAt ? new Date(a.lastStatsSyncAt).getTime() : 0;
    const tb = b.lastStatsSyncAt ? new Date(b.lastStatsSyncAt).getTime() : 0;
    return tb - ta;
  });

  return res.status(200).json({
    generatedAt: new Date().toISOString(),
    userCount: users.length,
    users,
  });
}
