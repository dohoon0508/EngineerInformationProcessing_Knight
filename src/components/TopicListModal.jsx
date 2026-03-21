import { useEffect, useRef } from "react";
import { formatDisplayName } from "../utils/normalize";
import FavoriteStarButton from "./FavoriteStarButton";
import "./TopicListModal.css";

function FavTh() {
  return <th className="topic-list-fav-col" scope="col" aria-label="즐겨찾기" />;
}

function FavTd({ topicId, itemId }) {
  return (
    <td className="topic-list-fav-cell">
      <FavoriteStarButton topicId={topicId} itemId={itemId} variant="compact" />
    </td>
  );
}

/** 출제 목록 행/섹션에 검색 하이라이트·스크롤용 */
function trListRowProps(itemId, highlightRowItemId) {
  const isHl =
    highlightRowItemId != null && String(highlightRowItemId) === String(itemId);
  return {
    "data-topic-list-row": itemId,
    ...(isHl ? { className: "topic-list-row-highlight" } : {}),
  };
}

export default function TopicListModal({ topic, onClose, highlightRowItemId = null }) {
  const bodyRef = useRef(null);

  useEffect(() => {
    if (!highlightRowItemId || !bodyRef.current) return;
    const id = String(highlightRowItemId);
    const safe = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(id) : id.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const el = bodyRef.current.querySelector(`[data-topic-list-row="${safe}"]`);
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      });
    }
  }, [highlightRowItemId, topic?.id]);

  if (!topic) return null;

  const isServiceAttacks = topic.id === "service-attacks";
  const isDesignPatterns = topic.id === "design-patterns";
  const isCrypto = topic.id === "software-security-crypto";
  const isCouplingCohesion = topic.id === "coupling-cohesion";
  const isLinuxCommands = topic.id === "linux-commands";
  const isDatabase = topic.id === "database";
  const isNetwork = topic.id === "network";
  const isMisc = topic.id === "misc";
  const isTestingTypes = topic.id === "testing-types";

  const renderTable = () => {
    if (isTestingTypes) {
      const normal = topic.items.filter((i) => i.interactiveType !== "matching");
      const matching = topic.items.filter((i) => i.interactiveType === "matching");
      const pairOrder = ["요구사항", "분석", "설계", "구현"];
      const wbKeys = ["화이트박스 검사", "블랙박스 검사"];
      const rest = normal.filter(
        (i) => i.group !== "화이트박스 검사" && i.group !== "블랙박스 검사"
      );
      const noSub = rest.filter((i) => !i.subcategory);
      const subKeys = [...new Set(rest.map((i) => i.subcategory).filter(Boolean))];
      const subOrderPref = ["통합 테스트 보조 도구"];
      const orderedSubs = [
        ...subOrderPref.filter((s) => subKeys.includes(s)),
        ...subKeys.filter((s) => !subOrderPref.includes(s)),
      ];
      return (
        <div className="topic-list-coupling-cohesion">
          {noSub.length > 0 && (
            <section className="topic-list-group-section">
              <h3 className="topic-list-group-title">테스트 개념</h3>
              <table className="topic-list-table">
                <thead>
                  <tr>
                    <FavTh />
                    <th>subcategory</th>
                    <th>이름</th>
                    <th>설명</th>
                  </tr>
                </thead>
                <tbody>
                  {noSub.map((item) => (
                    <tr key={item.id} {...trListRowProps(item.id, highlightRowItemId)}>
                      <FavTd topicId={topic.id} itemId={item.id} />
                      <td>—</td>
                      <td>{formatDisplayName(item)}</td>
                      <td className="topic-list-desc">{item.examDescription}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
          {orderedSubs.map((sub) => {
            const groupItems = rest.filter((i) => i.subcategory === sub);
            return (
              <section key={sub} className="topic-list-group-section">
                <h3 className="topic-list-group-title">{sub}</h3>
                <table className="topic-list-table">
                  <thead>
                    <tr>
                      <FavTh />
                      <th>subcategory</th>
                      <th>이름</th>
                      <th>설명</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupItems.map((item) => (
                      <tr key={item.id} {...trListRowProps(item.id, highlightRowItemId)}>
                        <FavTd topicId={topic.id} itemId={item.id} />
                        <td>{item.subcategory}</td>
                        <td>{formatDisplayName(item)}</td>
                        <td className="topic-list-desc">{item.examDescription}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            );
          })}
          {wbKeys.map((wbGroup) => {
            const groupItems = normal.filter((i) => i.group === wbGroup);
            if (!groupItems.length) return null;
            return (
              <section key={wbGroup} className="topic-list-group-section">
                <h3 className="topic-list-group-title">{wbGroup}</h3>
                <table className="topic-list-table">
                  <thead>
                    <tr>
                      <FavTh />
                      <th>번호</th>
                      <th>기법명</th>
                      <th>설명</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupItems.map((item, i) => (
                      <tr key={item.id} {...trListRowProps(item.id, highlightRowItemId)}>
                        <FavTd topicId={topic.id} itemId={item.id} />
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
          {matching.map((m) => (
            <section
              key={m.id}
              className={`topic-list-group-section${
                highlightRowItemId != null && String(highlightRowItemId) === String(m.id)
                  ? " topic-list-row-highlight"
                  : ""
              }`}
              data-topic-list-row={m.id}
            >
              <h3 className="topic-list-group-title">
                <FavoriteStarButton topicId={topic.id} itemId={m.id} variant="compact" /> {m.nameKo}
              </h3>
              <p className="topic-list-desc topic-list-vmodel-intro">{m.examDescription}</p>
              <ul className="topic-list-vmodel-pairs">
                {pairOrder.map((k) =>
                  m.correctPairs?.[k] ? (
                    <li key={k}>
                      <strong>{k}</strong> ↔ {m.correctPairs[k]}
                    </li>
                  ) : null
                )}
              </ul>
            </section>
          ))}
        </div>
      );
    }

    if (isLinuxCommands) {
      return (
        <table className="topic-list-table">
          <thead>
            <tr>
              <FavTh />
              <th>명령어</th>
              <th>설명</th>
            </tr>
          </thead>
          <tbody>
            {topic.items.map((item) => (
              <tr key={item.id} {...trListRowProps(item.id, highlightRowItemId)}>
                <FavTd topicId={topic.id} itemId={item.id} />
                <td>{item.nameKo}</td>
                <td className="topic-list-desc">{item.examDescription}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (isNetwork) {
      const groupOrder = ["라우팅 프로토콜", "주소 변환"];
      const groupKeys = [...new Set(topic.items.map((i) => i.group).filter(Boolean))];
      const orderedGroups = [
        ...groupOrder.filter((k) => groupKeys.includes(k)),
        ...groupKeys.filter((k) => !groupOrder.includes(k)),
      ];
      const noGroup = topic.items.filter((i) => !i.group);
      return (
        <div className="topic-list-coupling-cohesion">
          {orderedGroups.map((groupKey) => {
            const groupItems = topic.items.filter((i) => i.group === groupKey);
            return (
              <section key={groupKey} className="topic-list-group-section">
                <h3 className="topic-list-group-title">{groupKey}</h3>
                <table className="topic-list-table">
                  <thead>
                    <tr>
                      <FavTh />
                      <th>group</th>
                      <th>이름</th>
                      <th>설명</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupItems.map((item) => (
                      <tr key={item.id} {...trListRowProps(item.id, highlightRowItemId)}>
                        <FavTd topicId={topic.id} itemId={item.id} />
                        <td>{item.group}</td>
                        <td>{formatDisplayName(item)}</td>
                        <td className="topic-list-desc">{item.examDescription}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            );
          })}
          {noGroup.length > 0 && (
            <section className="topic-list-group-section">
              <h3 className="topic-list-group-title">기타 네트워크 개념</h3>
              <table className="topic-list-table">
                <thead>
                  <tr>
                    <FavTh />
                    <th>group</th>
                    <th>이름</th>
                    <th>설명</th>
                  </tr>
                </thead>
                <tbody>
                  {noGroup.map((item) => (
                    <tr key={item.id} {...trListRowProps(item.id, highlightRowItemId)}>
                      <FavTd topicId={topic.id} itemId={item.id} />
                      <td>—</td>
                      <td>{formatDisplayName(item)}</td>
                      <td className="topic-list-desc">{item.examDescription}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      );
    }

    if (isMisc) {
      const subOrderPref = ["IT·플랫폼·최신 기술", "SOLID (객체지향 설계 원칙)"];
      const withSub = topic.items.filter((i) => i.subcategory);
      const withoutSub = topic.items.filter((i) => !i.subcategory);
      const subKeys = [...new Set(withSub.map((i) => i.subcategory).filter(Boolean))];
      const orderedSubs = [
        ...subOrderPref.filter((s) => subKeys.includes(s)),
        ...subKeys.filter((s) => !subOrderPref.includes(s)),
      ];

      const renderMiscTableRows = (list) =>
        list.map((item) => (
          <tr key={item.id} {...trListRowProps(item.id, highlightRowItemId)}>
            <FavTd topicId={topic.id} itemId={item.id} />
            <td className="topic-list-misc-name">{formatDisplayName(item)}</td>
            <td className="topic-list-desc topic-list-misc-desc-cell">
              <div className="topic-list-main-desc">{item.examDescription}</div>
              {item.details?.length > 0 && (
                <ul className="topic-list-details">
                  {item.details.map((d, j) => (
                    <li key={j} className="topic-list-detail-item">
                      <span className="topic-list-detail-title">
                        {d.nameKo}
                        {d.nameEn && d.nameEn !== d.nameKo ? ` (${d.nameEn})` : ""}
                      </span>
                      <span className="topic-list-detail-text">: {d.description}</span>
                    </li>
                  ))}
                </ul>
              )}
            </td>
          </tr>
        ));

      return (
        <div className="topic-list-misc-wrap topic-list-coupling-cohesion">
          {withoutSub.length > 0 && (
            <section className="topic-list-group-section">
              <h3 className="topic-list-group-title">일반</h3>
              <table className="topic-list-table topic-list-misc-table">
                <thead>
                  <tr>
                    <FavTh />
                    <th>이름</th>
                    <th>설명</th>
                  </tr>
                </thead>
                <tbody>{renderMiscTableRows(withoutSub)}</tbody>
              </table>
            </section>
          )}
          {orderedSubs.map((sub) => {
            const groupItems = withSub.filter((i) => i.subcategory === sub);
            return (
              <section key={sub} className="topic-list-group-section">
                <h3 className="topic-list-group-title">{sub}</h3>
                <table className="topic-list-table topic-list-misc-table">
                  <thead>
                    <tr>
                      <FavTh />
                      <th>이름</th>
                      <th>설명</th>
                    </tr>
                  </thead>
                  <tbody>{renderMiscTableRows(groupItems)}</tbody>
                </table>
              </section>
            );
          })}
        </div>
      );
    }

    if (isServiceAttacks) {
      return (
        <table className="topic-list-table">
          <thead>
            <tr>
              <FavTh />
              <th>번호</th>
              <th>유형명 (한국어)</th>
              <th>유형명 (영문)</th>
              <th>설명</th>
            </tr>
          </thead>
          <tbody>
            {topic.items.map((item, i) => (
              <tr key={item.id} {...trListRowProps(item.id, highlightRowItemId)}>
                <FavTd topicId={topic.id} itemId={item.id} />
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
              <FavTh />
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
                  <tr key={item.id} {...trListRowProps(item.id, highlightRowItemId)}>
                    <FavTd topicId={topic.id} itemId={item.id} />
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
      const subcats = [...new Set(topic.items.map((i) => i.subcategory || i.category).filter(Boolean))];
      const order = [
        "HASH 알고리즘",
        "블록 암호화 알고리즘",
        "공개키 암호화 알고리즘",
        "인증 / 접근 제어",
        "접근통제",
        "보안 관리 체계",
        "터널링 / 네트워크 방식",
        "암호 / 보안 프로토콜",
        "보안 솔루션 / 기술",
        "기타 보안 개념",
      ];
      const ordered = order.filter((s) => subcats.includes(s));
      const rest = subcats.filter((s) => !order.includes(s));
      const displayOrder = [...ordered, ...rest];

      return (
        <div className="topic-list-coupling-cohesion">
          {displayOrder.map((sub) => {
            const groupItems = topic.items.filter((i) => (i.subcategory || i.category) === sub);
            return (
              <section key={sub} className="topic-list-group-section">
                <h3 className="topic-list-group-title">{sub}</h3>
                <table className="topic-list-table">
                  <thead>
                    <tr>
                      <FavTh />
                      <th>subcategory</th>
                      <th>이름</th>
                      <th>설명</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupItems.map((item) => (
                      <tr key={item.id} {...trListRowProps(item.id, highlightRowItemId)}>
                        <FavTd topicId={topic.id} itemId={item.id} />
                        <td>{item.subcategory ?? item.category ?? "—"}</td>
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

    if (isDatabase) {
      const groups = ["순수 관계 연산자", "집합 연산자", "이상", "함수적 종속", "관계해석", "무결성"];
      return (
        <div className="topic-list-coupling-cohesion">
          {groups.map((groupKey) => {
            const groupItems = topic.items.filter((i) => i.group === groupKey);
            if (!groupItems.length) return null;
            const showSymbol = groupKey === "순수 관계 연산자" || groupKey === "집합 연산자";
            return (
              <section key={groupKey} className="topic-list-group-section">
                <h3 className="topic-list-group-title">{groupKey}</h3>
                <table className="topic-list-table">
                  <thead>
                    <tr>
                      <FavTh />
                      <th>번호</th>
                      <th>이름</th>
                      {showSymbol && <th>기호</th>}
                      <th>설명</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupItems.map((item, i) => (
                      <tr key={item.id} {...trListRowProps(item.id, highlightRowItemId)}>
                        <FavTd topicId={topic.id} itemId={item.id} />
                        <td>{i + 1}</td>
                        <td>{formatDisplayName(item)}</td>
                        {showSymbol && <td>{item.symbol ?? "—"}</td>}
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
                      <FavTh />
                      <th>번호</th>
                      <th>항목명</th>
                      <th>설명</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupItems.map((item, i) => (
                      <tr key={item.id} {...trListRowProps(item.id, highlightRowItemId)}>
                        <FavTd topicId={topic.id} itemId={item.id} />
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
        <div className="topic-list-body" ref={bodyRef}>
          {renderTable()}
        </div>
      </div>
    </div>
  );
}
