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
 * 항목 표시 형식: "한국어 (영문)"
 */
export function formatDisplayName(item) {
  if (!item) return "";
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
