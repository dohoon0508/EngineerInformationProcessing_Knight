import { useState } from "react";
import "./QuestionCard.css";

export default function PurposeAndPatternQuestion({ question, onSubmit }) {
  const [purpose, setPurpose] = useState("");
  const [pattern, setPattern] = useState("");

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (purpose && pattern) {
      onSubmit({ purpose, pattern });
    }
  };

  return (
    <div className="question-card">
      <div className="question-prompt">
        <p className="question-text">{question.question}</p>
        <p className="question-hint">{question.firstLabel ? "분류와 알고리즘명을 모두 선택하세요" : "목적과 패턴명을 모두 선택하세요"}</p>
      </div>
      <div className="purpose-pattern-form">
        <div className="purpose-section">
          <strong>1. {question.firstLabel ?? "목적"}:</strong>
          <div className="options-grid purpose-options">
            {question.purposeOptions?.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`option-btn ${purpose === opt ? "active" : ""}`}
                onClick={() => setPurpose(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        <div className="pattern-section">
          <strong>2. {question.secondLabel ?? "패턴명"}:</strong>
          <div className="options-grid">
            {question.patternOptions?.map((opt) => (
              <button
                key={opt}
                type="button"
                className={`option-btn ${pattern === opt ? "active" : ""}`}
                onClick={() => setPattern(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="submit-combined-btn"
          onClick={handleSubmit}
          disabled={!purpose || !pattern}
        >
          확인
        </button>
      </div>
    </div>
  );
}
