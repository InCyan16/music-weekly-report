export const DEFAULT_VALID_THRESHOLD_MS = 30_000;
export const SHORT_SONG_RATIO = 0.8;

export function getValidPlayThresholdMs(durationMs: number): number {
  if (durationMs <= 0) return DEFAULT_VALID_THRESHOLD_MS;
  if (durationMs < DEFAULT_VALID_THRESHOLD_MS) {
    return Math.ceil(durationMs * SHORT_SONG_RATIO);
  }
  return DEFAULT_VALID_THRESHOLD_MS;
}

export function isQualifiedPlay(
  actualPlayedMs: number,
  durationMs: number,
  reachedEnd: boolean,
): boolean {
  if (reachedEnd) return true;
  const threshold = getValidPlayThresholdMs(durationMs);
  return actualPlayedMs >= threshold;
}

export function getRemainingMsForQualification(
  actualPlayedMs: number,
  durationMs: number,
): number {
  const threshold = getValidPlayThresholdMs(durationMs);
  return Math.max(0, threshold - actualPlayedMs);
}
