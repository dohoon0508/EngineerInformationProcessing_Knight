/**
 * 즐겨찾기: 로컬 캐시 + (클라우드 켜짐 시) 서버와 동기화
 * 키 형식: "topicId:itemId" (itemId 에 ':' 가 들어가면 안 됨 — 현재 데이터는 영문-하이픈 id)
 */

import { getClientApiOrigin } from "./apiOrigin.js";
import { isCloudSyncEnabled } from "./statsSync.js";

export const GUEST_FAVORITES_KEY = "info-processing-quiz-favorites-guest";

export function favoritesStorageKey(kakaoUserId) {
  if (kakaoUserId != null && kakaoUserId !== "") {
    return `info-processing-quiz-favorites-kakao-${kakaoUserId}`;
  }
  return GUEST_FAVORITES_KEY;
}

/** @returns {Set<string>} */
export function loadFavoriteKeys(kakaoUserId) {
  try {
    const raw = localStorage.getItem(favoritesStorageKey(kakaoUserId));
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x) => typeof x === "string" && x.includes(":")));
  } catch {
    return new Set();
  }
}

export function saveFavoriteKeys(kakaoUserId, keysSet) {
  try {
    const arr = [...keysSet].sort();
    localStorage.setItem(favoritesStorageKey(kakaoUserId), JSON.stringify(arr));
  } catch {
    /* ignore */
  }
  emitFavoritesChanged();
}

export function emitFavoritesChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("quiz-favorites-changed"));
  }
}

export function makeFavoriteKey(topicId, itemId) {
  return `${topicId}:${itemId}`;
}

/** @param {string} key */
export function parseFavoriteKey(key) {
  const i = key.indexOf(":");
  if (i <= 0) return null;
  return { topicId: key.slice(0, i), itemId: key.slice(i + 1) };
}

function favoritesApiUrl() {
  if (!isCloudSyncEnabled()) return null;
  const origin = getClientApiOrigin();
  return origin ? `${origin}/api/favorites` : null;
}

/** 서버에서 전체 목록 가져와 로컬에 덮어쓰기 */
export async function pullFavoritesFromCloud(accessToken, kakaoUserId) {
  const url = favoritesApiUrl();
  if (!url || !accessToken || kakaoUserId == null) return false;
  try {
    const r = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (r.status === 503) return false;
    if (!r.ok) return false;
    const data = await r.json();
    const list = data?.favorites;
    if (!Array.isArray(list)) return false;
    const next = new Set();
    for (const row of list) {
      if (row?.topicId && row?.itemId) {
        next.add(makeFavoriteKey(String(row.topicId), String(row.itemId)));
      }
    }
    saveFavoriteKeys(kakaoUserId, next);
    return true;
  } catch {
    return false;
  }
}

/** 한 항목 추가/삭제를 서버에 반영 (로그인 + 클라우드 동기화 시) */
export async function pushFavoriteToggle(accessToken, topicId, itemId, add) {
  const url = favoritesApiUrl();
  if (!url || !accessToken) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ topicId, itemId, add }),
    });
  } catch {
    /* ignore */
  }
}
