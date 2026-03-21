-- Neon / PostgreSQL — Vercel 환경 변수 DATABASE_URL 로 연결 후 1회 실행 (선택)
-- api/stats.js 가 없을 때 자동 생성하지만, 미리 만들고 싶을 때 사용

CREATE TABLE IF NOT EXISTS quiz_user_stats (
  kakao_id VARCHAR(32) PRIMARY KEY,
  stats_json TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quiz_user_favorites (
  kakao_id VARCHAR(32) NOT NULL,
  topic_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (kakao_id, topic_id, item_id)
);
