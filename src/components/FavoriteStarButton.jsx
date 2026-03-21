import { useFavorites } from "../context/FavoritesContext.jsx";
import "./FavoriteStarButton.css";

/**
 * 즐겨찾기 토글 (별)
 * @param {string} topicId
 * @param {string} itemId
 * @param {'default'|'compact'} [variant]
 */
export default function FavoriteStarButton({ topicId, itemId, variant = "default", label = "즐겨찾기" }) {
  const { isFavorite, toggleFavorite, favoritesReady } = useFavorites();
  const on = isFavorite(topicId, itemId);

  return (
    <button
      type="button"
      className={`favorite-star-btn favorite-star-btn--${variant}${on ? " favorite-star-btn--on" : ""}`}
      aria-pressed={on}
      aria-label={on ? `${label} 해제` : `${label} 추가`}
      title={on ? "즐겨찾기 해제" : "즐겨찾기"}
      disabled={!favoritesReady}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggleFavorite(topicId, itemId);
      }}
    >
      <span className="favorite-star-icon" aria-hidden>
        {on ? "★" : "☆"}
      </span>
    </button>
  );
}
