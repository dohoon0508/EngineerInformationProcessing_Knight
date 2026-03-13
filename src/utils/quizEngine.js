import { loadStats } from "./storage";
import { formatDisplayName } from "./normalize";

export const QUIZ_TYPES = {
  SUBJECTIVE: "subjective",
  FULL_LIST: "full-list",
  MULTIPLE_CHOICE: "multiple-choice",
  PURPOSE_ONLY: "purpose-only",
  PURPOSE_AND_PATTERN: "purpose-and-pattern",
};

export const PURPOSES = ["생성", "구조", "행위"];

// ----- 출제 가중치 상수 (조정 용이) -----
/** score(-3~3) → 출제 가중치. 낮을수록 자주 출제 (최소 1) */
const SCORE_TO_WEIGHT = {
  [-3]: 7,
  [-2]: 6,
  [-1]: 5,
  0: 4,
  1: 3,
  2: 2,
  3: 1,
};
/** 최근 N문제 안에 나왔으면 recency 가중치 (1=덜 나오게) */
const RECENCY_LAST_N_LOW = 4;
/** N~M문제 사이에 나왔으면 recency 가중치 */
const RECENCY_MID = 2;
/** N문제 이상 안 나왔거나 한 번도 안 나온 경우 recency 가중치 (3=더 나오게) */
const RECENCY_OLD_OR_NEVER = 3;
const RECENCY_MID_END = 8; // 5~8번째: index 4~7

export function isDesignPatternTopic(topic) {
  return topic?.items?.[0]?.purpose != null;
}

/**
 * 정오답 기반 출제 가중치 (score -3~3 → 7~1)
 * 많이 틀린 문제일수록 높은 가중치 → 더 자주 출제
 */
export function getScoreWeight(score) {
  const s = Math.max(-3, Math.min(3, score ?? 0));
  return SCORE_TO_WEIGHT[s] ?? 4;
}

/**
 * 최근 출제 이력 기반 가중치
 * @param itemId - 항목 id
 * @param recentHistory - 최근 출제 순서 배열 (가장 최근이 앞) [{ itemId, isCorrect }, ...]
 * @returns 1(최근 4문제 안) | 2(5~8문제 사이) | 3(9+ 또는 한 번도 안 나옴)
 */
export function getRecencyWeight(itemId, recentHistory) {
  const list = recentHistory || [];
  const index = list.findIndex((h) => h.itemId === itemId);
  if (index === -1) return RECENCY_OLD_OR_NEVER; // 안 나왔거나 12+ 전
  if (index < RECENCY_LAST_N_LOW) return 1; // 최근 4문제 안
  if (index <= RECENCY_MID_END) return RECENCY_MID; // 5~8
  return RECENCY_OLD_OR_NEVER; // 9~11 (또는 그 이상)
}

/**
 * 최종 출제 가중치 = 정오답 가중치 + 최근 출제 이력 가중치
 */
export function getFinalWeight(itemId, itemStats, recentHistory) {
  const scoreW = getScoreWeight(itemStats?.score);
  const recencyW = getRecencyWeight(itemId, recentHistory);
  return scoreW + recencyW;
}

/**
 * 직전 문제 제외, 최종 가중치 기반 weighted random으로 한 항목의 인덱스 선택
 */
export function selectWeightedRandom(items, topicId, stats, previousItemId = null) {
  const topic = stats[topicId];
  const recentHistory = topic?.history || [];

  const weights = items.map((item, i) => {
    if (previousItemId && item.id === previousItemId) return 0; // 직전 문제 제외
    const itemStats = topic?.items?.[item.id];
    return getFinalWeight(item.id, itemStats, recentHistory);
  });

  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) {
    // 전부 직전 문제로만 채워진 경우(항목 1개 등) 첫 번째 반환
    return 0;
  }
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}

/**
 * 배열 셔플
 */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 다음 문제 생성
 * - 일반 주제: 설명 → 이름
 * - 디자인 패턴: 패턴명 / 목적 / 목적+패턴
 */
export function getNextQuestion(topic, quizType, lastItemId = null) {
  const items = topic.items;
  if (!items?.length) return null;

  const stats = loadStats();
  const idx = selectWeightedRandom(items, topic.id, stats, lastItemId);
  const item = items[idx];
  const displayName = formatDisplayName(item);
  const description = item.examDescription || item.description;
  const isDesignPattern = isDesignPatternTopic(topic);

  if (isDesignPattern && quizType === QUIZ_TYPES.PURPOSE_ONLY) {
    return {
      item,
      quizType,
      question: description,
      answer: item.purpose,
      answerDisplay: `${item.purpose} - ${displayName}`,
      options: shuffle([...PURPOSES]),
    };
  }

  if (isDesignPattern && quizType === QUIZ_TYPES.PURPOSE_AND_PATTERN) {
    const others = items.filter((i) => i.id !== item.id);
    const wrongPatterns = shuffle(others).slice(0, 3).map((i) => formatDisplayName(i));
    const patternOptions = shuffle([displayName, ...wrongPatterns]);
    return {
      item,
      quizType,
      question: description,
      answer: { purpose: item.purpose, pattern: displayName },
      answerDisplay: `${item.purpose} - ${displayName}`,
      purposeOptions: shuffle([...PURPOSES]),
      patternOptions,
    };
  }

  return {
    item,
    quizType,
    question: description,
    answer: displayName,
    answerDisplay: displayName,
    options:
      quizType === QUIZ_TYPES.MULTIPLE_CHOICE
        ? getMultipleChoiceOptions(items, item)
        : quizType === QUIZ_TYPES.FULL_LIST
          ? shuffle(items.map((i) => formatDisplayName(i)))
          : null,
  };
}

function getMultipleChoiceOptions(items, correctItem) {
  const correct = formatDisplayName(correctItem);
  const others = items.filter((i) => i.id !== correctItem.id);
  const wrongs = shuffle(others).slice(0, 3).map((i) => formatDisplayName(i));
  return shuffle([correct, ...wrongs]);
}
