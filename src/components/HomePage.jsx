import { useState } from "react";
import { Link } from "react-router-dom";
import { topics } from "../data/topics";
import TopicListModal from "./TopicListModal";
import "./HomePage.css";

export default function HomePage() {
  const [listTopicId, setListTopicId] = useState(null);
  const listTopic = topics.find((t) => t.id === listTopicId);

  return (
    <div className="home-page">
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
                onClick={() => setListTopicId(topic.id)}
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
        <TopicListModal topic={listTopic} onClose={() => setListTopicId(null)} />
      )}
    </div>
  );
}
