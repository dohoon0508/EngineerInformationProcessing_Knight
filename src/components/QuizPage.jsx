import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { topics } from "../data/topics";
import { useFavorites } from "../context/FavoritesContext";
import {
  ALL_FAVORITES_TOPIC_ID,
  buildAllFavoritesTopic,
  itemIdsForTopicFavorites,
} from "../utils/favoritesTopic";
import {
  getNextQuestion,
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
import "./QuizPage.css";

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
  return topic.items;
}

function getDatabaseFullListLabel(question) {
  const g = question?.item?.group;
  if (g === "순수 관계 연산자" || g === "집합 연산자") return (item) => item.symbol;
  if (g === "이상") return (item) => item.nameKo;
  return formatDisplayName;
}

function QuizPageAuthHint() {
  const { user, kakaoConfigured } = useKakaoAuth();
  if (!kakaoConfigured) return null;
  if (!user) {
    return (
      <p className="quiz-auth-hint">
        비로그인 — 기록은 이 브라우저에만 저장됩니다. 홈에서 카카오 로그인 시 계정별로 이어집니다.
      </p>
    );
  }
  return (
    <p className="quiz-auth-hint quiz-auth-hint--ok">
      <span className="quiz-auth-name">{user.nickname}</span> 님 기록으로 풀이 중
      {import.meta.env.VITE_ENABLE_CLOUD_SYNC === "true" && " · 클라우드 동기화 켜짐"}
    </p>
  );
}

export default function QuizPage() {
  const { topicId } = useParams();
  const [searchParams] = useSearchParams();
  const favoritesOnly = searchParams.get("favorites") === "1";
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

  /** 해설(정답/오답) 표시 중 — 즐겨찾기 토글 시 출제 effect가 돌면 안 됨 */
  const viewingResultRef = useRef(false);
  useEffect(() => {
    viewingResultRef.current = result != null;
  }, [result]);

  const quizRenderTopic = useMemo(() => {
    if (!isAllFavoritesRoute || !question?.item?._statsTopicId) return topic;
    return topics.find((t) => t.id === question.item._statsTopicId) ?? topic;
  }, [isAllFavoritesRoute, question, topic]);

  /** 전체 즐겨찾기 모드는 주관식만 */
  useEffect(() => {
    if (isAllFavoritesRoute) {
      setQuizType(QUIZ_TYPES.SUBJECTIVE);
    }
  }, [isAllFavoritesRoute]);

  const loadNextQuestion = useCallback(() => {
    if (!topic) return;
    const latest = loadStats(kakaoUserId);
    const q = getNextQuestion(topic, quizType, lastItemId, latest, nextQuestionOpts);
    setQuestion(q);
    setResult(null);
    if (q) setLastItemId(q.item.id);
    setStats(latest);
  }, [topic, quizType, lastItemId, kakaoUserId, nextQuestionOpts]);

  /** 주제·유형·로그인·출제 옵션·즐겨찾기 변경 시 새로 출제 (해설 화면에서는 동일 문항 유지) */
  useEffect(() => {
    if (!topic) return;
    if (viewingResultRef.current) return;
    const latest = loadStats(kakaoUserId);
    const q = getNextQuestion(topic, quizType, null, latest, nextQuestionOpts);
    setQuestion(q);
    setResult(null);
    if (q) setLastItemId(q.item.id);
    setStats(latest);
  }, [topic, quizType, kakaoUserId, nextQuestionOpts, favoriteKeys]);

  /** 카카오 로그인 후 클라우드에서 통계를 받아오면 통계 UI 갱신 */
  useEffect(() => {
    function onStatsMerged() {
      setStats(loadStats(kakaoUserId));
    }
    window.addEventListener("quiz-stats-storage-changed", onStatsMerged);
    return () => window.removeEventListener("quiz-stats-storage-changed", onStatsMerged);
  }, [kakaoUserId]);

  useEffect(() => {
    if (!topic || topic.id === ALL_FAVORITES_TOPIC_ID) return;
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
  }, [topic, quizType]);

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
    setStats(loadStats(kakaoUserId));
    const correctAnswer =
      quizType === QUIZ_TYPES.SUBJECTIVE && isDesignPatternTopic(sourceTopic)
        ? `${question.item.purpose} - ${formatDisplayName(question.item)}`
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
    loadNextQuestion();
  };

  const handleResetStats = () => {
    if (isAllFavoritesRoute) return;
    if (confirm("이 주제의 퀴즈 기록을 모두 초기화할까요?")) {
      resetStats(topicId, kakaoUserId);
      setStats(loadStats(kakaoUserId));
      setSolveCount(0);
      loadNextQuestion();
    }
  };

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

  return (
    <div className="quiz-page">
      <header className="quiz-header">
        <Link to="/" className="home-link">
          ← 홈
        </Link>
        <h1>{topic?.title ?? "퀴즈"}</h1>
        <QuizPageAuthHint />
      </header>

      {isAllFavoritesRoute && (
        <p className="quiz-favorites-mode-hint">주관식만 · 출제 통계는 각 목차에 반영됩니다.</p>
      )}
      {favoritesOnly && !isAllFavoritesRoute && (
        <p className="quiz-favorites-mode-hint">이 목차에서 ★ 즐겨찾기만 출제합니다.</p>
      )}

      <div className="quiz-controls">
        {!isAllFavoritesRoute && (
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

      {!isAllFavoritesRoute && (
        <QuizStats
          totalCorrect={topicStats.totalCorrect}
          totalWrong={topicStats.totalWrong}
          solveCount={solveCount}
          history={topicStats.history || []}
          items={statsDisplayItems}
          itemStats={topicStats.items || {}}
        />
      )}

      <div className="question-area">
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
        {!favoritesPoolEmpty && question && (
          <>
            <div
              className={`question-area-top-row${!result ? " question-area-top-row--solo" : ""}`}
            >
              <div className="solve-count">
                누적 풀이: {solveCount}문제 · {quizRenderTopic?.title ?? topic?.title}
              </div>
              {result && (
                <div className="result-favorite-row result-favorite-row--corner">
                  <FavoriteStarButton
                    topicId={question.item._statsTopicId ?? topicId}
                    itemId={question.item.id}
                    variant="compact"
                  />
                  <span className="result-favorite-label">이 문제 즐겨찾기</span>
                </div>
              )}
            </div>
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
                    {quizType === QUIZ_TYPES.SUBJECTIVE && isDesignPatternTopic(quizRenderTopic) && (
                      <PurposeAndSubjectiveQuestion
                        question={question}
                        onSubmit={handleSubmit}
                      />
                    )}
                    {quizType === QUIZ_TYPES.SUBJECTIVE && !isDesignPatternTopic(quizRenderTopic) && (
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
                <h3>{result.isCorrect ? "정답!" : "오답"}</h3>
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
          </>
        )}
      </div>
    </div>
  );
}
