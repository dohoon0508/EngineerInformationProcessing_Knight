import { getItemWeights } from "./storage";
import { formatDisplayName } from "./normalize";

export const QUIZ_TYPES = {
  SUBJECTIVE: "subjective",
  FULL_LIST: "full-list",
  MULTIPLE_CHOICE: "multiple-choice",
};

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
 * 다음 문제 생성 (설명 → 이름 맞히기만 지원)
 */
export function getNextQuestion(topic, quizType, lastItemId = null) {
  const items = topic.items;
  if (!items?.length) return null;

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
