import { useState } from "react";
import { PURPOSES } from "../utils/quizEngine";
import "./QuestionCard.css";

export default function PurposeAndSubjectiveQuestion({ question, onSubmit }) {
  const [purpose, setPurpose] = useState("");
  const [patternInput, setPatternInput] = useState("");
  const purposeOptions = question.purposeOptions ?? PURPOSES;
  const firstLabel = question.firstPurposeLabel ?? "목적";
  const secondLabel = question.patternInputLabel ?? "패턴명";
  const hintText =
    question.purposeOptions != null
      ? "분류를 선택하고 알고리즘명을 입력하세요"
      : "목적을 선택하고 패턴명을 입력하세요";

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
        <p className="question-hint">{hintText}</p>
      </div>
      <div className="purpose-pattern-form">
        <div className="purpose-section">
          <strong>1. {firstLabel}:</strong>
          <div className="options-grid purpose-options">
            {purposeOptions.map((opt) => (
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
          <strong>2. {secondLabel}:</strong>
          <form onSubmit={handleSubmit} className="answer-form">
            <input
              type="text"
              value={patternInput}
              onChange={(e) => setPatternInput(e.target.value)}
              placeholder={
                question.purposeOptions != null
                  ? "알고리즘명 입력 (한국어 또는 영어)"
                  : "패턴명 입력 (한국어 또는 영어)"
              }
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
