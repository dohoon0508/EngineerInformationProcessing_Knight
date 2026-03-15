import { useState } from "react";
import { formatDisplayName } from "../utils/normalize";
import "./QuestionCard.css";

export default function FullListQuestion({ question, items, onSubmit, getOptionLabel }) {
  const [search, setSearch] = useState("");
  const label = getOptionLabel ?? formatDisplayName;

  const filteredItems = search.trim()
    ? items.filter((item) =>
        label(item).toLowerCase().includes(search.trim().toLowerCase())
      )
    : items;

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
        {filteredItems.map((item) => (
          <button
            key={item.id}
            className="option-btn full-list-item"
            onClick={() => onSubmit(label(item))}
          >
            {label(item)}
          </button>
        ))}
      </div>
    </div>
  );
}
