import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useKakaoAuth } from "./KakaoAuthContext";
import {
  loadFavoriteKeys,
  saveFavoriteKeys,
  makeFavoriteKey,
  pullFavoritesFromCloud,
  pushFavoriteToggle,
} from "../utils/favoritesStorage.js";
import { isCloudSyncEnabled } from "../utils/statsSync.js";

/* eslint-disable react-refresh/only-export-components -- 훅은 Provider와 같은 모듈에서 export */

const FavoritesContext = createContext(null);

export function FavoritesProvider({ children }) {
  const { user, accessToken, sessionReady } = useKakaoAuth();
  const kakaoUserId = user?.id ?? null;

  const [favoriteKeys, setFavoriteKeys] = useState(() => loadFavoriteKeys(null));
  const [cloudPullDone, setCloudPullDone] = useState(false);

  useEffect(() => {
    setFavoriteKeys(loadFavoriteKeys(kakaoUserId));
    setCloudPullDone(false);
  }, [kakaoUserId]);

  useEffect(() => {
    if (!sessionReady || kakaoUserId == null) {
      setCloudPullDone(true);
      return;
    }
    if (!isCloudSyncEnabled() || !accessToken) {
      setCloudPullDone(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const ok = await pullFavoritesFromCloud(accessToken, kakaoUserId);
      if (!cancelled && ok) {
        setFavoriteKeys(loadFavoriteKeys(kakaoUserId));
      }
      if (!cancelled) setCloudPullDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionReady, kakaoUserId, accessToken]);

  useEffect(() => {
    function onFav() {
      setFavoriteKeys(loadFavoriteKeys(kakaoUserId));
    }
    window.addEventListener("quiz-favorites-changed", onFav);
    return () => window.removeEventListener("quiz-favorites-changed", onFav);
  }, [kakaoUserId]);

  const isFavorite = useCallback(
    (topicId, itemId) => favoriteKeys.has(makeFavoriteKey(topicId, itemId)),
    [favoriteKeys]
  );

  const toggleFavorite = useCallback(
    async (topicId, itemId) => {
      const key = makeFavoriteKey(topicId, itemId);
      const next = new Set(favoriteKeys);
      const add = !next.has(key);
      if (add) next.add(key);
      else next.delete(key);
      setFavoriteKeys(next);
      saveFavoriteKeys(kakaoUserId, next);
      if (kakaoUserId != null && accessToken && isCloudSyncEnabled()) {
        await pushFavoriteToggle(accessToken, topicId, itemId, add);
      }
    },
    [favoriteKeys, kakaoUserId, accessToken]
  );

  const value = useMemo(
    () => ({
      favoriteKeys,
      favoritesReady: cloudPullDone,
      isFavorite,
      toggleFavorite,
    }),
    [favoriteKeys, cloudPullDone, isFavorite, toggleFavorite]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites는 FavoritesProvider 안에서만 사용하세요.");
  }
  return ctx;
}
