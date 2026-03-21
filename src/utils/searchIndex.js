import { topics } from "../data/topics";
import { expandMiscItems, isMiscTopic, isTestingTypesTopic } from "./quizEngine";

/**
 * 검색 대상 항목 목록 (misc는 details 펼침, testing-types는 전체 항목)
 */
function getSearchableItemsForTopic(topic) {
  if (isMiscTopic(topic)) return expandMiscItems(topic.items);
  if (isTestingTypesTopic(topic)) return topic.items || [];
  return topic.items || [];
}

function itemSearchText(item) {
  const parts = [
    item.nameKo,
    item.nameEn,
    ...(Array.isArray(item.aliases) ? item.aliases : []),
    item.examDescription,
    item.quizPrompt,
    item.shortDescription,
    item.description,
    item.subcategory,
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
}

export function buildSearchIndex() {
  return topics.flatMap((topic) => {
    const items = getSearchableItemsForTopic(topic);
    return items.map((item) => ({
      topicId: topic.id,
      topicTitle: topic.title,
      itemId: item.id,
      displayName: item.nameKo || item.nameEn || String(item.id),
      searchText: itemSearchText(item),
    }));
  });
}

let cachedIndex = null;

export function getSearchIndex() {
  if (!cachedIndex) cachedIndex = buildSearchIndex();
  return cachedIndex;
}

/** 공백으로 구분된 토큰이 모두 포함되면 매칭 */
function tokensMatch(searchText, tokens) {
  return tokens.every((t) => searchText.includes(t));
}

/**
 * @param {string} query
 * @param {number} limit
 * @returns {Array<{ topicId: string, topicTitle: string, itemId: string, displayName: string }>}
 */
/**
 * misc 등에서 검색된 `parentId__sub__n` → 출제 목록 테이블 행(부모 id)에 맞춤
 */
export function resolveListRowItemId(highlightItemId) {
  if (highlightItemId == null || highlightItemId === "") return null;
  const s = String(highlightItemId);
  const m = s.match(/^(.+)__sub__(\d+)$/);
  return m ? m[1] : s;
}

export function searchItems(query, limit = 50) {
  const raw = query.trim().toLowerCase();
  if (!raw) return [];
  const tokens = raw.split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];

  const index = getSearchIndex();
  const out = [];
  for (const row of index) {
    if (tokensMatch(row.searchText, tokens)) {
      out.push({
        topicId: row.topicId,
        topicTitle: row.topicTitle,
        itemId: row.itemId,
        displayName: row.displayName,
      });
      if (out.length >= limit) break;
    }
  }
  return out;
}
