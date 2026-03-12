import { useState } from "react";
import { PURPOSES } from "../utils/quizEngine";
import "./QuestionCard.css";

export default function PurposeAndSubjectiveQuestion({ question, onSubmit }) {
  const [purpose, setPurpose] = useState("");
  const [patternInput, setPatternInput] = useState("");

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (purpose && patternInput.trim()) {
      onSubmit({ purpose, pattern: patternInput.trim() });
    }
  };

  return (
    <div className="question-card">
      <div className="question-prompt">
        <p className="question-text">{question.question}</p>
        <p className="question-hint">목적과 패턴명을 모두 입력하세요</p>
      </div>
      <div className="purpose-pattern-form">
        <div className="purpose-section">
          <strong>1. 목적:</strong>
          <div className="options-grid purpose-options">
            {PURPOSES.map((opt) => (
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
          <strong>2. 패턴명:</strong>
          <form onSubmit={handleSubmit} className="answer-form">
            <input
              type="text"
              value={patternInput}
              onChange={(e) => setPatternInput(e.target.value)}
              placeholder="패턴명 입력 (한국어 또는 영어)"
              autoFocus
            />
            <button
              type="submit"
              className="submit-btn"
              disabled={!purpose || !patternInput.trim()}
            >
              확인
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
