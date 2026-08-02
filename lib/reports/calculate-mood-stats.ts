export type MoodRow = {
  local_date: string;
  mood_score: number;
  mood_label: string;
};

export type MoodStats = {
  moodDays: number;
  averageMood: number | null;
  dominantMood: string | null;
  dominantMoodText: string;
  dailyTrend: { date: string; score: number; label: string }[];
  moodCounts: Record<string, number>;
  highestMoodDay: string | null;
  lowestMoodDay: string | null;
  trendDirection: "up" | "down" | "stable" | "insufficient";
};

const MOOD_TEXT: Record<string, string> = {
  loved: "Loved",
  happy: "Happy",
  calm: "Calm",
  tired: "Tired",
  sad: "Sad",
  // legacy
  very_happy: "Loved",
  low: "Tired",
};

export function calculateMoodStats(moods: MoodRow[]): MoodStats {
  if (moods.length === 0) {
    return {
      moodDays: 0,
      averageMood: null,
      dominantMood: null,
      dominantMoodText: "",
      dailyTrend: [],
      moodCounts: {},
      highestMoodDay: null,
      lowestMoodDay: null,
      trendDirection: "insufficient",
    };
  }

  const sorted = [...moods].sort((a, b) =>
    a.local_date.localeCompare(b.local_date),
  );

  const moodCounts: Record<string, number> = {};
  let totalScore = 0;
  let highest = sorted[0];
  let lowest = sorted[0];

  for (const m of sorted) {
    moodCounts[m.mood_label] = (moodCounts[m.mood_label] || 0) + 1;
    totalScore += m.mood_score;
    if (m.mood_score > highest.mood_score) highest = m;
    if (m.mood_score < lowest.mood_score) lowest = m;
  }

  const dominantMood = Object.entries(moodCounts).sort(
    (a, b) => b[1] - a[1],
  )[0]?.[0] ?? null;

  let trendDirection: MoodStats["trendDirection"] = "insufficient";
  if (sorted.length >= 4) {
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2));
    const firstAvg =
      firstHalf.reduce((s, m) => s + m.mood_score, 0) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce((s, m) => s + m.mood_score, 0) / secondHalf.length;
    const diff = secondAvg - firstAvg;
    if (diff > 0.3) trendDirection = "up";
    else if (diff < -0.3) trendDirection = "down";
    else trendDirection = "stable";
  }

  return {
    moodDays: moods.length,
    averageMood: Math.round((totalScore / moods.length) * 10) / 10,
    dominantMood,
    dominantMoodText: dominantMood ? MOOD_TEXT[dominantMood] || dominantMood : "",
    dailyTrend: sorted.map((m) => ({
      date: m.local_date,
      score: m.mood_score,
      label: m.mood_label,
    })),
    moodCounts,
    highestMoodDay: highest.local_date,
    lowestMoodDay: lowest.local_date,
    trendDirection,
  };
}
