import { Link } from "react-router-dom";
import { topics } from "../data/topics";
import "./HomePage.css";

export default function HomePage() {
  return (
    <div className="home-page">
      <header className="home-header">
        <h1>정보처리기사 암기 퀴즈</h1>
        <p>목차를 선택하고 퀴즈를 시작하세요</p>
      </header>
      <div className="topic-grid">
        {topics.map((topic) => (
          <Link
            key={topic.id}
            to={`/quiz/${topic.id}`}
            className="topic-card"
          >
            <h2>{topic.title}</h2>
            <span className="topic-count">{topic.items.length}개 항목</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
