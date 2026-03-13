import { formatDisplayName } from "../utils/normalize";
import "./TopicListModal.css";

export default function TopicListModal({ topic, onClose }) {
  if (!topic) return null;

  const isServiceAttacks = topic.id === "service-attacks";
  const isDesignPatterns = topic.id === "design-patterns";
  const isCrypto = topic.id === "software-security-crypto";
  const isCouplingCohesion = topic.id === "coupling-cohesion";

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
      const groups = [];
      topic.items.forEach((item) => {
        if (groups.length > 0 && groups[groups.length - 1].purpose === item.purpose) {
          groups[groups.length - 1].items.push(item);
        } else {
          groups.push({ purpose: item.purpose, items: [item] });
        }
      });
      let rowNum = 0;
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
            {groups.map((group) =>
              group.items.map((item, i) => {
                rowNum += 1;
                return (
                  <tr key={item.id}>
                    <td>{rowNum}</td>
                    {i === 0 && (
                      <td rowSpan={group.items.length} className="topic-list-purpose-cell">
                        {group.purpose}
                      </td>
                    )}
                    <td>{formatDisplayName(item)}</td>
                    <td className="topic-list-desc">{item.examDescription}</td>
                  </tr>
                );
              })
            )}
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

    if (isCouplingCohesion) {
      const groupInfo = topic.groupInfo || {};
      const order = ["응집도", "결합도"];
      return (
        <div className="topic-list-coupling-cohesion">
          {order.map((groupKey) => {
            const info = groupInfo[groupKey] || {};
            const groupItems = topic.items
              .filter((i) => i.group === groupKey)
              .sort((a, b) => (a.orderRank || 0) - (b.orderRank || 0));
            return (
              <section key={groupKey} className="topic-list-group-section">
                <h3 className="topic-list-group-title">{groupKey}</h3>
                {info.description && (
                  <p className="topic-list-group-desc">{info.description}</p>
                )}
                {(info.orderLabel != null || info.orderText != null) && (
                  <p className="topic-list-group-order">
                    <strong>
                      {info.orderLabel != null ? (
                        <>
                          {info.orderLabel}
                          <br />
                          {info.orderText}
                        </>
                      ) : (
                        <>순서 (강함 → 약함): {info.orderText}</>
                      )}
                    </strong>
                  </p>
                )}
                <table className="topic-list-table">
                  <thead>
                    <tr>
                      <th>번호</th>
                      <th>항목명</th>
                      <th>설명</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupItems.map((item, i) => (
                      <tr key={item.id}>
                        <td>{i + 1}</td>
                        <td>{formatDisplayName(item)}</td>
                        <td className="topic-list-desc">{item.examDescription}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            );
          })}
        </div>
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
