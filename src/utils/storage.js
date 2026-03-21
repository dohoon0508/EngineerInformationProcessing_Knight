import { notifyStatsSaved } from "./statsSync";

/** 비로그인(또는 로그인 전) 기본 키 — 기존 사용자 데이터 유지 */
export const GUEST_STORAGE_KEY = "info-processing-quiz-stats";

/** 문제별 score 범위 (정오답 기반, -3 ~ 3) */
export const SCORE_MIN = -3;
export const SCORE_MAX = 3;

/** 출제 이력으로 유지할 최근 문제 개수 (최근 9+ 판단용) */
export const HISTORY_SIZE = 12;

/**
 * localStorage 키 (카카오 숫자 id)
 * @param {number|null|undefined} kakaoUserId
 */
export function getStatsStorageKey(kakaoUserId) {
  if (kakaoUserId != null && kakaoUserId !== "") {
    return `info-processing-quiz-stats-kakao-${kakaoUserId}`;
  }
  return GUEST_STORAGE_KEY;
}

/** 로그인 계정 통계가 마지막으로 (이 기기에서) 수정된 시각 — 서버 updated_at 과 비교해 병합 */
function touchKey(kakaoUserId) {
  return `info-processing-quiz-touch-kakao-${kakaoUserId}`;
}

export function getStatsTouchTime(kakaoUserId) {
  if (kakaoUserId == null) return 0;
  try {
    return Number(localStorage.getItem(touchKey(kakaoUserId))) || 0;
  } catch {
    return 0;
  }
}

export function markStatsLocallyMutated(kakaoUserId) {
  if (kakaoUserId == null) return;
  try {
    localStorage.setItem(touchKey(kakaoUserId), String(Date.now()));
  } catch {
    /* ignore */
  }
}

/** 서버에서 받은 시각으로 맞춤 (클라우드 기준으로 덮어쓴 뒤) */
export function setStatsTouchFromServer(kakaoUserId, serverUpdatedAtIso) {
  if (kakaoUserId == null || !serverUpdatedAtIso) return;
  const t = new Date(serverUpdatedAtIso).getTime();
  if (!Number.isFinite(t)) return;
  try {
    localStorage.setItem(touchKey(kakaoUserId), String(t));
  } catch {
    /* ignore */
  }
}

export function hasStatsContent(stats) {
  return stats && typeof stats === "object" && Object.keys(stats).length > 0;
}

export function emitStatsStorageChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("quiz-stats-storage-changed"));
  }
}

/**
 * 비로그인으로 푼 기록을 첫 로그인 시 해당 카카오 계정 키로 복사 (한 번만)
 */
export function mergeGuestStatsIntoUser(kakaoUserId) {
  if (kakaoUserId == null) return;
  try {
    const guestRaw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (!guestRaw) return;
    const userKey = getStatsStorageKey(kakaoUserId);
    if (localStorage.getItem(userKey)) return;
    localStorage.setItem(userKey, guestRaw);
    markStatsLocallyMutated(kakaoUserId);
  } catch {
    /* ignore */
  }
}

/**
 * 퀴즈 통계 저장 구조
 * { topicId: { items: { itemId: { correct, wrong, score } }, totalCorrect, totalWrong, history: [{ itemId, isCorrect }] } }
 */
export function loadStats(kakaoUserId = null) {
  try {
    const key = getStatsStorageKey(kakaoUserId);
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function saveStats(stats, kakaoUserId = null) {
  try {
    const key = getStatsStorageKey(kakaoUserId);
    localStorage.setItem(key, JSON.stringify(stats));
    notifyStatsSaved(stats, kakaoUserId);
  } catch (e) {
    console.warn("localStorage 저장 실패:", e);
  }
}

/**
 * 특정 항목의 정오답 기록 및 score 업데이트
 */
export function updateItemStats(topicId, itemId, isCorrect, kakaoUserId = null) {
  const stats = loadStats(kakaoUserId);
  if (!stats[topicId]) {
    stats[topicId] = { items: {}, totalCorrect: 0, totalWrong: 0, history: [] };
  }
  const topic = stats[topicId];
  if (!topic.items[itemId]) {
    topic.items[itemId] = { correct: 0, wrong: 0, score: 0 };
  }
  const itemStats = topic.items[itemId];

  if (isCorrect) {
    itemStats.correct++;
    topic.totalCorrect++;
    itemStats.score = Math.min(SCORE_MAX, (itemStats.score ?? 0) + 1);
  } else {
    itemStats.wrong++;
    topic.totalWrong++;
    itemStats.score = Math.max(SCORE_MIN, (itemStats.score ?? 0) - 1);
  }

  topic.history = (topic.history || []).slice(-(HISTORY_SIZE - 1));
  topic.history.push({ itemId, isCorrect });
  saveStats(stats, kakaoUserId);
  markStatsLocallyMutated(kakaoUserId);
  return stats;
}

/**
 * 통계 초기화
 */
export function resetStats(topicId = null, kakaoUserId = null) {
  const stats = loadStats(kakaoUserId);
  if (topicId) {
    delete stats[topicId];
  } else {
    Object.keys(stats).forEach((key) => delete stats[key]);
  }
  saveStats(stats, kakaoUserId);
  markStatsLocallyMutated(kakaoUserId);
  return stats;
}
