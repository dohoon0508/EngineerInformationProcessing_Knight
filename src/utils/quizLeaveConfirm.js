/** QuizPage가 등록 — 틀린 것만 세션 진행 중 이탈 시 확인(false면 이동 취소) */

let confirmLeaveCallback = null;

/** @param {null | (() => boolean)} fn — true면 이동 허용 */
export function setQuizLeaveConfirm(fn) {
  confirmLeaveCallback = typeof fn === "function" ? fn : null;
}

/** @returns {boolean} true면 라우팅·이동 허용 */
export function tryConfirmLeaveQuiz() {
  if (!confirmLeaveCallback) return true;
  return confirmLeaveCallback();
}
