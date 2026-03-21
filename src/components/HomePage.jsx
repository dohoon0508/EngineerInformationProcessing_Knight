import { useState, useMemo, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { topics } from "../data/topics";
import { useKakaoAuth } from "../context/KakaoAuthContext";
import { searchItems, resolveListRowItemId } from "../utils/searchIndex";
import TopicListModal from "./TopicListModal";
import "./HomePage.css";

export default function HomePage() {
  const { sdkReady, kakaoConfigured, user, login, logout } = useKakaoAuth();
  const [listTopicId, setListTopicId] = useState(null);
  const [highlightRowItemId, setHighlightRowItemId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchWrapRef = useRef(null);
  const listTopic = topics.find((t) => t.id === listTopicId);

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
      {kakaoConfigured && sdkReady && (
        <div className="home-auth-corner">
          {user ? (
            <div className="home-auth-user">
              {user.profileImage && (
                <img
                  src={user.profileImage}
                  alt=""
                  className="home-auth-avatar"
                  width={28}
                  height={28}
                />
              )}
              <span className="home-auth-nickname" title="카카오 로그인됨">
                {user.nickname}
              </span>
              <button type="button" className="home-auth-btn home-auth-btn--ghost" onClick={logout}>
                로그아웃
              </button>
            </div>
          ) : (
            <button type="button" className="home-auth-btn home-auth-btn--kakao" onClick={login}>
              카카오 로그인
            </button>
          )}
        </div>
      )}
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
      <div className="topic-grid">
        {topics.map((topic) => (
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
              <Link to={`/quiz/${topic.id}`} className="topic-quiz-link">
                퀴즈 시작
              </Link>
            </div>
          </div>
        ))}
      </div>
      {listTopic && (
        <TopicListModal
          topic={listTopic}
          highlightRowItemId={highlightRowItemId}
          onClose={closeListModal}
        />
      )}
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
