import { useState } from "react";
import { formatDisplayName } from "../utils/normalize";
import "./QuestionCard.css";

export default function FullListQuestion({ question, items, onSubmit }) {
  const [search, setSearch] = useState("");
  const mode = question.mode;
  const getDesc = (i) => i.examDescription || i.description;
  const listItems =
    mode === "name-from-desc"
      ? items.map((i) => formatDisplayName(i))
      : items.map(getDesc);

  const filtered = search.trim()
    ? listItems.filter((item) =>
        item.toLowerCase().includes(search.toLowerCase().trim())
      )
    : listItems;

  return (
    <div className="question-card full-list">
      <div className="question-prompt">
        <p className="question-text">{question.question}</p>
        <p className="question-hint">목록에서 정답을 선택하세요</p>
      </div>
      <div className="full-list-controls">
        <input
          type="text"
          placeholder="검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
      </div>
      <div className="full-list-scroll">
        {filtered.map((item, i) => (
          <button
            key={i}
            className="option-btn full-list-item"
            onClick={() => onSubmit(item)}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
