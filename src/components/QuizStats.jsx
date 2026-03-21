import { formatDisplayName } from "../utils/normalize";
import "./QuizStats.css";

export default function QuizStats({
  totalCorrect,
  totalWrong,
  history,
  items,
}) {
  const total = totalCorrect + totalWrong;
  const rate = total > 0 ? ((totalCorrect / total) * 100).toFixed(1) : "0";

  return (
    <div className="quiz-stats">
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
          <span className="stat-value">{total}</span>
          <span className="stat-label">총 시도</span>
        </div>
        <div className="stat-card highlight">
          <span className="stat-value">{rate}%</span>
          <span className="stat-label">정답률</span>
        </div>
      </div>
      {history?.length > 0 && (
        <div className="recent-history">
          <h4>최근 10문제</h4>
          <div className="history-dots">
            {history.slice(-10).map((h, i) => (
              <span
                key={i}
                className={`dot ${h.isCorrect ? "correct" : "wrong"}`}
                title={
                  formatDisplayName(items?.find((it) => it.id === h.itemId)) || h.itemId
                }
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
