import { topics } from "../data/topics.js";
import { getTopicQuizPool, QUIZ_TYPES } from "./quizEngine.js";

/** 전역 즐겨찾기 퀴즈용 가상 주제 id (topics 배열에는 없음) */
export const ALL_FAVORITES_TOPIC_ID = "__favorites-all__";

/**
 * 즐겨찾기 키 집합에서 특정 주제의 item id 만 추출
 * @param {Set<string>} favoriteKeys
 * @param {string} topicId
 * @returns {Set<string>}
 */
export function itemIdsForTopicFavorites(favoriteKeys, topicId) {
  const prefix = `${topicId}:`;
  const out = new Set();
  for (const k of favoriteKeys) {
    if (k.startsWith(prefix)) out.add(k.slice(prefix.length));
  }
  return out;
}

/**
 * 전체 즐겨찾기 주관식 전용 가상 topic
 * 각 item 에 _statsTopicId 를 붙여 통계 저장 시 원래 주제로 기록
 * @param {Set<string>} favoriteKeys
 */
export function buildAllFavoritesTopic(favoriteKeys) {
  const items = [];
  for (const key of favoriteKeys) {
    const colon = key.indexOf(":");
    if (colon <= 0) continue;
    const topicId = key.slice(0, colon);
    const itemId = key.slice(colon + 1);
    if (!topicId || !itemId) continue;
    const topic = topics.find((t) => t.id === topicId);
    if (!topic) continue;
    const pool = getTopicQuizPool(topic, QUIZ_TYPES.SUBJECTIVE);
    const item = pool.find((i) => i.id === itemId);
    if (!item) continue;
    items.push({
      ...item,
      _statsTopicId: topicId,
    });
  }
  return {
    id: ALL_FAVORITES_TOPIC_ID,
    title: "전체 즐겨찾기",
    items,
  };
}
