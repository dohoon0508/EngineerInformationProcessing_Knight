import { useMemo } from "react";
import { Link } from "react-router-dom";
import { topics } from "../data/topics";
import { getTopicQuizPool, QUIZ_TYPES } from "../utils/quizEngine";
import { ALL_FAVORITES_TOPIC_ID, buildAllFavoritesTopic, itemIdsForTopicFavorites } from "../utils/favoritesTopic";
import { useFavorites } from "../context/FavoritesContext";
import "./QuizModeModal.css";

/**
 * @param {object} props
 * @param {null | { type: 'topic' | 'allFavorites', topicId?: string, favoritesOnly: boolean }} props.modal
 * @param {() => void} props.onClose
 */
export default function QuizModeModal({ modal, onClose }) {
  const { favoriteKeys } = useFavorites();

  const meta = useMemo(() => {
    if (!modal) return null;

    if (modal.type === "allFavorites") {
      const virtual = buildAllFavoritesTopic(favoriteKeys);
      const pool = virtual.items || [];
      const total = pool.length;
      return {
        title: "즐겨찾기",
        total,
        basePath: `/quiz/${ALL_FAVORITES_TOPIC_ID}`,
      };
    }

    const topic = topics.find((t) => t.id === modal.topicId);
    if (!topic) return null;
    let pool = getTopicQuizPool(topic, QUIZ_TYPES.SUBJECTIVE);
    if (modal.favoritesOnly) {
      const fav = itemIdsForTopicFavorites(favoriteKeys, topic.id);
      pool = pool.filter((i) => fav.has(i.id));
    }
    const total = pool.length;
    const q = modal.favoritesOnly ? "?favorites=1" : "";
    return {
      title: topic.title + (modal.favoritesOnly ? " · 즐겨찾기만" : ""),
      total,
      basePath: `/quiz/${topic.id}${q}`,
    };
  }, [modal, favoriteKeys]);

  if (!modal || !meta) return null;

  const { title, total, basePath } = meta;
  const suffixWrong = basePath.includes("?") ? "&mode=wrongDrill" : "?mode=wrongDrill";

  return (
    <div
      className="quiz-mode-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-mode-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="quiz-mode-modal" onClick={(e) => e.stopPropagation()}>
        <div className="quiz-mode-header">
          <h2 id="quiz-mode-title">문제 풀기</h2>
          <button type="button" className="quiz-mode-close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
        <p className="quiz-mode-subtitle">{title}</p>
        {total === 0 ? (
          <p className="quiz-mode-empty">주관식 출제할 항목이 없습니다.</p>
        ) : (
          <ul className="quiz-mode-list">
            <li>
              <Link className="quiz-mode-option" to={basePath} onClick={onClose}>
                <span className="quiz-mode-option-title">무한 문제 풀기</span>
                <span className="quiz-mode-option-desc">(통계 가중 출제 · 오답이 더 자주 나옴)</span>
              </Link>
            </li>
            <li>
              <Link
                className="quiz-mode-option quiz-mode-option--secondary"
                to={`${basePath}${suffixWrong}`}
                onClick={onClose}
              >
                <span className="quiz-mode-option-title">틀린 것만 풀기</span>
                <span className="quiz-mode-option-desc">
                  (주제에 따라 주관식·객관식 등 · 한 바퀴 후 오답만 반복 · 나가면 세션 초기화)
                </span>
              </Link>
            </li>
          </ul>
        )}
        <p className="quiz-mode-footnote">
          「무한」은 누적 풀이 통계를 반영해 오답·미숙련 문항이 더 자주 나오며, 기록은 그대로 유지됩니다. 「틀린 것만」은 주제별로 주관식·객관식 등이 정해져 한 바퀴 돌린 뒤 틀린 문항만 다시 출제하며, 화면을 나갔다 들어오면 진행이 처음부터입니다.
        </p>
      </div>
    </div>
  );
}
