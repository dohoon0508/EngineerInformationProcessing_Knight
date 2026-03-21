/**
 * Vercel /api/stats 와 연동해 기기 간 통계 동기화 (선택)
 * DATABASE_URL 이 없으면 API가 503 → 클라이언트는 무시
 */

import { getClientApiOrigin } from "./apiOrigin.js";

let statsPusher = null;

/** KakaoAuthProvider에서 등록: (stats, kakaoUserId) => void */
export function registerStatsPusher(fn) {
  statsPusher = fn;
}

export function notifyStatsSaved(stats, kakaoUserId) {
  if (typeof statsPusher === "function") statsPusher(stats, kakaoUserId);
}

const DEBOUNCE_MS = 1200;
let pushTimer = null;

/** Vercel 빌드 시 문자열 "true" / "1" 등 허용 */
export function isCloudSyncEnabled() {
  const v = import.meta.env.VITE_ENABLE_CLOUD_SYNC;
  if (v === undefined || v === null || v === "") return false;
  const s = String(v).trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

function getEndpoint() {
  if (!isCloudSyncEnabled()) return null;
  const origin = getClientApiOrigin();
  return origin ? `${origin}/api/stats` : null;
}

/**
 * 서버에서 통계 + updatedAt
 * @returns {Promise<{ stats: object | null, updatedAt: string | null } | null>}
 */
export async function fetchCloudStatsBundle(accessToken) {
  const url = getEndpoint();
  if (!url || !accessToken) return null;
  try {
    const r = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (r.status === 503) return null;
    if (!r.ok) return null;
    const data = await r.json();
    const stats = data?.stats && typeof data.stats === "object" ? data.stats : null;
    const updatedAt = data?.updatedAt != null ? String(data.updatedAt) : null;
    return { stats, updatedAt };
  } catch {
    return null;
  }
}

/** @deprecated 이름 호환 — 내부는 fetchCloudStatsBundle */
export async function pullCloudStats(accessToken) {
  const b = await fetchCloudStatsBundle(accessToken);
  return b?.stats ?? null;
}

/**
 * debounced POST 통계
 */
export function schedulePushStats(stats, accessToken) {
  const url = getEndpoint();
  if (!url || !accessToken) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    pushStatsNow(stats, accessToken);
  }, DEBOUNCE_MS);
}

/**
 * 즉시 POST (로그인 직후 로컬이 더 최신일 때 등)
 */
export function pushStatsNow(stats, accessToken) {
  const url = getEndpoint();
  if (!url || !accessToken) return;
  fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ stats }),
  }).catch(() => {});
}
