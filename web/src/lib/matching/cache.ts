const MATCHING_CACHE_TTL_MINUTES = 240; // 4時間（負荷テスト結果を踏まえた最適化）

export const getMatchingCacheExpiry = () => {
  return new Date(Date.now() + MATCHING_CACHE_TTL_MINUTES * 60 * 1000).toISOString();
};

export const isMatchingCacheValid = (expiresAt?: string | null) => {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() > Date.now();
};

export const matchingCacheTtlMinutes = MATCHING_CACHE_TTL_MINUTES;
