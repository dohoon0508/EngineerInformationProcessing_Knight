import { useState } from "react";
import "./QuestionCard.css";

export default function SubjectiveQuestion({ question, onSubmit }) {
  const [input, setInput] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      onSubmit(input.trim());
    }
  };

  const hint =
    question.mode === "name-from-desc"
      ? "공격 유형 이름을 입력하세요 (한국어 또는 영어 모두 가능)"
      : "설명을 입력하세요 (핵심 키워드 포함)";

  return (
    <div className="question-card">
      <div className="question-prompt">
        <p className="question-text">{question.question}</p>
        <p className="question-hint">{hint}</p>
      </div>
      <form onSubmit={handleSubmit} className="answer-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="정답 입력..."
          autoFocus
          disabled={false}
        />
        <button type="submit">확인</button>
      </form>
    </div>
  );
}
