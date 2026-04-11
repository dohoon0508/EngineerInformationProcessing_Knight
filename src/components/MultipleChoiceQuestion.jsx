import "./QuestionCard.css";

export default function MultipleChoiceQuestion({ question, onSubmit }) {
  return (
    <div className="question-card">
      <div className="question-prompt">
        {question?.questionGroup && (
          <p className="question-group-badge">{question.questionGroup}</p>
        )}
        <p className="question-text">{question.question}</p>
        {question.supplementText ? (
          <p className="question-supplement">{question.supplementText}</p>
        ) : null}
        <p className="question-hint">{question.hint ?? "정답을 선택하세요"}</p>
      </div>
      <div className="options-grid">
        {question.options?.map((opt, i) => (
          <button
            key={i}
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
