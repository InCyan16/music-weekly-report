import type { MoodLabel } from "@/lib/music/types";

/** Twemoji — 跨平台统一 emoji 图形 (CC-BY 4.0) */
export const TWEMOJI_CDN =
  "https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.2/assets/svg";

export const MOOD_TWEMOJI: Record<MoodLabel, string> = {
  very_happy: "1f604",
  happy: "1f60a",
  calm: "1f60c",
  low: "1f614",
  sad: "1f622",
};

export function getTwemojiUrl(label: MoodLabel): string {
  return `${TWEMOJI_CDN}/${MOOD_TWEMOJI[label]}.svg`;
}
