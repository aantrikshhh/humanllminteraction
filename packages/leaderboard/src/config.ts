import type { RatingConfig } from "./types.ts";

export const DEFAULT_RATING_CONFIG: RatingConfig = {
  baseRating: 1500,
  kFactor: 24,
  globalKFactor: 16,
  ratingSpreadDivisor: 400,
  minRating: 100,
};

export function normalizeRatingConfig(
  config: Partial<RatingConfig> = {},
): RatingConfig {
  return {
    baseRating: clampInteger(config.baseRating, DEFAULT_RATING_CONFIG.baseRating, 100),
    kFactor: clampInteger(config.kFactor, DEFAULT_RATING_CONFIG.kFactor, 1),
    globalKFactor: clampInteger(
      config.globalKFactor,
      DEFAULT_RATING_CONFIG.globalKFactor,
      1,
    ),
    ratingSpreadDivisor: clampInteger(
      config.ratingSpreadDivisor,
      DEFAULT_RATING_CONFIG.ratingSpreadDivisor,
      1,
    ),
    minRating: clampInteger(config.minRating, DEFAULT_RATING_CONFIG.minRating, 0),
  };
}

function clampInteger(value: number | undefined, fallback: number, min: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(min, Math.round(value));
}
