import { type MoodStats } from "@/lib/reports/calculate-mood-stats";

const MOOD_TEXT: Record<string, string> = {
  loved: "Loved",
  happy: "Happy",
  calm: "Calm",
  tired: "Tired",
  sad: "Sad",
  very_happy: "Loved",
  low: "Tired",
};

export function generateMoodSummary(stats: MoodStats): string {
  if (stats.moodDays === 0) {
    return "本周还没有记录心情，下次聆听结束后别忘了留下你的感受。";
  }

  if (stats.moodDays === 1) {
    return "本周目前记录了 1 天心情。";
  }

  const parts: string[] = [];

  if (stats.dominantMood) {
    const moodText = MOOD_TEXT[stats.dominantMood] || stats.dominantMood;
    if (stats.dominantMood === "calm") {
      parts.push(
        "这周你的音乐时光整体比较平静，音乐更多像是一种陪伴。",
      );
    } else if (
      stats.dominantMood === "happy" ||
      stats.dominantMood === "loved" ||
      stats.dominantMood === "very_happy"
    ) {
      parts.push(
        `快乐是这周最常出现的状态，你听音乐的频率也比较高。`,
      );
    } else if (
      stats.dominantMood === "tired" ||
      stats.dominantMood === "low" ||
      stats.dominantMood === "sad"
    ) {
      parts.push("音乐似乎成了你情绪的出口，那些旋律陪伴你度过了一些不太轻松的时刻。");
    }
  }

  if (stats.moodDays >= 4) {
    if (stats.trendDirection === "up") {
      parts.push("你的心情在周中有所下降，但周末重新轻松起来。");
    } else if (stats.trendDirection === "down") {
      parts.push("这周的心情有些起伏，音乐或许能帮你找到一些平衡。");
    } else if (stats.trendDirection === "stable") {
      parts.push("这周的心情相对稳定，音乐成为了日常节奏的一部分。");
    }
  } else if (stats.moodDays <= 3) {
    parts.push("本周的记录还不算多，再多听几天，就能看到更完整的情绪轨迹。");
  }

  return parts.join(" ") || "音乐与你同行，继续记录吧。";
}
