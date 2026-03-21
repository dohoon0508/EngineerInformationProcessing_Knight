/**
 * topics.js 구조 검증 (Node 직접 실행, 빌드 불필요)
 * npm run validate:topics
 */
import { topics } from "../src/data/topics.js";

const errors = [];
const warnings = [];

function warn(msg) {
  warnings.push(msg);
}
function err(msg) {
  errors.push(msg);
}

const seenItemIds = new Map(); // itemId -> "topicId/title"

for (const topic of topics) {
  if (!topic?.id) err("topic에 id가 없습니다.");
  if (!topic?.title) warn(`topic "${topic?.id ?? "?"}": title 없음`);
  if (!Array.isArray(topic?.items) || topic.items.length === 0) {
    err(`topic "${topic?.id}": items가 비어 있거나 배열이 아닙니다.`);
    continue;
  }

  for (const item of topic.items) {
    if (!item?.id) {
      err(`topic "${topic.id}": 항목에 id가 없습니다.`);
      continue;
    }
    const key = `${topic.id}::${item.id}`;
    if (seenItemIds.has(item.id)) {
      err(
        `중복 item id "${item.id}" — ${seenItemIds.get(item.id)} 와 topic "${topic.id}"`
      );
    } else {
      seenItemIds.set(item.id, `${topic.id} (${topic.title})`);
    }

    const hasName = Boolean(item.nameKo ?? item.nameEn);
    if (!hasName) err(`${key}: nameKo 또는 nameEn 필요`);

    const desc =
      item.examDescription ?? item.description ?? item.quizPrompt ?? "";
    if (!String(desc).trim() && item.interactiveType !== "matching") {
      warn(`${key}: examDescription(또는 description)이 비어 있음`);
    }

    const quizText = String(item.quizPrompt ?? item.examDescription ?? item.description ?? "");
    const nameKo = item.nameKo ? String(item.nameKo).trim() : "";
    const nameEn = item.nameEn ? String(item.nameEn).trim() : "";

    if (nameKo.length >= 2 && quizText.includes(nameKo)) {
      warn(`${key}: 퀴즈 문구에 nameKo("${nameKo}")가 포함됨 — quizPrompt로 분리 검토`);
    }
    if (nameEn.length >= 3 && quizText.includes(nameEn)) {
      warn(`${key}: 퀴즈 문구에 nameEn("${nameEn}")가 포함됨 — quizPrompt로 분리 검토`);
    }
  }
}

console.log(`검증 완료: topic ${topics.length}개, 항목 총 ${seenItemIds.size}개`);
if (warnings.length) {
  console.log(`\n경고 ${warnings.length}건:`);
  for (const w of warnings) console.log(`  - ${w}`);
}
if (errors.length) {
  console.log(`\n오류 ${errors.length}건:`);
  for (const e of errors) console.log(`  - ${e}`);
  process.exit(1);
}
if (warnings.length) process.exit(0);
console.log("경고·오류 없음.");
process.exit(0);
