import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, Link, useSearchParams, useLocation } from "react-router-dom";
import { topics } from "../data/topics";
import { useFavorites } from "../context/FavoritesContext";
import {
  ALL_FAVORITES_TOPIC_ID,
  buildAllFavoritesTopic,
  itemIdsForTopicFavorites,
} from "../utils/favoritesTopic";
import {
  getNextQuestion,
  getTopicQuizPool,
  shuffle,
  QUIZ_TYPES,
  isDesignPatternTopic,
  isCryptoTopic,
  isCouplingCohesionTopic,
  isLinuxCommandsTopic,
  isDatabaseTopic,
  isNetworkTopic,
  getNetworkFullListItems,
  isMiscTopic,
  expandMiscItems,
  getCryptoFullListItems,
  isTestingTypesTopic,
  getTestingTypesFullListItems,
  getMiscFullListItems,
} from "../utils/quizEngine";
import { useKakaoAuth } from "../context/KakaoAuthContext";
import { updateItemStats, loadStats, resetStats } from "../utils/storage";
import {
  checkNameAnswer,
  checkPurposeAnswer,
  checkOrderAnswer,
  checkVModelMatching,
  formatDisplayName,
} from "../utils/normalize";
import QuizStats from "./QuizStats";
import SubjectiveQuestion from "./SubjectiveQuestion";
import MultipleChoiceQuestion from "./MultipleChoiceQuestion";
import FullListQuestion from "./FullListQuestion";
import PurposeOnlyQuestion from "./PurposeOnlyQuestion";
import PurposeAndPatternQuestion from "./PurposeAndPatternQuestion";
import PurposeAndSubjectiveQuestion from "./PurposeAndSubjectiveQuestion";
import OrderingQuestion from "./OrderingQuestion";
import VModelMatchingQuestion from "./VModelMatchingQuestion";
import FavoriteStarButton from "./FavoriteStarButton";
import { setQuizLeaveConfirm, tryConfirmLeaveQuiz } from "../utils/quizLeaveConfirm";
import "./QuizPage.css";

function QuestionMiniStatBoxes({ total, wrongItems, correctItems, remainingItems }) {
  return (
    <div className="question-mini-stats" role="group" aria-label="문항 통계">
      <div className="question-mini-stat">
        <span className="question-mini-stat-value">{total}</span>
        <span className="question-mini-stat-label">전체 문항</span>
      </div>
      <div className="question-mini-stat">
        <span className="question-mini-stat-value">{wrongItems}</span>
        <span className="question-mini-stat-label">틀린 문항</span>
      </div>
      <div className="question-mini-stat">
        <span className="question-mini-stat-value">{correctItems}</span>
        <span className="question-mini-stat-label">맞은 문항</span>
      </div>
      <div className="question-mini-stat">
        <span className="question-mini-stat-value">{remainingItems}</span>
        <span className="question-mini-stat-label">남은 문제</span>
      </div>
    </div>
  );
}

/** 틀린 것만: 안쪽 흰 박스(shell). 무한 풀이는 래퍼 없이 직전 레이아웃과 동일 */
function DrillPromptShell({ useShell, children }) {
  if (useShell) return <div className="question-area-prompt-shell">{children}</div>;
  return children;
}

/** 틀린 것만 세션: 한 번이라도 오답 제출한 문항(아직 클리어 전)만 틀린으로 집계 */
function wrongDrillMiniStatBuckets(st, fallbackProgress) {
  if (!st || st.done) {
    const t = fallbackProgress?.total ?? 0;
    const c = fallbackProgress?.cleared ?? 0;
    return {
      total: t,
      wrongItems: 0,
      correctItems: c,
      remainingItems: Math.max(0, t - c),
    };
  }
  let wrongNotCleared = 0;
  const once = st.wrongOnceIds;
  if (once) {
    for (const id of once) {
      if (!st.eliminated.has(id)) wrongNotCleared++;
    }
  }
  const cleared = st.eliminated.size;
  const tot = st.total;
  return {
    total: tot,
    wrongItems: wrongNotCleared,
    correctItems: cleared,
    remainingItems: Math.max(0, tot - cleared - wrongNotCleared),
  };
}

function buildWrongDrillReviewRow(topic, itemMap, entryId) {
  if (typeof entryId === "string" && entryId.startsWith("ordering-")) {
    const group = entryId.replace("ordering-", "");
    const orderItems = (topic?.items ?? [])
      .filter((i) => i.group === group)
      .sort((a, b) => (a.orderRank ?? 0) - (b.orderRank ?? 0))
      .map((i) => formatDisplayName(i));
    return {
      id: entryId,
      _statsTopicId: topic?.id,
      purpose: null,
      name: `${group} 순서 맞추기`,
      description: orderItems.length
        ? `정답 순서: ${orderItems.join(" > ")}`
        : `${group} 항목을 순서대로 맞히는 문제`,
    };
  }
  const item = itemMap.get(entryId);
  if (!item) return null;
  return {
    id: item.id,
    _statsTopicId: item._statsTopicId,
    purpose: item.purpose ?? null,
    name: formatDisplayName(item),
    description: item.examDescription ?? item.description ?? "",
  };
}

const LEAVE_QUIZ_SESSION_MSG =
  "이 화면을 나가면 이번 세션에서 푼 진행(맞힌 문항 수·웨이브 등)이 초기화됩니다. 정말 나가시겠습니까?";

/** 데이터베이스 전체 보기: group에 따라 목록 범위·라벨 분기 */
function getDatabaseFullListItems(topic, question) {
  const g = question?.item?.group;
  if (!g) return topic.items;
  if (g === "순수 관계 연산자" || g === "집합 연산자") {
    return topic.items.filter(
      (i) => i.group === "순수 관계 연산자" || i.group === "집합 연산자"
    );
  }
  if (g === "이상") return topic.items.filter((i) => i.group === "이상");
  if (g === "함수적 종속") return topic.items.filter((i) => i.group === "함수적 종속");
  if (g === "조인 종류") return topic.items.filter((i) => i.group === "조인 종류");
  return topic.items;
}

