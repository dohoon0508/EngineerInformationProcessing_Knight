import "./QuestionCard.css";

export default function PurposeOnlyQuestion({ question, onSubmit }) {
  return (
    <div className="question-card">
      <div className="question-prompt">
        <p className="question-text">{question.question}</p>
        <p className="question-hint">{question.hint ?? "목적(생성 / 구조 / 행위)를 선택하세요"}</p>
      </div>
      <div className="options-grid purpose-options">
        {question.options?.map((opt) => (
          <button
            key={opt}
            className="option-btn"
            onClick={() => onSubmit(opt)}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
