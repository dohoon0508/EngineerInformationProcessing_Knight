import { formatDisplayName } from "../utils/normalize";
import "./TopicListModal.css";

export default function TopicListModal({ topic, onClose }) {
  if (!topic) return null;

  const isServiceAttacks = topic.id === "service-attacks";
  const isDesignPatterns = topic.id === "design-patterns";
  const isCrypto = topic.id === "software-security-crypto";

  const renderTable = () => {
    if (isServiceAttacks) {
      return (
        <table className="topic-list-table">
          <thead>
            <tr>
              <th>번호</th>
              <th>유형명 (한국어)</th>
              <th>유형명 (영문)</th>
              <th>설명</th>
            </tr>
          </thead>
          <tbody>
            {topic.items.map((item, i) => (
              <tr key={item.id}>
                <td>{i + 1}</td>
                <td>{item.nameKo}</td>
                <td>{item.nameEn ?? "-"}</td>
                <td className="topic-list-desc">{item.examDescription}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (isDesignPatterns) {
      return (
        <table className="topic-list-table">
          <thead>
            <tr>
              <th>번호</th>
              <th>목적</th>
              <th>패턴명</th>
              <th>설명</th>
            </tr>
          </thead>
          <tbody>
            {topic.items.map((item, i) => (
              <tr key={item.id}>
                <td>{i + 1}</td>
                <td>{item.purpose}</td>
                <td>{formatDisplayName(item)}</td>
                <td className="topic-list-desc">{item.examDescription}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (isCrypto) {
      return (
        <table className="topic-list-table">
          <thead>
            <tr>
              <th>번호</th>
              <th>분류</th>
              <th>알고리즘명</th>
              <th>설명</th>
            </tr>
          </thead>
          <tbody>
            {topic.items.map((item, i) => (
              <tr key={item.id}>
                <td>{i + 1}</td>
                <td>{item.category}</td>
                <td>{formatDisplayName(item)}</td>
                <td className="topic-list-desc">{item.examDescription}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    return (
      <p className="topic-list-placeholder">이 주제는 출제 목록 보기를 지원하지 않습니다.</p>
    );
  };

  return (
    <div className="topic-list-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="출제 목록">
      <div className="topic-list-modal" onClick={(e) => e.stopPropagation()}>
        <div className="topic-list-header">
          <h2>출제 목록 · {topic.title}</h2>
          <button type="button" className="topic-list-close" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </div>
        <div className="topic-list-body">
          {renderTable()}
        </div>
      </div>
    </div>
  );
}
