import { formatDisplayName } from "../utils/normalize";
import "./QuizStats.css";

/**
 * 무한 풀이(목차): 시도 횟수 기준 통계 + 최근 10문제. 틀린 것만 모드에서는 사용하지 않음.
 */
export default function QuizStats({
  history,
  items,
  totalCorrect = 0,
  totalWrong = 0,
}) {
  const totalAttempts = totalCorrect + totalWrong;
  const rate =
    totalAttempts > 0 ? ((totalCorrect / totalAttempts) * 100).toFixed(1) : "0";

  const hasCards = items?.length > 0;
  const hasHistory = history?.length > 0;
  if (!hasCards && !hasHistory) return null;

  return (
    <div className="quiz-stats">
      {hasCards && (
        <div className="stats-cards">
          <div className="stat-card">
            <span className="stat-value">{totalCorrect}</span>
            <span className="stat-label">맞은 개수</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{totalWrong}</span>
            <span className="stat-label">틀린 개수</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{totalAttempts}</span>
            <span className="stat-label">총 시도</span>
          </div>
          <div className="stat-card highlight">
            <span className="stat-value">{rate}%</span>
            <span className="stat-label">정답률</span>
          </div>
        </div>
      )}
      {hasHistory && (
        <div className="recent-history">
          <h4>최근 10문제</h4>
          <div className="history-dots">
            {history.slice(-10).map((h, i) => (
              <span
                key={i}
                className={`dot ${h.isCorrect ? "correct" : "wrong"}`}
                title={formatDisplayName(items?.find((it) => it.id === h.itemId)) || h.itemId}
              >
                {h.isCorrect ? "✓" : "✗"}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
