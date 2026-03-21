import {
  loadStats,
  saveStats,
  getStatsTouchTime,
  setStatsTouchFromServer,
  hasStatsContent,
  emitStatsStorageChanged,
} from "./storage";
import { isCloudSyncEnabled, fetchCloudStatsBundle, pushStatsNow } from "./statsSync";

/**
 * 카카오 로그인(또는 세션 복구) 직후: Neon 등 서버 통계와 로컬을 맞춤.
 * - 서버가 더 최신이면 로컬을 서버로 덮어씀
 * - 로컬이 더 최신이면 서버로 즉시 업로드
 */
export async function syncQuizStatsWithCloudOnLogin(accessToken, kakaoUserId) {
  if (!isCloudSyncEnabled() || !accessToken || kakaoUserId == null) return;

  const bundle = await fetchCloudStatsBundle(accessToken);
  const local = loadStats(kakaoUserId);
  const localTouch = getStatsTouchTime(kakaoUserId);
  const cloudStats = bundle?.stats;
  const cloudMs = bundle?.updatedAt ? new Date(bundle.updatedAt).getTime() : 0;
  const cloudHas = hasStatsContent(cloudStats);
  const localHas = hasStatsContent(local);

  if (cloudHas) {
    if (!localHas || (Number.isFinite(cloudMs) && cloudMs > localTouch)) {
      saveStats(cloudStats, kakaoUserId);
      if (bundle.updatedAt) setStatsTouchFromServer(kakaoUserId, bundle.updatedAt);
      emitStatsStorageChanged();
    } else if (localHas) {
      pushStatsNow(local, accessToken);
    }
  } else if (localHas) {
    pushStatsNow(local, accessToken);
  }
}
