import { loadStats } from "./storage";
import { formatDisplayName } from "./normalize";

export const QUIZ_TYPES = {
  SUBJECTIVE: "subjective",
  FULL_LIST: "full-list",
  MULTIPLE_CHOICE: "multiple-choice",
  PURPOSE_ONLY: "purpose-only",
  PURPOSE_AND_PATTERN: "purpose-and-pattern",
  ORDERING: "ordering",
  MATCHING: "matching",
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

/** 리눅스 명령어 주제 (설명 → 명령어 맞히기) */
export function isLinuxCommandsTopic(topic) {
  return topic?.id === "linux-commands";
}

/** 데이터베이스 주제 (순수 관계·집합·이상 등 group 필드, 객관식은 같은 group 내 보기) */
export function isDatabaseTopic(topic) {
  return topic?.id === "database";
}

/** 네트워크 주제 (라우팅 프로토콜·주소 변환 등 group — 객관식은 동일 group 우선, 4개 미만이면 topic 전체) */
export function isNetworkTopic(topic) {
  return topic?.id === "network";
}

/** 기타 주제 — details가 있으면 하위 개념을 퀴즈 풀에 펼쳐 넣음 */
export function isMiscTopic(topic) {
  return topic?.id === "misc";
}

/** 테스팅 / 검사 유형 — 매칭형은 별도 quizType 전용 풀 */
export function isTestingTypesTopic(topic) {
  return topic?.id === "testing-types";
}

function getTestingTypesQuizPool(topic, quizType) {
  const list = topic.items || [];
  if (quizType === QUIZ_TYPES.MATCHING) {
    return list.filter((i) => i.interactiveType === "matching");
  }
  return list.filter((i) => !i.interactiveType || i.interactiveType !== "matching");
}

function getTopicQuizPool(topic, quizType) {
  if (isMiscTopic(topic)) return expandMiscItems(topic.items);
  if (isTestingTypesTopic(topic)) return getTestingTypesQuizPool(topic, quizType);
  return topic.items;
}

/** V-모델 정답 매핑을 출제 목록·해설용 문자열로 */
export function formatVmodelPairsDisplay(correctPairs) {
  if (!correctPairs || typeof correctPairs !== "object") return "";
  const order = ["요구사항", "분석", "설계", "구현"];
  return order
    .filter((k) => Object.prototype.hasOwnProperty.call(correctPairs, k))
    .map((k) => `${k} ↔ ${correctPairs[k]}`)
    .join("\n");
}

/**
 * misc: 부모 항목 + details[]를 각각 독립 출제 단위로 펼침 (통계·이력은 id별)
 */
export function expandMiscItems(items) {
  if (!items?.length) return [];
  return items.flatMap((parent) => {
    if (!parent.details?.length) return [parent];
    const subs = parent.details.map((d, i) => ({
      id: `${parent.id}__sub__${i}`,
      nameKo: d.nameKo,
      nameEn: d.nameEn ?? d.nameKo,
      examDescription: d.description,
      quizPrompt: d.quizPrompt ?? d.description,
      aliases: Array.isArray(d.aliases) ? d.aliases : [d.nameKo],
      shortDescription:
        d.shortDescription ??
        (d.description.length > 90 ? `${d.description.slice(0, 87)}…` : d.description),
      _miscParentId: parent.id,
    }));
    return [parent, ...subs];
  });
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

  const quizItems = getTopicQuizPool(topic, quizType);
  const stats = loadStats();
  const idx = selectWeightedRandom(quizItems, topic.id, stats, lastItemId);
  const item = quizItems[idx];
  const displayName = formatDisplayName(item);
  /** 퀴즈 문제 문구: 있으면 사용(출제 목록·암기용은 examDescription 유지) */
  const description = item.quizPrompt ?? item.examDescription ?? item.description ?? "";
  const isDesignPattern = isDesignPatternTopic(topic);
  const isCrypto = isCryptoTopic(topic);
  const categories = getCategoriesForTopic(topic);

  if (
    isTestingTypesTopic(topic) &&
    quizType === QUIZ_TYPES.MATCHING &&
    item.interactiveType === "matching"
  ) {
    const cp = item.correctPairs || {};
    return {
      item,
      quizType: QUIZ_TYPES.MATCHING,
      question: item.quizPrompt ?? "V-모델의 대응 관계를 올바르게 연결하세요",
      leftItems: [...(item.leftItems || [])],
      rightPool: shuffle([...(item.rightItems || [])]),
      correctPairs: { ...cp },
      answerDisplay: formatVmodelPairsDisplay(cp),
    };
  }

  /** 테스팅/검사 유형: 화이트/블랙박스=같은 group 보기, subcategory 우선(스텁·드라이버), 전체 보기 범위 분리 */
  if (
    isTestingTypesTopic(topic) &&
    quizType !== QUIZ_TYPES.MATCHING &&
    (quizType === QUIZ_TYPES.SUBJECTIVE ||
      quizType === QUIZ_TYPES.MULTIPLE_CHOICE ||
      quizType === QUIZ_TYPES.FULL_LIST)
  ) {
    const quizPool = getTestingTypesQuizPool(topic, quizType);
    const sub = item.subcategory;
    const wbBb =
      item.group === "화이트박스 검사" || item.group === "블랙박스 검사";
    let answerDisplay = displayName;
    if (wbBb) answerDisplay = `${item.group} - ${displayName}`;
    else if (sub) answerDisplay = `${sub} - ${displayName}`;
    if (quizType === QUIZ_TYPES.SUBJECTIVE) {
      return {
        item,
        quizType,
        question: description,
        answer: displayName,
        answerDisplay,
        hint: wbBb
          ? "검사 기법 이름을 입력하세요 (한국어 또는 영어)"
          : "용어를 입력하세요 (한국어 또는 영어, 예: 스텁, Stub, 드라이버)",
        options: null,
      };
    }
    if (quizType === QUIZ_TYPES.MULTIPLE_CHOICE) {
      const options = wbBb
        ? getMultipleChoiceOptions(quizPool, item, item.group)
        : getCryptoMcOptions(quizPool, item);
      return {
        item,
        quizType,
        question: description,
        answer: displayName,
        answerDisplay,
        options,
      };
    }
    if (quizType === QUIZ_TYPES.FULL_LIST) {
      return {
        item,
        quizType,
        question: description,
        answer: displayName,
        answerDisplay,
        hint: "목록에서 정답을 선택하세요",
        options: null,
      };
    }
  }

  /** 데이터베이스: 순수·집합=기호, 이상=nameKo, 함수적 종속=같은 group 보기, 관계해석=topic 내 보기 */
  if (isDatabaseTopic(topic)) {
    const symbolItems = items.filter(
      (i) => i.group === "순수 관계 연산자" || i.group === "집합 연산자"
    );
    const symbolPool = [...new Set(symbolItems.map((i) => i.symbol).filter(Boolean))];
    const anomalyItems = items.filter((i) => i.group === "이상");
    const g = item.group;
    const isSymbolGroup = g === "순수 관계 연산자" || g === "집합 연산자";

    if (quizType === QUIZ_TYPES.SUBJECTIVE) {
      return {
        item,
        quizType,
        question: description,
        answer: displayName,
        answerDisplay: `${g} - ${displayName}`,
        questionGroup: g,
        hint: isSymbolGroup
          ? "연산명 또는 기호(σ, π, ⋈, ÷, ∪, ∩, -, × 등)를 입력하세요"
          : g === "이상"
          ? "이상 유형을 입력하세요 (예: 삽입 이상)"
          : g === "무결성"
          ? "무결성 종류를 입력하세요 (예: 개체 무결성, 참조 무결성)"
          : "용어를 입력하세요 (한국어 또는 영어)",
        options: null,
      };
    }

    if (quizType === QUIZ_TYPES.MULTIPLE_CHOICE) {
      if (isSymbolGroup) {
        const options = shuffle([...symbolPool]);
        return {
          item,
          quizType,
          question: description,
          answer: item.symbol,
          answerDisplay: `${item.symbol} (${item.nameKo})`,
          options,
          questionGroup: g,
          hint: "순수 관계·집합 연산 기호 전체 목록에서 정답 기호를 선택하세요",
        };
      }
      if (g === "이상") {
        const options = shuffle(anomalyItems.map((i) => i.nameKo));
        return {
          item,
          quizType,
          question: description,
          answer: item.nameKo,
          answerDisplay: item.nameKo,
          options,
          questionGroup: g,
          hint: "해당하는 이상 유형을 선택하세요",
        };
      }
      if (g === "함수적 종속") {
        const options = getMultipleChoiceOptions(items, item, "함수적 종속");
        return {
          item,
          quizType,
          question: description,
          answer: displayName,
          answerDisplay: `${g} - ${displayName}`,
          options,
          questionGroup: g,
          hint: "함수적 종속 관련 용어를 선택하세요",
        };
      }
      if (g === "관계해석") {
        const others = items.filter((i) => i.id !== item.id);
        const wrongs = shuffle(others).slice(0, 3).map((i) => formatDisplayName(i));
        const options = shuffle([displayName, ...wrongs]);
        return {
          item,
          quizType,
          question: description,
          answer: displayName,
          answerDisplay: `${g} - ${displayName}`,
          options,
          questionGroup: g,
          hint: "정답 용어를 선택하세요",
        };
      }
      if (g === "무결성") {
        const options = getMultipleChoiceOptions(items, item, "무결성");
        return {
          item,
          quizType,
          question: description,
          answer: displayName,
          answerDisplay: `${g} - ${displayName}`,
          options,
          questionGroup: g,
          hint: "해당 무결성 유형을 선택하세요",
        };
      }
    }

    if (quizType === QUIZ_TYPES.FULL_LIST) {
      if (isSymbolGroup) {
        return {
          item,
          quizType,
          question: description,
          answer: item.symbol,
          answerDisplay: `${item.symbol} (${item.nameKo})`,
          questionGroup: g,
          hint: "목록에서 정답 기호를 선택하세요",
          options: null,
        };
      }
      if (g === "이상") {
        return {
          item,
          quizType,
          question: description,
          answer: item.nameKo,
          answerDisplay: item.nameKo,
          questionGroup: g,
          hint: "목록에서 정답을 선택하세요",
          options: null,
        };
      }
      if (g === "함수적 종속" || g === "관계해석" || g === "무결성") {
        return {
          item,
          quizType,
          question: description,
          answer: displayName,
          answerDisplay: `${g} - ${displayName}`,
          questionGroup: g,
          hint: "목록에서 정답을 선택하세요",
          options: null,
        };
      }
    }

    const options = shuffle([...symbolPool]);
    return {
      item,
      quizType: QUIZ_TYPES.MULTIPLE_CHOICE,
      question: description,
      answer: item.symbol,
      answerDisplay: `${item.symbol} (${item.nameKo})`,
      options,
      questionGroup: g,
      hint: "정답을 선택하세요",
    };
  }

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
  /** 주관식·객관식·전체보기에서 그룹(결합도) 단위로 정답 표기·보기 풀 제한 */
  const useGroupForQuiz = isCouplingCohesion;

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

  /** 소프트웨어 보안: 주관식·객관식·전체 보기 — 동일 subcategory 우선(접근통제 DAC/MAC/RBAC 등) */
  if (
    isCrypto &&
    (quizType === QUIZ_TYPES.SUBJECTIVE ||
      quizType === QUIZ_TYPES.MULTIPLE_CHOICE ||
      quizType === QUIZ_TYPES.FULL_LIST)
  ) {
    const sub = item.subcategory;
    const cat = item.category;
    const labelPrefix = sub || cat || "";
    const answerDisplay = labelPrefix ? `${labelPrefix} - ${displayName}` : displayName;
    if (quizType === QUIZ_TYPES.SUBJECTIVE) {
      return {
        item,
        quizType,
        question: description,
        answer: displayName,
        answerDisplay,
        hint: "항목명을 입력하세요 (한국어 또는 영어, 예: DAC, 임의 접근통제)",
        options: null,
      };
    }
    if (quizType === QUIZ_TYPES.MULTIPLE_CHOICE) {
      return {
        item,
        quizType,
        question: description,
        answer: displayName,
        answerDisplay,
        options: getCryptoMcOptions(items, item),
      };
    }
    if (quizType === QUIZ_TYPES.FULL_LIST) {
      return {
        item,
        quizType,
        question: description,
        answer: displayName,
        answerDisplay,
        hint: "목록에서 정답을 선택하세요",
        options: null,
      };
    }
  }

  /** 기타(misc): expandMiscItems 풀, subcategory 있으면 객관식·전체 보기에서 동일 분류 우선 */
  if (
    isMiscTopic(topic) &&
    (quizType === QUIZ_TYPES.SUBJECTIVE ||
      quizType === QUIZ_TYPES.MULTIPLE_CHOICE ||
      quizType === QUIZ_TYPES.FULL_LIST)
  ) {
    const quizPool = expandMiscItems(topic.items);
    const sub = item.subcategory;
    const answerDisplay = sub ? `${sub} - ${displayName}` : displayName;
    if (quizType === QUIZ_TYPES.SUBJECTIVE) {
      return {
        item,
        quizType,
        question: description,
        answer: displayName,
        answerDisplay,
        hint: "용어·약어를 입력하세요 (한국어 또는 영어, 예: RAID 5, SSO, SRP)",
        options: null,
      };
    }
    if (quizType === QUIZ_TYPES.MULTIPLE_CHOICE) {
      return {
        item,
        quizType,
        question: description,
        answer: displayName,
        answerDisplay,
        options: getCryptoMcOptions(quizPool, item),
      };
    }
    if (quizType === QUIZ_TYPES.FULL_LIST) {
      return {
        item,
        quizType,
        question: description,
        answer: displayName,
        answerDisplay,
        hint: "목록에서 정답을 선택하세요",
        options: null,
      };
    }
  }

  if (isNetworkTopic(topic)) {
    const g = item.group;
    const answerDisplay = g ? `${g} - ${displayName}` : displayName;
    if (quizType === QUIZ_TYPES.SUBJECTIVE) {
      return {
        item,
        quizType,
        question: description,
        answer: displayName,
        answerDisplay,
        questionGroup: g ?? null,
        hint: "용어를 입력하세요 (한국어 또는 영어)",
        options: null,
      };
    }
    if (quizType === QUIZ_TYPES.MULTIPLE_CHOICE) {
      return {
        item,
        quizType,
        question: description,
        answer: displayName,
        answerDisplay,
        questionGroup: g ?? null,
        options: getNetworkMcOptions(items, item),
      };
    }
    if (quizType === QUIZ_TYPES.FULL_LIST) {
      return {
        item,
        quizType,
        question: description,
        answer: displayName,
        answerDisplay,
        questionGroup: g ?? null,
        hint: "목록에서 정답을 선택하세요",
        options: null,
      };
    }
  }

  const mcListPool = isMiscTopic(topic) || isTestingTypesTopic(topic) ? quizItems : items;

  return {
    item,
    quizType,
    question: description,
    answer: displayName,
    answerDisplay: useGroupForQuiz ? `${item.group} - ${displayName}` : displayName,
    questionGroup: null,
    options:
      quizType === QUIZ_TYPES.MULTIPLE_CHOICE
        ? getMultipleChoiceOptions(mcListPool, item, useGroupForQuiz ? item.group : null)
        : quizType === QUIZ_TYPES.FULL_LIST
          ? shuffle(mcListPool.map((i) => formatDisplayName(i)))
          : null,
  };
}

/** 객관식: 같은 subcategory 오답을 앞에 두고 부족하면 다른 subcategory에서 채움 */
function getCryptoMcOptions(items, correctItem) {
  const correct = formatDisplayName(correctItem);
  const sub = correctItem.subcategory;
  const others = items.filter((i) => i.id !== correctItem.id);
  if (!sub) {
    const wrongs = shuffle(others).slice(0, 3).map((i) => formatDisplayName(i));
    return shuffle([correct, ...wrongs]);
  }
  const sameSub = others.filter((i) => i.subcategory === sub);
  const diffSub = others.filter((i) => i.subcategory !== sub);
  const ordered = [...shuffle(sameSub), ...shuffle(diffSub)];
  const wrongs = ordered.slice(0, 3).map((i) => formatDisplayName(i));
  return shuffle([correct, ...wrongs]);
}

/** 테스팅/검사 유형 전체 보기: 화이트/블랙은 같은 group, subcategory 2개 이상이면 해당 범위, 아니면 매칭 제외 전체 */
export function getTestingTypesFullListItems(topic, question) {
  const normal = topic.items.filter((i) => i.interactiveType !== "matching");
  const qItem = question?.item;
  const g = qItem?.group;
  if (g === "화이트박스 검사" || g === "블랙박스 검사") {
    const inG = normal.filter((i) => i.group === g);
    return inG.length >= 2 ? inG : normal;
  }
  if (!qItem?.subcategory) return normal;
  const inSub = normal.filter((i) => i.subcategory === qItem.subcategory);
  return inSub.length >= 2 ? inSub : normal;
}

/** 기타(misc) 전체 보기: 펼친 풀에서 동일 subcategory가 2개 이상이면 그 범위만 */
export function getMiscFullListItems(topic, question) {
  const expanded = expandMiscItems(topic.items || []);
  const qItem = question?.item;
  if (!qItem?.subcategory) return expanded;
  const inSub = expanded.filter((i) => i.subcategory === qItem.subcategory);
  return inSub.length >= 2 ? inSub : expanded;
}

/** 전체 보기: 동일 subcategory가 2개 이상이면 그 범위만, 아니면 topic 전체 */
export function getCryptoFullListItems(topic, question) {
  const qItem = question?.item;
  if (!qItem?.subcategory) return topic.items;
  const inSub = topic.items.filter((i) => i.subcategory === qItem.subcategory);
  return inSub.length >= 2 ? inSub : topic.items;
}

/**
 * 네트워크 객관식: 동일 group 항목이 4개 이상이면 그 안에서만 4지 구성, 그 미만(예: NAT 단독)이면 topic 전체에서 구성
 */
function getNetworkMcOptions(items, correctItem) {
  const g = correctItem.group;
  const correct = formatDisplayName(correctItem);
  let pool = items;
  if (g) {
    const inGroup = items.filter((i) => i.group === g);
    if (inGroup.length >= 4) pool = inGroup;
    else pool = items;
  }
  const others = pool.filter((i) => i.id !== correctItem.id);
  const wrongs = shuffle(others).slice(0, 3).map((i) => formatDisplayName(i));
  return shuffle([correct, ...wrongs]);
}

/** 전체 보기: 동일 group 항목이 2개 이상이면 그 group만, 아니면 topic 전체 */
export function getNetworkFullListItems(topic, question) {
  const item = question?.item;
  if (!item?.group) return topic.items;
  const inGroup = topic.items.filter((i) => i.group === item.group);
  return inGroup.length >= 2 ? inGroup : topic.items;
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
