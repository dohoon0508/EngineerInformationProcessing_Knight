import { getItemWeights } from "./storage";
import { formatDisplayName } from "./normalize";

export const QUIZ_TYPES = {
  SUBJECTIVE: "subjective",
  FULL_LIST: "full-list",
  MULTIPLE_CHOICE: "multiple-choice",
  PURPOSE_ONLY: "purpose-only",
  PURPOSE_AND_PATTERN: "purpose-and-pattern",
};

export const PURPOSES = ["생성", "구조", "행위"];

export function isDesignPatternTopic(topic) {
  return topic?.items?.[0]?.purpose != null;
}

/**
 * 가중치 기반 랜덤 선택
 */
function weightedRandomIndex(weights) {
  const total = weights.reduce((a, b) => a + b, 0);
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

  const isDesignPattern = isDesignPatternTopic(topic);
  const weights = getItemWeights(topic.id, items);
  let idx = weightedRandomIndex(weights);

  if (lastItemId && items.length > 1) {
    const lastIdx = items.findIndex((i) => i.id === lastItemId);
    if (lastIdx === idx) {
      idx = (idx + 1) % items.length;
    }
  }

  const item = items[idx];
  const displayName = formatDisplayName(item);
  const description = item.examDescription || item.description;

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
