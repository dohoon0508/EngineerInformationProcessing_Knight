import { useState } from "react";
import { formatDisplayName } from "../utils/normalize";
import "./QuestionCard.css";

export default function OrderingQuestion({ question, onSubmit }) {
  const [input, setInput] = useState("");
  const list = question.list || [];
  const example =
    list.length >= 4 ? "1-3-4-2" : list.length === 3 ? "1-3-2" : list.length === 2 ? "1-2" : "1-2-3-4";

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (input.trim()) {
      onSubmit(input.trim());
    }
  };

  return (
    <div className="question-card">
      <div className="question-prompt">
        <p className="question-text">{question.question}</p>
        <p className="question-hint">강한 순서 → 약한 순서로 번호를 입력하세요</p>
        <p className="question-hint answer-example">답안 예시: {example}</p>
      </div>
      <ul className="ordering-list">
        {list.map((it) => (
          <li key={it.id}>
            <span className="ordering-num">{it.displayNum}.</span> {formatDisplayName(it)}
          </li>
        ))}
      </ul>
      <form onSubmit={handleSubmit} className="answer-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="예: 1-3-4-2 또는 1 3 4 2"
          autoFocus
        />
        <button type="submit" className="submit-btn" disabled={!input.trim()}>
          확인
        </button>
      </form>
    </div>
  );
}
