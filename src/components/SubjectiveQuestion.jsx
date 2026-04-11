import { useState } from "react";
import "./QuestionCard.css";

export default function SubjectiveQuestion({ question, onSubmit, hint }) {
  const [input, setInput] = useState("");
  const questionGroup = question?.questionGroup;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) {
      onSubmit(input.trim());
    }
  };

  const defaultHint = "이름을 입력하세요 (한국어 또는 영어 모두 가능)";

  return (
    <div className="question-card">
      <div className="question-prompt">
        {questionGroup && <p className="question-group-badge">{questionGroup}</p>}
        <p className="question-text">{question.question}</p>
        {question.supplementText ? (
          <p className="question-supplement">{question.supplementText}</p>
        ) : null}
        <p className="question-hint">{hint ?? defaultHint}</p>
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
