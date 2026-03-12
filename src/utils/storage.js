const STORAGE_KEY = "info-processing-quiz-stats";

/**
 * 퀴즈 통계 저장 구조
 * { topicId: { itemId: { correct, wrong }, totalCorrect, totalWrong } }
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
 * 특정 항목의 정오답 기록 업데이트
 */
export function updateItemStats(topicId, itemId, isCorrect) {
  const stats = loadStats();
  if (!stats[topicId]) {
    stats[topicId] = { items: {}, totalCorrect: 0, totalWrong: 0, history: [] };
  }
  const topic = stats[topicId];
  if (!topic.items[itemId]) {
    topic.items[itemId] = { correct: 0, wrong: 0 };
  }
  if (isCorrect) {
    topic.items[itemId].correct++;
    topic.totalCorrect++;
  } else {
    topic.items[itemId].wrong++;
    topic.totalWrong++;
  }
  topic.history = (topic.history || []).slice(-9);
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

/**
 * 항목별 틀린 횟수 가중치 (틀릴수록 더 자주 나옴)
 */
export function getItemWeights(topicId, items) {
  const stats = loadStats();
  const topic = stats[topicId];
  if (!topic?.items) return items.map(() => 1);

  return items.map((item) => {
    const itemStats = topic.items[item.id];
    const wrong = itemStats?.wrong ?? 0;
    return 1 + wrong * 2; // 틀릴수록 가중치 증가
  });
}
