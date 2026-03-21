/** Vercel `/api/*` 호출 시 사용할 origin (로컬은 VITE_STATS_API_BASE 로 프로덕션 API 지정 가능) */
export function getClientApiOrigin() {
  const base = import.meta.env.VITE_STATS_API_BASE;
  if (base && String(base).trim() !== "") {
    return String(base).replace(/\/$/, "");
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}
