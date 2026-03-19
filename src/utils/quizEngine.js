import { loadStats } from "./storage";
import { formatDisplayName } from "./normalize";

export const QUIZ_TYPES = {
  SUBJECTIVE: "subjective",
  FULL_LIST: "full-list",
  MULTIPLE_CHOICE: "multiple-choice",
  PURPOSE_ONLY: "purpose-only",
  PURPOSE_AND_PATTERN: "purpose-and-pattern",
  ORDERING: "ordering",
};

export const PURPOSES = ["생성", "구조", "행위"];

// ----- 출제 가중치 상수 (조정 용이) -----
/** score(-3~3) → 출제 가중치. 맞은 문제(1,2,3)는 최소 1로 더 덜 나오게 */
const SCORE_TO_WEIGHT = {
  [-3]: 7,
  [-2]: 6,
  [-1]: 5,
  0: 4,
  1: 1,
  2: 1,
  3: 1,
};
/** 최근 출제 이력: 초기값 0.5, 2문제마다 1점 증가, 최대 6 (격차 키워서 최근 건 더 덜 나오게) */
const RECENCY_BASE = 0.5;  // index 0~1(가장 최근 2문제)일 때의 가중치
const RECENCY_STEP = 2;   // 2마다 1점 증가
const RECENCY_MAX = 6;    // 한 번도 안 나왔거나 12+ 전

export function isDesignPatternTopic(topic) {
  return topic?.items?.[0]?.purpose != null;
}

/** 암호 알고리즘 등 category(단방향/양방향) 필드가 있는 주제 */
export function isCryptoTopic(topic) {
  return topic?.items?.[0]?.category != null;
}

/** 주제별 분류 옵션 (암호: 단방향/양방향) */
export function getCategoriesForTopic(topic) {
  if (!topic?.items?.length) return [];
  const cats = [...new Set(topic.items.map((i) => i.category).filter(Boolean))];
  return cats.length ? cats : [];
}

/** 결합도·응집도 (group, orderRank 필드) 주제 */
export function isCouplingCohesionTopic(topic) {
  return topic?.items?.[0]?.group != null && topic?.items?.[0]?.orderRank != null;
}

/** 무결성 주제 (주관식만 지원) */
export function isIntegrityTopic(topic) {
  return topic?.id === "integrity";
}

/** 리눅스 명령어 주제 (설명 → 명령어 맞히기) */
export function isLinuxCommandsTopic(topic) {
  return topic?.id === "linux-commands";
}

/** 화이트박스 / 블랙박스 검사 주제 */
export function isWhiteBlackTestingTopic(topic) {
  return topic?.id === "whitebox-blackbox-testing";
}

/** 결합도·응집도 그룹 목록 */
const COUPLING_COHESION_GROUPS = ["결합도", "응집도"];

/**
 * 정오답 기반 출제 가중치 (score -3~3 → 7~1)
 * 많이 틀린 문제일수록 높은 가중치 → 더 자주 출제
 */
export function getScoreWeight(score) {
  const s = Math.max(-3, Math.min(3, score ?? 0));
  return SCORE_TO_WEIGHT[s] ?? 4;
}

/**
 * 최근 출제 이력 기반 가중치: 2문제마다 1점 증가, 최대 6 (최근일수록 더 낮게)
 * - index 0~1: 0.5, 2~3: 1.5, 4~5: 2.5, 6~7: 3.5, 8~9: 4.5, 10~11: 5.5
 * - 목록에 없음(안 나왔거나 12+ 전): 6
 */
