const STORAGE_KEY = "info-processing-quiz-stats";

/** 문제별 score 범위 (정오답 기반, -3 ~ 3) */
export const SCORE_MIN = -3;
export const SCORE_MAX = 3;

/** 출제 이력으로 유지할 최근 문제 개수 (최근 9+ 판단용) */
export const HISTORY_SIZE = 12;

/**
 * 퀴즈 통계 저장 구조
 * { topicId: { items: { itemId: { correct, wrong, score } }, totalCorrect, totalWrong, history: [{ itemId, isCorrect }] } }
 */
export function loadStats() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export function saveStats(stats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (e) {
    console.warn("localStorage 저장 실패:", e);
  }
}

/**
 * 특정 항목의 정오답 기록 및 score 업데이트
 * 맞으면 score +1 (최대 3), 틀리면 score -1 (최소 -3)
 */
export function updateItemStats(topicId, itemId, isCorrect) {
  const stats = loadStats();
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
  saveStats(stats);
  return stats;
}

/**
 * 통계 초기화
 */
export function resetStats(topicId = null) {
  const stats = loadStats();
  if (topicId) {
    delete stats[topicId];
  } else {
    Object.keys(stats).forEach((key) => delete stats[key]);
  }
  saveStats(stats);
  return stats;
}
