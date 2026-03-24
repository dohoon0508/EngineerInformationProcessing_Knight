/**
 * 풀 기준으로 문항을 나눕니다.
 * - 맞은 문항: 한 번이라도 정답(correct > 0)
 * - 틀린 문항: 시도 기록이 있으나 아직 한 번도 맞힌 적 없음(correct === 0 && wrong > 0). 같은 문항을 여러 번 틀려도 1로만 셉니다.
 * - 남은 문제: 아직 풀지 않음(correct === 0 && wrong === 0)
 * - 전체 문항: 풀 크기 — 맞은 + 틀린 + 남은
 *
 * @param {{ id: string }[]} itemList
 * @param {Record<string, { correct?: number, wrong?: number }>} itemStatsMap
 * @returns {{ total: number, correctItems: number, wrongItems: number, remainingItems: number }}
 */
export function bucketCountsByMastery(itemList, itemStatsMap) {
  if (!itemList?.length) {
    return { total: 0, correctItems: 0, wrongItems: 0, remainingItems: 0 };
  }
  let correctItems = 0;
  let wrongItems = 0;
  for (const item of itemList) {
    const s = itemStatsMap?.[item.id];
    const c = s?.correct ?? 0;
    const w = s?.wrong ?? 0;
    if (c > 0) correctItems++;
    else if (w > 0) wrongItems++;
  }
  const total = itemList.length;
  const remainingItems = total - correctItems - wrongItems;
  return { total, correctItems, wrongItems, remainingItems };
}

/**
 * 전체 즐겨찾기 가상 목차: 항목별 `_statsTopicId`로 통계를 찾아 집계합니다.
 *
 * @param {{ id: string, _statsTopicId?: string }[]} items
 * @param {Record<string, { items?: Record<string, { correct?: number, wrong?: number }> }>} statsRoot
 */
export function bucketCountsForAllFavoritesItems(items, statsRoot) {
  if (!items?.length) {
    return { total: 0, correctItems: 0, wrongItems: 0, remainingItems: 0 };
  }
  let correctItems = 0;
  let wrongItems = 0;
  for (const item of items) {
    const tid = item._statsTopicId;
    const s = tid ? statsRoot?.[tid]?.items?.[item.id] : null;
    const c = s?.correct ?? 0;
    const w = s?.wrong ?? 0;
    if (c > 0) correctItems++;
    else if (w > 0) wrongItems++;
  }
  const total = items.length;
  const remainingItems = total - correctItems - wrongItems;
  return { total, correctItems, wrongItems, remainingItems };
}