function getDatabaseFullListLabel(question) {
  const g = question?.item?.group;
  if (g === "순수 관계 연산자" || g === "집합 연산자") return (item) => item.symbol;
  if (g === "이상") return (item) => item.nameKo;
  return formatDisplayName;
}

export default function QuizPage() {
  const { topicId } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const favoritesOnly = searchParams.get("favorites") === "1";
  const drillMode = searchParams.get("mode");
  const isWrongDrillClassicMode = drillMode === "wrongDrill";
  const isWrongDrillChoiceMode = drillMode === "wrongDrillChoice";
  const isWrongDrillMode = isWrongDrillClassicMode || isWrongDrillChoiceMode;
  const { favoriteKeys } = useFavorites();
  const isAllFavoritesRoute = topicId === ALL_FAVORITES_TOPIC_ID;

  const topic = useMemo(() => {
    if (isAllFavoritesRoute) {
      return buildAllFavoritesTopic(favoriteKeys);
    }
    return topics.find((t) => t.id === topicId);
  }, [topicId, isAllFavoritesRoute, favoriteKeys]);

  const topicFavoriteIds = useMemo(() => {
    if (!topic || isAllFavoritesRoute || !favoritesOnly) return null;
    const s = itemIdsForTopicFavorites(favoriteKeys, topic.id);
    return s; // 빈 Set 이면 출제 풀 0건
  }, [topic, isAllFavoritesRoute, favoritesOnly, favoriteKeys]);

  const nextQuestionOpts = useMemo(() => {
    const o = {};
    if (isAllFavoritesRoute) {
      o.getItemStatsTopicId = (item) => item._statsTopicId;
    }
    if (topicFavoriteIds) {
      o.allowedItemIds = topicFavoriteIds;
    }
    return o;
  }, [isAllFavoritesRoute, topicFavoriteIds]);

  const favoritesPoolEmpty = useMemo(() => {
    if (!topic) return false;
    if (isAllFavoritesRoute) return topic.items.length === 0;
    if (favoritesOnly && topicFavoriteIds) return topicFavoriteIds.size === 0;
    return false;
  }, [topic, isAllFavoritesRoute, favoritesOnly, topicFavoriteIds]);

  const { kakaoUserId } = useKakaoAuth();
  const [quizType, setQuizType] = useState(QUIZ_TYPES.SUBJECTIVE);
  const [question, setQuestion] = useState(null);
  const [lastItemId, setLastItemId] = useState(null);
  const [stats, setStats] = useState(() => loadStats(null));
  const [result, setResult] = useState(null); // { isCorrect, userAnswer, correctAnswer }
  const [solveCount, setSolveCount] = useState(0);
  /** 틀린 것만 모드: { cleared, total, done } */
  const [wrongDrillProgress, setWrongDrillProgress] = useState(null);
  /** 틀린 것만 모드: 라운드 종료 시 오답 출제목록 요약 */
  const [wrongDrillRoundReview, setWrongDrillRoundReview] = useState(null);
  /** 미니 통계 박스용 — 렌더 중 ref 읽기 금지 대신 핸들러에서 동기화 */
  const [wrongDrillMiniBuckets, setWrongDrillMiniBuckets] = useState(null);
  const wrongDrillStateRef = useRef(null);
  const wrongDrillSessionKeyRef = useRef("");
  const wrongDrillCurrentEntryKeyRef = useRef(null);
  const wrongDrillIsCouplingMode = Boolean(
    isWrongDrillMode && topic && isCouplingCohesionTopic(topic)
  );
  const wrongDrillIsDatabaseMode = Boolean(isWrongDrillMode && topic && isDatabaseTopic(topic));

  const normalizeChoiceOptions = useCallback((rawOptions, correctAnswer) => {
    if (!Array.isArray(rawOptions) || !rawOptions.length) return rawOptions;
    if (typeof correctAnswer !== "string" || !correctAnswer) return rawOptions;
    const uniq = [...new Set(rawOptions.map((v) => String(v)))];
    const withCorrect = uniq.includes(correctAnswer) ? uniq : [correctAnswer, ...uniq];
    const minCount = Math.min(4, withCorrect.length);
    const maxCount = Math.min(8, withCorrect.length);
    if (withCorrect.length <= maxCount) return withCorrect;
    const targetCount =
      minCount === maxCount
        ? minCount
        : minCount + Math.floor(Math.random() * (maxCount - minCount + 1));
    const others = shuffle(withCorrect.filter((v) => v !== correctAnswer));
    return shuffle([correctAnswer, ...others.slice(0, Math.max(0, targetCount - 1))]);
  }, []);

  const recomputeWrongDrillMiniBuckets = useCallback(() => {
    const st = wrongDrillStateRef.current;
    if (!st || st.done) return null;
    return wrongDrillMiniStatBuckets(st, {
      total: st.total,
      cleared: st.eliminated.size,
      done: false,
    });
  }, []);

  const wrongDrillItemMap = useMemo(() => {
    if (!topic) return new Map();
    const pool = getTopicQuizPool(topic, QUIZ_TYPES.SUBJECTIVE).filter(
      (i) => !topicFavoriteIds || topicFavoriteIds.has(i.id)
    );
    return new Map(pool.map((i) => [i.id, i]));
  }, [topic, topicFavoriteIds]);

  /** 해설(정답/오답) 표시 중 — 즐겨찾기 토글 시 출제 effect가 돌면 안 됨 */
  const viewingResultRef = useRef(false);
  useEffect(() => {
    viewingResultRef.current = result != null;
  }, [result]);

  /** 틀린 것만: 세션 진행이 있으면 이탈 시 확인(무한 모드는 누적 기록 유지 — 경고 없음). 완료 후에는 불필요 */
  const shouldConfirmLeaveQuiz =
    isWrongDrillMode &&
    Boolean(topic) &&
    !favoritesPoolEmpty &&
    (solveCount > 0 || result != null) &&
    !wrongDrillProgress?.done;

  useEffect(() => {
    if (!shouldConfirmLeaveQuiz) {
      setQuizLeaveConfirm(null);
      return () => setQuizLeaveConfirm(null);
    }
    setQuizLeaveConfirm(() => window.confirm(LEAVE_QUIZ_SESSION_MSG));
    return () => setQuizLeaveConfirm(null);
  }, [shouldConfirmLeaveQuiz]);

  useEffect(() => {
    if (!shouldConfirmLeaveQuiz) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [shouldConfirmLeaveQuiz]);

  const quizRenderTopic = useMemo(() => {
    if (!isAllFavoritesRoute || !question?.item?._statsTopicId) return topic;
    return topics.find((t) => t.id === question.item._statsTopicId) ?? topic;
  }, [isAllFavoritesRoute, question, topic]);

  /** 전체 즐겨찾기는 주관식만, 틀린 것만은 주제 규칙에 따름 */
  useEffect(() => {
    if (isAllFavoritesRoute) {
      setQuizType(QUIZ_TYPES.SUBJECTIVE);
      return;
    }
    if (isWrongDrillMode) {
      if (isWrongDrillChoiceMode) {
        setQuizType(QUIZ_TYPES.MULTIPLE_CHOICE);
        return;
      }
      if (topic && (isCouplingCohesionTopic(topic) || isDatabaseTopic(topic))) {
        setQuizType(QUIZ_TYPES.MULTIPLE_CHOICE);
      } else if (topic && isTestingTypesTopic(topic)) {
        /* 화이트/블랙박스=객관식·그 외=주관식 혼합 — loadWrongDrillQuestionAtPtr가 entry.quizType으로 설정 */
      } else {
        setQuizType(QUIZ_TYPES.SUBJECTIVE);
      }
    }
  }, [isAllFavoritesRoute, isWrongDrillMode, isWrongDrillChoiceMode, topic]);

  useEffect(() => {
    if (!isWrongDrillMode) return;
    setWrongDrillRoundReview(null);
  }, [isWrongDrillMode]);

  const loadWrongDrillQuestionAtPtr = useCallback(() => {
    const st = wrongDrillStateRef.current;
    if (!st || st.done || !topic) {
      setQuestion(null);
      return;
    }
    const entry = st.waveEntries[st.ptr];
    if (!entry) {
      setQuestion(null);
      wrongDrillCurrentEntryKeyRef.current = null;
      return;
    }
    const latest = loadStats(kakaoUserId);
    const q = getNextQuestion(topic, entry.quizType, null, latest, {
      ...nextQuestionOpts,
      allowedItemIds: new Set([entry.itemId]),
    });
    const patchedQuestion =
      isWrongDrillChoiceMode &&
      q &&
      entry.quizType === QUIZ_TYPES.MULTIPLE_CHOICE &&
      Array.isArray(q.options)
        ? {
            ...q,
            options: normalizeChoiceOptions(q.options, q.answer),
          }
        : q;
    setQuizType(entry.quizType);
    wrongDrillCurrentEntryKeyRef.current = entry.key;
    setQuestion(patchedQuestion);
    setResult(null);
    if (patchedQuestion) setLastItemId(patchedQuestion.item.id);
    setStats(latest);
  }, [topic, kakaoUserId, nextQuestionOpts, isWrongDrillChoiceMode, normalizeChoiceOptions]);

  const initWrongDrillSession = useCallback(() => {
    if (!topic) return;
    if (isWrongDrillChoiceMode) {
      const mcPool = getTopicQuizPool(topic, QUIZ_TYPES.MULTIPLE_CHOICE).filter(
        (i) => !topicFavoriteIds || topicFavoriteIds.has(i.id)
      );
      const mcEntries = mcPool.map((i) => ({
        key: i.id,
        itemId: i.id,
        quizType: QUIZ_TYPES.MULTIPLE_CHOICE,
      }));
      if (!mcEntries.length) {
        wrongDrillStateRef.current = null;
        wrongDrillCurrentEntryKeyRef.current = null;
        setWrongDrillProgress(null);
        setWrongDrillRoundReview(null);
        setWrongDrillMiniBuckets(null);
        setQuestion(null);
        return;
      }
      const entries = shuffle(mcEntries);
      wrongDrillStateRef.current = {
        waveEntries: entries,
        ptr: 0,
        eliminated: new Set(),
        wrongOnceIds: new Set(),
        roundWrongs: [],
        round: 1,
        total: entries.length,
        done: false,
      };
      setWrongDrillProgress({ cleared: 0, total: entries.length, done: false });
      setWrongDrillMiniBuckets(recomputeWrongDrillMiniBuckets());
      loadWrongDrillQuestionAtPtr();
      return;
    }

    const subjectivePool = getTopicQuizPool(topic, QUIZ_TYPES.SUBJECTIVE).filter(
      (i) => !topicFavoriteIds || topicFavoriteIds.has(i.id)
    );
    const entryPool = (() => {
      if (isTestingTypesTopic(topic)) {
        const matchingPool = getTopicQuizPool(topic, QUIZ_TYPES.MATCHING).filter(
          (i) => !topicFavoriteIds || topicFavoriteIds.has(i.id)
        );
        return [
          ...subjectivePool.map((i) => ({
            key: i.id,
            itemId: i.id,
            quizType:
              i.group === "화이트박스 검사" || i.group === "블랙박스 검사"
                ? QUIZ_TYPES.MULTIPLE_CHOICE
                : QUIZ_TYPES.SUBJECTIVE,
          })),
          ...matchingPool.map((i) => ({
            key: i.id,
            itemId: i.id,
            quizType: QUIZ_TYPES.MATCHING,
          })),
        ];
      }
      if (!isCouplingCohesionTopic(topic) && !isDatabaseTopic(topic)) {
        return subjectivePool.map((i) => ({
          key: i.id,
          itemId: i.id,
          quizType: QUIZ_TYPES.SUBJECTIVE,
        }));
      }
      if (isDatabaseTopic(topic)) {
        const mcPool = getTopicQuizPool(topic, QUIZ_TYPES.MULTIPLE_CHOICE).filter(
          (i) => !topicFavoriteIds || topicFavoriteIds.has(i.id)
        );
        return mcPool.map((i) => ({
          key: i.id,
          itemId: i.id,
          quizType: QUIZ_TYPES.MULTIPLE_CHOICE,
        }));
      }
      const mcPool = getTopicQuizPool(topic, QUIZ_TYPES.MULTIPLE_CHOICE).filter(
        (i) => !topicFavoriteIds || topicFavoriteIds.has(i.id)
      );
      const orderingEntries = ["결합도", "응집도"]
        .filter((g) => topic.items.some((i) => i.group === g))
        .map((g) => ({
          key: `ordering-${g}`,
          itemId: `ordering-${g}`,
          quizType: QUIZ_TYPES.ORDERING,
        }));
      return [
        ...mcPool.map((i) => ({
          key: i.id,
          itemId: i.id,
          quizType: QUIZ_TYPES.MULTIPLE_CHOICE,
        })),
        ...orderingEntries,
      ].slice(0, 15);
    })();
    if (!entryPool.length) {
      wrongDrillStateRef.current = null;
      wrongDrillCurrentEntryKeyRef.current = null;
      setWrongDrillProgress(null);
      setWrongDrillRoundReview(null);
      setWrongDrillMiniBuckets(null);
      setQuestion(null);
      return;
    }
    const entries = shuffle(entryPool);
    wrongDrillStateRef.current = {
      waveEntries: entries,
      ptr: 0,
      eliminated: new Set(),
      wrongOnceIds: new Set(),
      roundWrongs: [],
      round: 1,
      total: entries.length,
      done: false,
    };
    setWrongDrillProgress({ cleared: 0, total: entries.length, done: false });
    setWrongDrillMiniBuckets(recomputeWrongDrillMiniBuckets());
    loadWrongDrillQuestionAtPtr();
  }, [
    topic,
    topicFavoriteIds,
    loadWrongDrillQuestionAtPtr,
    recomputeWrongDrillMiniBuckets,
    isWrongDrillChoiceMode,
  ]);

  const loadNextQuestion = useCallback(() => {
    if (!topic) return;
    if (isWrongDrillMode) return;
    const latest = loadStats(kakaoUserId);
    const q = getNextQuestion(topic, quizType, lastItemId, latest, nextQuestionOpts);
    setQuestion(q);
    setResult(null);
    if (q) setLastItemId(q.item.id);
    setStats(latest);
  }, [topic, isWrongDrillMode, kakaoUserId, quizType, lastItemId, nextQuestionOpts]);

  /** 주제·유형·로그인·출제 옵션·즐겨찾기 변경 시 새로 출제 (해설 화면에서는 동일 문항 유지) — 무한 모드만 */
  useEffect(() => {
    if (!topic || isWrongDrillMode) return;
    if (viewingResultRef.current) return;
    const latest = loadStats(kakaoUserId);
    const q = getNextQuestion(topic, quizType, null, latest, nextQuestionOpts);
    setQuestion(q);
    setResult(null);
    if (q) setLastItemId(q.item.id);
    setStats(latest);
  }, [topic, quizType, kakaoUserId, nextQuestionOpts, favoriteKeys, isWrongDrillMode]);

  /** 틀린 것만 모드: 라우트 location.key 마다 새 세션 */
  useEffect(() => {
    if (!isWrongDrillMode || !topic || favoritesPoolEmpty) {
      wrongDrillStateRef.current = null;
      wrongDrillCurrentEntryKeyRef.current = null;
      setWrongDrillProgress(null);
      setWrongDrillRoundReview(null);
      setWrongDrillMiniBuckets(null);
      wrongDrillSessionKeyRef.current = "";
      return;
    }
    if (viewingResultRef.current) return;

    const sessionKey = `${topicId}|${favoritesOnly ? "fav" : "all"}|${isAllFavoritesRoute ? "allfav" : "topic"}|${location.key}`;
    if (wrongDrillSessionKeyRef.current === sessionKey) {
      return;
    }
    wrongDrillSessionKeyRef.current = sessionKey;
    initWrongDrillSession();
  }, [
    isWrongDrillMode,
    topic,
    topicId,
    favoritesOnly,
    isAllFavoritesRoute,
    favoritesPoolEmpty,
    initWrongDrillSession,
    location.key,
  ]);

  /** 카카오 로그인 후 클라우드에서 통계를 받아오면 통계 UI 갱신 */
  useEffect(() => {
    function onStatsMerged() {
      setStats(loadStats(kakaoUserId));
    }
    window.addEventListener("quiz-stats-storage-changed", onStatsMerged);
    return () => window.removeEventListener("quiz-stats-storage-changed", onStatsMerged);
  }, [kakaoUserId]);

  useEffect(() => {
    if (!topic || topic.id === ALL_FAVORITES_TOPIC_ID || isWrongDrillMode) return;
    if (isDesignPatternTopic(topic)) {
      const valid = [QUIZ_TYPES.SUBJECTIVE, QUIZ_TYPES.PURPOSE_AND_PATTERN];
      if (!valid.includes(quizType)) setQuizType(QUIZ_TYPES.SUBJECTIVE);
    }
    if (isCryptoTopic(topic)) {
      const valid = [QUIZ_TYPES.SUBJECTIVE, QUIZ_TYPES.MULTIPLE_CHOICE, QUIZ_TYPES.FULL_LIST, QUIZ_TYPES.PURPOSE_ONLY, QUIZ_TYPES.PURPOSE_AND_PATTERN];
      if (!valid.includes(quizType)) setQuizType(QUIZ_TYPES.SUBJECTIVE);
    }
    if (isCouplingCohesionTopic(topic)) {
      const valid = [QUIZ_TYPES.SUBJECTIVE, QUIZ_TYPES.MULTIPLE_CHOICE, QUIZ_TYPES.ORDERING];
      if (!valid.includes(quizType)) setQuizType(QUIZ_TYPES.SUBJECTIVE);
    }
    if (isLinuxCommandsTopic(topic)) {
      const valid = [QUIZ_TYPES.SUBJECTIVE, QUIZ_TYPES.MULTIPLE_CHOICE, QUIZ_TYPES.FULL_LIST];
      if (!valid.includes(quizType)) setQuizType(QUIZ_TYPES.SUBJECTIVE);
    }
    if (isDatabaseTopic(topic)) {
      const valid = [QUIZ_TYPES.SUBJECTIVE, QUIZ_TYPES.MULTIPLE_CHOICE, QUIZ_TYPES.FULL_LIST];
      if (!valid.includes(quizType)) setQuizType(QUIZ_TYPES.SUBJECTIVE);
    }
    if (isTestingTypesTopic(topic)) {
      const valid = [
        QUIZ_TYPES.SUBJECTIVE,
        QUIZ_TYPES.MULTIPLE_CHOICE,
        QUIZ_TYPES.FULL_LIST,
        QUIZ_TYPES.MATCHING,
      ];
      if (!valid.includes(quizType)) setQuizType(QUIZ_TYPES.SUBJECTIVE);
    }
  }, [topic, quizType, isWrongDrillMode]);

  const handleSubmit = (userAnswer) => {
    if (!question || result) return;
    const statsTopicIdForItem = question.item._statsTopicId ?? topicId;
    const sourceTopic = topics.find((t) => t.id === statsTopicIdForItem) ?? topic;

    let isCorrect;
    if (quizType === QUIZ_TYPES.PURPOSE_ONLY) {
      isCorrect = checkPurposeAnswer(userAnswer, question.answer);
    } else if (quizType === QUIZ_TYPES.PURPOSE_AND_PATTERN) {
      const { purpose, pattern } = userAnswer;
      isCorrect =
        checkPurposeAnswer(purpose, question.answer.purpose) &&
        pattern === question.answer.pattern;
    } else if (quizType === QUIZ_TYPES.SUBJECTIVE && isDesignPatternTopic(sourceTopic)) {
      const { purpose, pattern } = userAnswer;
      isCorrect =
        checkPurposeAnswer(purpose, question.item.purpose) &&
        checkNameAnswer(pattern, question.item);
    } else if (
      quizType === QUIZ_TYPES.SUBJECTIVE &&
      isCryptoTopic(sourceTopic) &&
      question.item.cryptoClass
    ) {
      const { purpose, pattern } = userAnswer;
      isCorrect =
        checkPurposeAnswer(purpose, question.item.cryptoClass) &&
        checkNameAnswer(pattern, question.item);
    } else if (quizType === QUIZ_TYPES.SUBJECTIVE) {
      isCorrect = checkNameAnswer(userAnswer, question.item);
    } else if (quizType === QUIZ_TYPES.MATCHING) {
      isCorrect = checkVModelMatching(userAnswer, question.correctPairs);
    } else if (quizType === QUIZ_TYPES.ORDERING) {
      isCorrect = checkOrderAnswer(userAnswer, question.correctOrder);
    } else {
      isCorrect = userAnswer === question.answer;
    }

    updateItemStats(statsTopicIdForItem, question.item.id, isCorrect, kakaoUserId);
    if (isWrongDrillMode && wrongDrillStateRef.current && !wrongDrillStateRef.current.done) {
      if (!isCorrect) {
        const wrongKey = wrongDrillCurrentEntryKeyRef.current ?? question.item.id;
        wrongDrillStateRef.current.wrongOnceIds.add(wrongKey);
        setWrongDrillMiniBuckets(recomputeWrongDrillMiniBuckets());
      }
    }
    setStats(loadStats(kakaoUserId));
    const correctAnswer =
      quizType === QUIZ_TYPES.SUBJECTIVE && isDesignPatternTopic(sourceTopic)
        ? `${question.item.purpose} - ${formatDisplayName(question.item)}`
        : quizType === QUIZ_TYPES.SUBJECTIVE &&
            isCryptoTopic(sourceTopic) &&
            question.item.cryptoClass
          ? `${question.item.cryptoClass} - ${formatDisplayName(question.item)}`
          : question.answerDisplay;

    const userAnswerDisplay = (() => {
      if (quizType === QUIZ_TYPES.MATCHING && userAnswer && typeof userAnswer === "object") {
        return Object.entries(userAnswer)
          .map(([k, v]) => `${k} → ${v}`)
          .join("\n");
      }
      if (typeof userAnswer === "object" && userAnswer != null && "purpose" in userAnswer) {
        return `${userAnswer.purpose} - ${userAnswer.pattern}`;
      }
      return userAnswer;
    })();

    setResult({
      isCorrect,
      userAnswer: userAnswerDisplay,
      correctAnswer,
      questionText: question.question,
      ...((isLinuxCommandsTopic(sourceTopic) ||
        isDatabaseTopic(sourceTopic) ||
        sourceTopic?.id === "network" ||
        isMiscTopic(sourceTopic) ||
        isCryptoTopic(sourceTopic) ||
        isTestingTypesTopic(sourceTopic)) &&
        !isCorrect &&
        question.item?.shortDescription && { correctAnswerExplanation: question.item.shortDescription }),
      ...(quizType === QUIZ_TYPES.MATCHING &&
        !isCorrect &&
        question.answerDisplay && { correctAnswerExplanation: question.answerDisplay }),
    });
    setSolveCount((c) => c + 1);
  };

  const handleNext = () => {
    if (isWrongDrillMode && wrongDrillStateRef.current && !wrongDrillStateRef.current.done) {
      const st = wrongDrillStateRef.current;
      const entry = st.waveEntries[st.ptr];
      if (!entry) return;
      const entryKey = entry.key;
      if (result?.isCorrect) st.eliminated.add(entryKey);
      else st.roundWrongs.push(entryKey);
      st.ptr += 1;
      if (st.ptr >= st.waveEntries.length) {
        const uniqueWrong = [...new Set(st.roundWrongs)];
        st.roundWrongs = [];
        st.ptr = 0;
        if (uniqueWrong.length === 0) {
          st.done = true;
          setWrongDrillProgress((p) =>
            p ? { cleared: st.eliminated.size, total: st.total, done: true } : null
          );
          setWrongDrillRoundReview(null);
          setWrongDrillMiniBuckets(null);
          setQuestion(null);
          setResult(null);
          return;
        }
        setWrongDrillRoundReview({
          round: Number.isFinite(st.round) ? st.round : 1,
          wrongIds: uniqueWrong,
        });
        st.waveEntries = shuffle(
          uniqueWrong
            .map((key) => st.waveEntries.find((e) => e.key === key))
            .filter(Boolean)
        );
        st.round += 1;
        setQuestion(null);
        setResult(null);
        return;
      }
      setWrongDrillProgress({
        cleared: st.eliminated.size,
        total: st.total,
        done: false,
      });
      setWrongDrillMiniBuckets(recomputeWrongDrillMiniBuckets());
      loadWrongDrillQuestionAtPtr();
      return;
    }
    if (!isWrongDrillMode) {
      loadNextQuestion();
      return;
    }
    loadNextQuestion();
  };

  const handleResetStats = () => {
    if (isAllFavoritesRoute || isWrongDrillMode) return;
    if (confirm("이 주제의 퀴즈 기록을 모두 초기화할까요?")) {
      resetStats(topicId, kakaoUserId);
      setStats(loadStats(kakaoUserId));
      setSolveCount(0);
      loadNextQuestion();
    }
  };

  const handleWrongDrillContinueRound = () => {
    const st = wrongDrillStateRef.current;
    if (st && !st.done) {
      // 오답 라운드 시작 시 기존 오답 스택은 남은 문제로 되돌림.
      // 이후 이 라운드에서 다시 틀린 문항만 wrongOnceIds에 누적된다.
      st.wrongOnceIds = new Set();
      setWrongDrillMiniBuckets(recomputeWrongDrillMiniBuckets());
    }
    setWrongDrillRoundReview(null);
    loadWrongDrillQuestionAtPtr();
  };

  useEffect(() => {
    if (!result) return undefined;
    const onKeyDown = (e) => {
      if (e.key !== "Enter" || e.isComposing || e.repeat) return;
      // 결과 화면에서 Enter로 다음 문제로 이동
      e.preventDefault();
      handleNext();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [result, handleNext]);

  useEffect(() => {
    if (!isWrongDrillMode || !wrongDrillRoundReview || wrongDrillProgress?.done) return undefined;
    const onKeyDown = (e) => {
      if (e.key !== "Enter" || e.isComposing || e.repeat) return;
      e.preventDefault();
      handleWrongDrillContinueRound();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isWrongDrillMode, wrongDrillRoundReview, wrongDrillProgress, handleWrongDrillContinueRound]);

  if (!topic && !isAllFavoritesRoute) {
    return (
      <div className="quiz-page">
        <p>주제를 찾을 수 없습니다.</p>
        <Link to="/">홈으로</Link>
      </div>
    );
  }

  const topicStats = stats[topicId] || {
    items: {},
    totalCorrect: 0,
    totalWrong: 0,
    history: [],
  };

  const statsDisplayItems =
    topic && !isAllFavoritesRoute && isMiscTopic(topic) ? expandMiscItems(topic.items) : topic?.items ?? [];

  const quizStatsItems =
    favoritesOnly && topicFavoriteIds
      ? statsDisplayItems.filter((i) => topicFavoriteIds.has(i.id))
      : statsDisplayItems;

  return (
    <div className="quiz-page">
      <header className="quiz-header">
        <Link
          to="/"
          className="home-link"
          onClick={(e) => {
            if (!tryConfirmLeaveQuiz()) e.preventDefault();
          }}
        >
          ← 홈
        </Link>
        <h1>{topic?.title ?? "퀴즈"}</h1>
      </header>

      {isAllFavoritesRoute && (
        <p className="quiz-favorites-mode-hint">주관식만 · 출제 통계는 각 목차에 반영됩니다.</p>
      )}
      {favoritesOnly && !isAllFavoritesRoute && (
        <p className="quiz-favorites-mode-hint">이 목차에서 ★ 즐겨찾기만 출제합니다.</p>
      )}
      {isWrongDrillMode && (
        <p className="quiz-favorites-mode-hint">
          {isWrongDrillChoiceMode
            ? "틀린 것만(보기형) · 객관식 중심 · 보기 4~8개 · 한 바퀴씩 풀고 오답만 반복합니다."
            : wrongDrillIsCouplingMode
            ? "틀린 것만 모드 · 객관식+순서 맞추기 · 최대 15문항 · 한 바퀴씩 풀고 오답만 반복합니다."
            : wrongDrillIsDatabaseMode
            ? "틀린 것만 모드 · 객관식만 · 카테고리별 전체 보기 · 한 바퀴씩 풀고 오답만 반복합니다."
            : topic && isTestingTypesTopic(topic)
            ? "틀린 것만 모드 · 화이트/블랙박스는 객관식(그룹·하위분류 전체 보기) · 그 외 주관식 · 한 바퀴씩 풀고 오답만 반복합니다."
            : "틀린 것만 모드 · 주관식만 · 한 바퀴씩 풀고 오답만 반복합니다."}
        </p>
      )}

      <div className="quiz-controls">
        {!isAllFavoritesRoute && !isWrongDrillMode && (
          <>
            {isDatabaseTopic(topic) || isTestingTypesTopic(topic) ? (
              <div className="quiz-type-tabs">
                {(
                  isTestingTypesTopic(topic)
                    ? [
                        { key: QUIZ_TYPES.SUBJECTIVE, label: "주관식" },
                        { key: QUIZ_TYPES.MULTIPLE_CHOICE, label: "객관식" },
                        { key: QUIZ_TYPES.FULL_LIST, label: "전체 보기" },
                        { key: QUIZ_TYPES.MATCHING, label: "매칭(드래그)" },
                      ]
                    : [
                        { key: QUIZ_TYPES.SUBJECTIVE, label: "주관식" },
                        { key: QUIZ_TYPES.MULTIPLE_CHOICE, label: "객관식" },
                        { key: QUIZ_TYPES.FULL_LIST, label: "전체 보기" },
                      ]
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    className={`tab ${quizType === key ? "active" : ""}`}
                    onClick={() => setQuizType(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="quiz-type-tabs">
                {(isDesignPatternTopic(topic)
                  ? [
                      { key: QUIZ_TYPES.SUBJECTIVE, label: "목적+패턴(주관식)" },
                      { key: QUIZ_TYPES.PURPOSE_AND_PATTERN, label: "목적+패턴(객관식)" },
                    ]
                  : isCryptoTopic(topic)
                  ? [
                      { key: QUIZ_TYPES.SUBJECTIVE, label: "알고리즘명(주관식)" },
                      { key: QUIZ_TYPES.MULTIPLE_CHOICE, label: "알고리즘명(4지선다)" },
                      { key: QUIZ_TYPES.FULL_LIST, label: "전체 보기" },
                      { key: QUIZ_TYPES.PURPOSE_ONLY, label: "분류 맞히기" },
                      { key: QUIZ_TYPES.PURPOSE_AND_PATTERN, label: "분류+알고리즘" },
                    ]
                  : isCouplingCohesionTopic(topic)
                  ? [
                      { key: QUIZ_TYPES.SUBJECTIVE, label: "주관식" },
                      { key: QUIZ_TYPES.MULTIPLE_CHOICE, label: "객관식" },
                      { key: QUIZ_TYPES.ORDERING, label: "순서 맞추기" },
                    ]
                  : isLinuxCommandsTopic(topic)
                  ? [
                      { key: QUIZ_TYPES.SUBJECTIVE, label: "주관식" },
                      { key: QUIZ_TYPES.MULTIPLE_CHOICE, label: "객관식" },
                      { key: QUIZ_TYPES.FULL_LIST, label: "전체 보기" },
                    ]
                  : [
                      { key: QUIZ_TYPES.SUBJECTIVE, label: "주관식" },
                      { key: QUIZ_TYPES.FULL_LIST, label: "전체 보기" },
                      { key: QUIZ_TYPES.MULTIPLE_CHOICE, label: "4지 선다" },
                    ]
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    className={`tab ${quizType === key ? "active" : ""}`}
                    onClick={() => setQuizType(key)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <button type="button" className="reset-btn" onClick={handleResetStats}>
              기록 초기화
            </button>
          </>
        )}
      </div>

      {!isAllFavoritesRoute && !isWrongDrillMode && (
        <QuizStats
          history={topicStats.history || []}
          items={quizStatsItems}
          totalCorrect={topicStats.totalCorrect ?? 0}
          totalWrong={topicStats.totalWrong ?? 0}
        />
      )}

      <div
        className={
          "question-area" +
          (!favoritesPoolEmpty && question && isWrongDrillMode
            ? " question-area--with-question"
            : "")
        }
      >
        {favoritesPoolEmpty && (
          <div className="quiz-empty-favorites">
            <p>
              {isAllFavoritesRoute
                ? "즐겨찾기한 문제가 없습니다. 각 목차의 출제 목록에서 ★를 눌러 추가하세요."
                : "이 목차에서 즐겨찾기한 문제가 없습니다."}
            </p>
            <Link to="/" className="home-link">
              홈으로
            </Link>
          </div>
        )}
        {!favoritesPoolEmpty && isWrongDrillMode && wrongDrillProgress?.done && (
          <div className="quiz-wrong-drill-complete">
            <p>이번 세션에서 모든 문항을 맞혔습니다.</p>
            <Link to="/" className="home-link">
              홈으로
            </Link>
          </div>
        )}
        {!favoritesPoolEmpty &&
          isWrongDrillMode &&
          wrongDrillRoundReview &&
          !wrongDrillProgress?.done && (
            <div className="quiz-wrong-drill-round-review">
              {(() => {
                const reviewItems = wrongDrillRoundReview.wrongIds
                  .map((id) => buildWrongDrillReviewRow(topic, wrongDrillItemMap, id))
                  .filter(Boolean);
                const reviewIsDesign = Boolean(
                  topic && isDesignPatternTopic(topic) && reviewItems.every((item) => item.purpose)
                );
                return (
                  <>
              <h3>{wrongDrillRoundReview.round}라운드 오답 출제목록</h3>
              <p>
                이번 라운드 오답 {wrongDrillRoundReview.wrongIds.length}개를 다시 풉니다.
              </p>
              <table className="quiz-wrong-drill-review-table">
                <thead>
                  <tr>
                    <th aria-label="즐겨찾기" />
                    <th>번호</th>
                    {reviewIsDesign && <th>목적</th>}
                    <th>{reviewIsDesign ? "패턴명" : "이름"}</th>
                    <th>설명</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewItems.map((item, i) => (
                    <tr key={item.id}>
                      <td className="quiz-wrong-drill-review-fav-cell">
                        <FavoriteStarButton
                          topicId={item._statsTopicId ?? topicId}
                          itemId={item.id}
                          variant="compact"
                        />
                      </td>
                      <td>{i + 1}</td>
                      {reviewIsDesign && <td>{item.purpose}</td>}
                      <td>{item.name}</td>
                      <td>{item.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                type="button"
                className="next-btn"
                onClick={handleWrongDrillContinueRound}
              >
                오답 라운드 시작
              </button>
                  </>
                );
              })()}
            </div>
          )}
        {!favoritesPoolEmpty && question && (
          <>
            {isWrongDrillMode ? (
              <div className="question-area-top-row question-area-top-row--solo">
                <div className="question-area-stats-column">
                  {wrongDrillProgress && wrongDrillMiniBuckets ? (
                    <QuestionMiniStatBoxes {...wrongDrillMiniBuckets} />
                  ) : null}
                  <p className="question-area-topic-caption">
                    틀린 것만 모드 · {quizRenderTopic?.title ?? topic?.title}
                  </p>
                </div>
              </div>
            ) : (
              <div className="question-area-top-row question-area-top-row--solo">
                <div className="solve-count">
                  {quizRenderTopic?.title ?? topic?.title}
                </div>
              </div>
            )}
            <DrillPromptShell useShell={isWrongDrillMode}>
            {!result ? (
              <>
                {isDatabaseTopic(quizRenderTopic) || isTestingTypesTopic(quizRenderTopic) ? (
                  <>
                    {quizType === QUIZ_TYPES.SUBJECTIVE && (
                      <SubjectiveQuestion
                        question={question}
                        onSubmit={handleSubmit}
                        hint={question.hint ?? "용어를 입력하세요 (한국어 또는 영어)"}
                      />
                    )}
                    {quizType === QUIZ_TYPES.MULTIPLE_CHOICE && (
                      <MultipleChoiceQuestion question={question} onSubmit={handleSubmit} />
                    )}
                    {quizType === QUIZ_TYPES.FULL_LIST && (
                      <FullListQuestion
                        question={question}
                        items={
                          isTestingTypesTopic(quizRenderTopic)
                            ? getTestingTypesFullListItems(quizRenderTopic, question)
                            : getDatabaseFullListItems(quizRenderTopic, question)
                        }
                        onSubmit={handleSubmit}
                        getOptionLabel={
                          isTestingTypesTopic(quizRenderTopic)
                            ? undefined
                            : getDatabaseFullListLabel(question)
                        }
                      />
                    )}
                    {isTestingTypesTopic(quizRenderTopic) && quizType === QUIZ_TYPES.MATCHING && (
                      <VModelMatchingQuestion question={question} onSubmit={handleSubmit} />
                    )}
                  </>
                ) : (
                  <>
                    {quizType === QUIZ_TYPES.SUBJECTIVE &&
                      (isDesignPatternTopic(quizRenderTopic) ||
                        (isCryptoTopic(quizRenderTopic) && question?.item?.cryptoClass)) && (
                        <PurposeAndSubjectiveQuestion
                          question={question}
                          onSubmit={handleSubmit}
                        />
                      )}
                    {quizType === QUIZ_TYPES.SUBJECTIVE &&
                      !isDesignPatternTopic(quizRenderTopic) &&
                      !(isCryptoTopic(quizRenderTopic) && question?.item?.cryptoClass) && (
                        <SubjectiveQuestion
                          question={question}
                          onSubmit={handleSubmit}
                          hint={
                            question.hint ??
                            (isLinuxCommandsTopic(quizRenderTopic)
                              ? "명령어를 입력하세요 (대소문자 무관)"
                              : isCryptoTopic(quizRenderTopic)
                              ? "알고리즘·보안 용어를 입력하세요 (한국어 또는 영어)"
                              : isCouplingCohesionTopic(quizRenderTopic)
                              ? "항목명을 입력하세요 (한국어 또는 영어)"
                              : isNetworkTopic(quizRenderTopic)
                              ? "네트워크 용어를 입력하세요 (한국어 또는 영어)"
                              : isMiscTopic(quizRenderTopic)
                              ? "용어·약어를 입력하세요 (한국어 또는 영어, 예: RAID 5, SRP, SSO)"
                              : "공격 유형 이름을 입력하세요 (한국어 또는 영어 모두 가능)")
                          }
                        />
                      )}
                    {quizType === QUIZ_TYPES.MULTIPLE_CHOICE && (
                      <MultipleChoiceQuestion
                        question={question}
                        onSubmit={handleSubmit}
                      />
                    )}
                    {quizType === QUIZ_TYPES.FULL_LIST && (
                      <FullListQuestion
                        question={question}
                        items={
                          question && isNetworkTopic(quizRenderTopic)
                            ? getNetworkFullListItems(quizRenderTopic, question)
                            : question && isCryptoTopic(quizRenderTopic)
                            ? getCryptoFullListItems(quizRenderTopic, question)
                            : isTestingTypesTopic(quizRenderTopic)
                            ? getTestingTypesFullListItems(quizRenderTopic, question)
                            : isMiscTopic(quizRenderTopic)
                            ? getMiscFullListItems(quizRenderTopic, question)
                            : quizRenderTopic.items
                        }
                        onSubmit={handleSubmit}
                        getOptionLabel={
                          isLinuxCommandsTopic(quizRenderTopic)
                            ? (item) => item.nameKo ?? item.nameEn
                            : undefined
                        }
                      />
                    )}
                    {quizType === QUIZ_TYPES.PURPOSE_ONLY && (
                      <PurposeOnlyQuestion
                        question={question}
                        onSubmit={handleSubmit}
                      />
                    )}
                    {quizType === QUIZ_TYPES.PURPOSE_AND_PATTERN && (
                      <PurposeAndPatternQuestion
                        question={question}
                        onSubmit={handleSubmit}
                      />
                    )}
                    {quizType === QUIZ_TYPES.ORDERING && (
                      <OrderingQuestion
                        question={question}
                        onSubmit={handleSubmit}
                      />
                    )}
                  </>
                )}
              </>
            ) : (
              <div className={`result-feedback ${result.isCorrect ? "correct" : "wrong"}`}>
                <div className="result-feedback-heading-row">
                  <span className="result-feedback-heading-spacer" aria-hidden="true" />
                  <h3>{result.isCorrect ? "정답!" : "오답"}</h3>
                  <div className="result-feedback-favorite">
                    <FavoriteStarButton
                      topicId={question.item._statsTopicId ?? topicId}
                      itemId={question.item.id}
                      variant="compact"
                    />
                    <span className="result-feedback-favorite-label">즐겨찾기</span>
                  </div>
                </div>
                {result.questionText && (
                  <div className="result-question">
                    <strong>문제:</strong> {result.questionText}
                  </div>
                )}
                {!result.isCorrect && result.userAnswer && (
                  <div className="user-answer">
                    <strong>내 답:</strong> {result.userAnswer}
                  </div>
                )}
                <div className="correct-answer">
                  <strong>정답:</strong> {result.correctAnswer}
                </div>
                {!result.isCorrect && result.correctAnswerExplanation && (
                  <div className="correct-answer-explanation">
                    <strong>해설:</strong> {result.correctAnswerExplanation}
                  </div>
                )}
                <button type="button" className="next-btn" onClick={handleNext}>
                  다음 문제
                </button>
              </div>
            )}
            </DrillPromptShell>
          </>
        )}
      </div>
    </div>
  );
}
