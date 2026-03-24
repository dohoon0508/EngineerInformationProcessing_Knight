import { useState, useMemo, useRef, useEffect } from "react";
import { topics } from "../data/topics";
import { searchItems, resolveListRowItemId } from "../utils/searchIndex";
import { useFavorites } from "../context/FavoritesContext";
import {
  ALL_FAVORITES_TOPIC_ID,
  buildAllFavoritesTopic,
  itemIdsForTopicFavorites,
} from "../utils/favoritesTopic";
import TopicListModal from "./TopicListModal";
import QuizModeModal from "./QuizModeModal";
import "./HomePage.css";

export default function HomePage() {
  const { favoriteKeys } = useFavorites();
  const allFavCount = favoriteKeys.size;
  const [listTopicId, setListTopicId] = useState(null);
  const [highlightRowItemId, setHighlightRowItemId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchWrapRef = useRef(null);
  /** @type {null | { type: 'topic' | 'allFavorites', topicId?: string, favoritesOnly: boolean }} */
  const [quizModeModal, setQuizModeModal] = useState(null);
  const listTopic = useMemo(() => {
    if (listTopicId === ALL_FAVORITES_TOPIC_ID) return buildAllFavoritesTopic(favoriteKeys);
    return topics.find((t) => t.id === listTopicId);
  }, [listTopicId, favoriteKeys]);

  function closeListModal() {
    setListTopicId(null);
    setHighlightRowItemId(null);
  }

  const searchResults = useMemo(
    () => (searchQuery.trim().length >= 1 ? searchItems(searchQuery) : []),
    [searchQuery]
  );

  useEffect(() => {
    function onDocClick(e) {
      if (!searchWrapRef.current?.contains(e.target)) setSearchOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setSearchQuery("");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="home-page">
      <div className="home-search-corner" ref={searchWrapRef}>
        <label className="home-search-label screen-reader-only" htmlFor="home-global-search">
          항목 검색
        </label>
        <input
          id="home-global-search"
          type="search"
          className="home-search-input home-search-input--compact"
          placeholder="검색…"
          title="용어·설명 검색 (띄어쓰기로 AND)"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSearchOpen(true);
          }}
          onFocus={() => setSearchOpen(true)}
          autoComplete="off"
          enterKeyHint="search"
        />
        {searchOpen && searchQuery.trim().length >= 1 && (
          <div className="home-search-results" role="listbox" aria-label="검색 결과">
            {searchResults.length === 0 ? (
              <p className="home-search-empty">일치하는 항목이 없습니다.</p>
            ) : (
              <ul className="home-search-list">
                {searchResults.map((row) => (
                  <li key={`${row.topicId}-${row.itemId}`}>
                    <button
                      type="button"
                      className="home-search-hit"
                      onClick={() => {
                        setListTopicId(row.topicId);
                        setHighlightRowItemId(resolveListRowItemId(row.itemId));
                        setSearchOpen(false);
                        setSearchQuery("");
                      }}
                    >
                      <span className="home-search-topic">{row.topicTitle}</span>
                      <span className="home-search-name">{row.displayName}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      <header className="home-header">
        <h1>정보처리기사 암기 퀴즈</h1>
        <p>목차를 선택하고 퀴즈를 시작하세요</p>
      </header>
      <div className="home-favorites-bar">
        {allFavCount > 0 ? (
          <div className="home-all-favorites-panel">
            <button
              type="button"
              className="home-all-favorites-link"
              onClick={() => {
                setHighlightRowItemId(null);
                setListTopicId(ALL_FAVORITES_TOPIC_ID);
              }}
            >
              ★ 즐겨찾기 <span className="home-all-favorites-count">({allFavCount})</span>
            </button>
            <button
              type="button"
              className="home-all-favorites-quiz-btn"
              onClick={() => setQuizModeModal({ type: "allFavorites", favoritesOnly: true })}
            >
              즐겨찾기만 풀기
            </button>
          </div>
        ) : (
          <div className="home-all-favorites-panel">
            <span className="home-all-favorites-link home-all-favorites-link--disabled" title="출제 목록 등에서 ★를 눌러 추가하세요">
              ★ 즐겨찾기 (0)
            </span>
            <span className="home-all-favorites-quiz-btn home-all-favorites-quiz-btn--disabled">
              즐겨찾기만 풀기
            </span>
          </div>
        )}
      </div>
      <div className="topic-grid">
        {topics.map((topic) => {
          const topicFavCount = itemIdsForTopicFavorites(favoriteKeys, topic.id).size;
          return (
            <div key={topic.id} className="topic-card">
              <h2>{topic.title}</h2>
              <span className="topic-count">{topic.items.length}개 항목</span>
              <div className="topic-card-actions">
                <button
                  type="button"
                  className="topic-list-btn"
                  onClick={() => {
                    setHighlightRowItemId(null);
                    setListTopicId(topic.id);
                  }}
                >
                  출제 목록
                </button>
                <button
                  type="button"
                  className="topic-quiz-link"
                  onClick={() =>
                    setQuizModeModal({ type: "topic", topicId: topic.id, favoritesOnly: false })
                  }
                >
                  퀴즈 시작
                </button>
                {topicFavCount > 0 && (
                  <button
                    type="button"
                    className="topic-favorites-quiz-link"
                    onClick={() =>
                      setQuizModeModal({ type: "topic", topicId: topic.id, favoritesOnly: true })
                    }
                  >
                    즐겨찾기만
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {listTopic && (
        <TopicListModal
          topic={listTopic}
          highlightRowItemId={highlightRowItemId}
          onClose={closeListModal}
        />
      )}
      <QuizModeModal modal={quizModeModal} onClose={() => setQuizModeModal(null)} />
      <footer className="home-footer">
        <p className="home-footer-made">만든이 (HWANG DOHOON)</p>
        <p className="home-footer-links">
          <a href="https://velog.io/@dohoon0508" target="_blank" rel="noopener noreferrer">개발일지</a>
          {" · "}
          추가 기능·버그 발견 문의:{" "}
          <a href="https://www.instagram.com/dohoon_i/" target="_blank" rel="noopener noreferrer">
            Instagram @dohoon_i
          </a>
        </p>
      </footer>
    </div>
  );
}
