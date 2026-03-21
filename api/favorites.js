/**
 * Vercel Serverless — 카카오 토큰으로 본인 확인 후 즐겨찾기(문항 단위) 저장
 * 키: (kakao_id, topic_id, item_id) — topic/item id 는 topics.js 의 id 와 동일해야 함
 *
 * 환경 변수: DATABASE_URL (Neon 등, api/stats.js 와 동일)
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

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ error: "favorites not configured" });
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
    CREATE TABLE IF NOT EXISTS quiz_user_favorites (
      kakao_id VARCHAR(32) NOT NULL,
      topic_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (kakao_id, topic_id, item_id)
    )
  `;

  if (req.method === "GET") {
    const rows = await sql`
      SELECT topic_id, item_id FROM quiz_user_favorites WHERE kakao_id = ${kakaoId}
    `;
    const favorites = rows.map((r) => ({ topicId: r.topic_id, itemId: r.item_id }));
    return res.status(200).json({ favorites });
  }

  if (req.method === "POST") {
    let body = req.body;
    if (Buffer.isBuffer(body)) {
      body = JSON.parse(body.toString("utf8"));
    } else if (typeof body === "string") {
      body = JSON.parse(body);
    }
    const topicId = body?.topicId != null ? String(body.topicId).trim() : "";
    const itemId = body?.itemId != null ? String(body.itemId).trim() : "";
    const add = Boolean(body?.add);
    if (!topicId || !itemId || topicId.length > 128 || itemId.length > 256) {
      return res.status(400).json({ error: "invalid topicId or itemId" });
    }
    if (add) {
      await sql`
        INSERT INTO quiz_user_favorites (kakao_id, topic_id, item_id)
        VALUES (${kakaoId}, ${topicId}, ${itemId})
        ON CONFLICT (kakao_id, topic_id, item_id) DO NOTHING
      `;
    } else {
      await sql`
        DELETE FROM quiz_user_favorites
        WHERE kakao_id = ${kakaoId} AND topic_id = ${topicId} AND item_id = ${itemId}
      `;
    }
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST, OPTIONS");
  return res.status(405).json({ error: "method not allowed" });
}
