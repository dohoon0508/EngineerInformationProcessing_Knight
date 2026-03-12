import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { topics } from "../data/topics";
import { getNextQuestion, QUIZ_TYPES, isDesignPatternTopic } from "../utils/quizEngine";
import { updateItemStats, loadStats, resetStats } from "../utils/storage";
import { checkNameAnswer, checkPurposeAnswer, formatDisplayName } from "../utils/normalize";
import QuizStats from "./QuizStats";
import SubjectiveQuestion from "./SubjectiveQuestion";
import MultipleChoiceQuestion from "./MultipleChoiceQuestion";
import FullListQuestion from "./FullListQuestion";
import PurposeOnlyQuestion from "./PurposeOnlyQuestion";
import PurposeAndPatternQuestion from "./PurposeAndPatternQuestion";
import PurposeAndSubjectiveQuestion from "./PurposeAndSubjectiveQuestion";
import "./QuizPage.css";

export default function QuizPage() {
  const { topicId } = useParams();
  const topic = topics.find((t) => t.id === topicId);
  const [quizType, setQuizType] = useState(QUIZ_TYPES.SUBJECTIVE);
  const [question, setQuestion] = useState(null);
  const [lastItemId, setLastItemId] = useState(null);
  const [stats, setStats] = useState(() => loadStats());
  const [result, setResult] = useState(null); // { isCorrect, userAnswer, correctAnswer }
  const [solveCount, setSolveCount] = useState(0);

  const loadNextQuestion = useCallback(() => {
    if (!topic) return;
    const q = getNextQuestion(topic, quizType, lastItemId);
    setQuestion(q);
    setResult(null);
    if (q) setLastItemId(q.item.id);
  }, [topic, quizType, lastItemId]);

  useEffect(() => {
    if (topic) loadNextQuestion();
  }, [topic, quizType]);

  useEffect(() => {
    if (topic && isDesignPatternTopic(topic)) {
      const valid = [QUIZ_TYPES.SUBJECTIVE, QUIZ_TYPES.PURPOSE_AND_PATTERN];
      if (!valid.includes(quizType)) setQuizType(QUIZ_TYPES.SUBJECTIVE);
    }
  }, [topic]);

  const handleSubmit = (userAnswer) => {
    if (!question || result) return;
    let isCorrect;
    if (quizType === QUIZ_TYPES.PURPOSE_ONLY) {
      isCorrect = checkPurposeAnswer(userAnswer, question.answer);
    } else if (quizType === QUIZ_TYPES.PURPOSE_AND_PATTERN) {
      const { purpose, pattern } = userAnswer;
      isCorrect =
        checkPurposeAnswer(purpose, question.answer.purpose) &&
        pattern === question.answer.pattern;
    } else if (quizType === QUIZ_TYPES.SUBJECTIVE && isDesignPatternTopic(topic)) {
      const { purpose, pattern } = userAnswer;
      isCorrect =
        checkPurposeAnswer(purpose, question.item.purpose) &&
        checkNameAnswer(pattern, question.item);
    } else if (quizType === QUIZ_TYPES.SUBJECTIVE) {
      isCorrect = checkNameAnswer(userAnswer, question.item);
    } else {
      isCorrect = userAnswer === question.answer;
    }

    updateItemStats(topicId, question.item.id, isCorrect);
    setStats(loadStats());
    const correctAnswer =
      quizType === QUIZ_TYPES.SUBJECTIVE && isDesignPatternTopic(topic)
        ? `${question.item.purpose} - ${formatDisplayName(question.item)}`
        : question.answerDisplay;

    setResult({
      isCorrect,
      userAnswer: typeof userAnswer === "object" ? `${userAnswer.purpose} - ${userAnswer.pattern}` : userAnswer,
      correctAnswer,
      questionText: question.question,
    });
    setSolveCount((c) => c + 1);
  };

  const handleNext = () => {
    loadNextQuestion();
  };

  const handleResetStats = () => {
    if (confirm("이 주제의 퀴즈 기록을 모두 초기화할까요?")) {
      resetStats(topicId);
      setStats(loadStats());
      setSolveCount(0);
      loadNextQuestion();
    }
  };

  if (!topic) {
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

  return (
    <div className="quiz-page">
      <header className="quiz-header">
        <Link to="/" className="home-link">
          ← 홈
        </Link>
        <h1>{topic.title}</h1>
      </header>

      <div className="quiz-controls">
        <div className="quiz-type-tabs">
          {(isDesignPatternTopic(topic)
            ? [
                { key: QUIZ_TYPES.SUBJECTIVE, label: "목적+패턴(주관식)" },
                { key: QUIZ_TYPES.PURPOSE_AND_PATTERN, label: "목적+패턴(객관식)" },
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
        <button className="reset-btn" onClick={handleResetStats}>
          기록 초기화
        </button>
      </div>

      <QuizStats
        totalCorrect={topicStats.totalCorrect}
        totalWrong={topicStats.totalWrong}
        solveCount={solveCount}
        history={topicStats.history || []}
        items={topic.items}
        itemStats={topicStats.items || {}}
      />

      <div className="question-area">
        {question && (
          <>
            <div className="solve-count">누적 풀이: {solveCount}문제 · {topic.title}</div>
            {!result ? (
              <>
                {quizType === QUIZ_TYPES.SUBJECTIVE && isDesignPatternTopic(topic) && (
                  <PurposeAndSubjectiveQuestion
                    question={question}
                    onSubmit={handleSubmit}
                  />
                )}
                {quizType === QUIZ_TYPES.SUBJECTIVE && !isDesignPatternTopic(topic) && (
                  <SubjectiveQuestion
                    question={question}
                    onSubmit={handleSubmit}
                    hint="공격 유형 이름을 입력하세요 (한국어 또는 영어 모두 가능)"
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
                    items={topic.items}
                    onSubmit={handleSubmit}
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
                <button className="next-btn" onClick={handleNext}>
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