export function getRecencyWeight(itemId, recentHistory) {
  const list = recentHistory || [];
  const index = list.findIndex((h) => h.itemId === itemId);
  if (index === -1) return RECENCY_MAX; // 안 나왔거나 12+ 전
  return Math.min(RECENCY_MAX, RECENCY_BASE + Math.floor(index / RECENCY_STEP));
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
  // storage는 [가장 오래된 … 가장 최근] 순이므로, recency는 "가장 최근이 index 0"이 되도록 뒤집어서 사용
  const recentHistory = [...(topic?.history || [])].reverse();

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
  const isCrypto = isCryptoTopic(topic);
  const categories = getCategoriesForTopic(topic);

  if (isCrypto && quizType === QUIZ_TYPES.PURPOSE_ONLY) {
    return {
      item,
      quizType,
      question: description,
      answer: item.category,
      answerDisplay: `${item.category} - ${displayName}`,
      options: shuffle([...categories]),
      hint: "분류(단방향 / 양방향)를 선택하세요",
    };
  }

  if (isCrypto && quizType === QUIZ_TYPES.PURPOSE_AND_PATTERN) {
    const others = items.filter((i) => i.id !== item.id);
    const wrongNames = shuffle(others).slice(0, 3).map((i) => formatDisplayName(i));
    const patternOptions = shuffle([displayName, ...wrongNames]);
    return {
      item,
      quizType,
      question: description,
      answer: { purpose: item.category, pattern: displayName },
      answerDisplay: `${item.category} - ${displayName}`,
      purposeOptions: shuffle([...categories]),
      patternOptions,
      firstLabel: "분류",
      secondLabel: "알고리즘명",
    };
  }

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

  const isCouplingCohesion = isCouplingCohesionTopic(topic);
  const isLinuxCommands = isLinuxCommandsTopic(topic);
  const isWhiteBlack = isWhiteBlackTestingTopic(topic);

  if (isCouplingCohesion && quizType === QUIZ_TYPES.ORDERING) {
    const virtualItems = COUPLING_COHESION_GROUPS.map((g) => ({ id: `ordering-${g}` }));
    const vIdx = selectWeightedRandom(virtualItems, topic.id, stats, lastItemId);
    const group = COUPLING_COHESION_GROUPS[vIdx];
    const itemsInGroup = items.filter((i) => i.group === group).sort((a, b) => a.orderRank - b.orderRank);
    const shuffled = shuffle([...itemsInGroup]);
    const listWithNum = shuffled.map((it, i) => ({ ...it, displayNum: i + 1 }));
    const correctOrder = itemsInGroup.map((it) => listWithNum.find((s) => s.id === it.id).displayNum);
    const orderingItemId = `ordering-${group}`;
    return {
      item: { id: orderingItemId },
      quizType: QUIZ_TYPES.ORDERING,
      question: `${group} (강한 순서 → 약한 순서)`,
      list: listWithNum,
      correctOrder,
      answerDisplay: correctOrder.join("-"),
      group,
    };
  }

  if (isCouplingCohesion && quizType === QUIZ_TYPES.MULTIPLE_CHOICE) {
    const options = getMultipleChoiceOptions(items, item, item.group);
    return {
      item,
      quizType,
      question: description,
      answer: displayName,
      answerDisplay: `${item.group} - ${displayName}`,
      options,
    };
  }

  if (isLinuxCommands) {
    const nameKo = item.nameKo ?? item.nameEn ?? displayName;
    const options =
      quizType === QUIZ_TYPES.MULTIPLE_CHOICE
        ? shuffle([nameKo, ...shuffle(items.filter((i) => i.id !== item.id)).slice(0, 3).map((i) => i.nameKo ?? i.nameEn)])
        : quizType === QUIZ_TYPES.FULL_LIST
          ? shuffle(items.map((i) => i.nameKo ?? i.nameEn))
          : null;
    return {
      item,
      quizType,
      question: description,
      answer: nameKo,
      answerDisplay: nameKo,
      options,
    };
  }

  return {
    item,
    quizType,
    question: description,
    answer: displayName,
    answerDisplay: isCouplingCohesion || isWhiteBlack ? `${item.group} - ${displayName}` : displayName,
    questionGroup: isWhiteBlack ? item.group : null,
    options:
      quizType === QUIZ_TYPES.MULTIPLE_CHOICE
        ? getMultipleChoiceOptions(items, item, isCouplingCohesion || isWhiteBlack ? item.group : null)
        : quizType === QUIZ_TYPES.FULL_LIST
          ? shuffle(
              (isWhiteBlack ? items.filter((i) => i.group === item.group) : items).map((i) =>
                formatDisplayName(i)
              )
            )
          : null,
  };
}

function getMultipleChoiceOptions(items, correctItem, groupFilter = null) {
  // 결합도·응집도: 해당 그룹 전체를 보기로 사용
  if (groupFilter != null) {
    const inGroup = items.filter((i) => i.group === groupFilter);
    return shuffle(inGroup.map((i) => formatDisplayName(i)));
  }
  // 그 외: 4지선다 (정답 + 오답 3개)
  const correct = formatDisplayName(correctItem);
  const others = items.filter((i) => i.id !== correctItem.id);
  const wrongs = shuffle(others).slice(0, 3).map((i) => formatDisplayName(i));
  return shuffle([correct, ...wrongs]);
}
