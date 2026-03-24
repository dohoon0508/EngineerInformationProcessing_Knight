/**
 * 정답 비교용 정규화 함수
 * 띄어쓰기, 대소문자(영문), 한글/영문 표기 차이 허용
 */
export function normalizeAnswer(input) {
  if (!input || typeof input !== "string") return "";
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\s/g, "")
    .replace(/[-_]/g, "");
}

/**
 * 항목 표시 형식: "한국어 (영문)" 또는 SOLID 등 "한국어 (약어)"
 */
export function formatDisplayName(item) {
  if (!item) return "";
  if (item.shortLabel) {
    return `${item.nameKo} (${item.shortLabel})`;
  }
  if (item.nameEn) {
    return `${item.nameKo} (${item.nameEn})`;
  }
  return item.nameKo;
}

/**
 * 사용자 입력이 정답인지 확인 (nameKo, nameEn, aliases 모두 활용)
 * 한국어/영어 둘 다 입력해도 정답 처리
 */
export function checkNameAnswer(userInput, item) {
  const normalized = normalizeAnswer(userInput);
  if (!normalized) return false;

  const candidates = [
    item.nameKo,
    item.nameEn,
    item.shortLabel,
    ...(item.aliases || []),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (normalizeAnswer(candidate) === normalized) return true;
  }

  return false;
}

/**
 * 목적(생성/구조/행위) 정답 확인
 */
export function checkPurposeAnswer(userInput, correctPurpose) {
  const normalized = normalizeAnswer(userInput);
  const correctNorm = normalizeAnswer(correctPurpose);
  return normalized === correctNorm;
}

/**
 * 순서 맞추기 답안 파싱 (하이픈, 공백, 쉼표 구분 허용)
 * "1-3-4-2", "1 3 4 2", "1,3,4,2" → [1, 3, 4, 2]
 */
export function parseOrderInput(input) {
  if (!input || typeof input !== "string") return [];
  const trimmed = input.trim();
  if (!trimmed) return [];
  // "123456"처럼 구분자 없이 연속 입력한 경우 각 자리 숫자로 해석
  if (/^\d+$/.test(trimmed) && !/[-,\s]/.test(trimmed)) {
    return trimmed
      .split("")
      .map((s) => parseInt(s, 10))
      .filter((n) => Number.isInteger(n) && n > 0);
  }
  return trimmed
    .split(/[-,\s]+/)
    .map((s) => parseInt(s, 10))
    .filter((n) => Number.isInteger(n) && n > 0);
}

/**
 * 순서 맞추기 정답 확인 (배열 비교)
 */
export function checkOrderAnswer(userInput, correctOrderArray) {
  const userOrder = parseOrderInput(userInput);
  if (!correctOrderArray?.length || userOrder.length !== correctOrderArray.length) return false;
  return userOrder.every((n, i) => n === correctOrderArray[i]);
}

/**
 * V-모델 매칭: 왼쪽(개발 단계) → 오른쪽(테스트 단계) 전부 일치해야 정답
 */
export function checkVModelMatching(userMap, correctPairs) {
  if (!userMap || !correctPairs || typeof userMap !== "object" || typeof correctPairs !== "object") {
    return false;
  }
  const keys = Object.keys(correctPairs);
  if (keys.length === 0) return false;
  for (const k of keys) {
    if (userMap[k] !== correctPairs[k]) return false;
  }
  return true;
}
