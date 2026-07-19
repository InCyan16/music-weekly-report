import { createServiceClient } from "@/lib/supabase/service";
import { getWeekEnd } from "@/lib/dates/week";
import {
  calculateTopSongs,
  type ListeningEntryRow,
} from "@/lib/reports/calculate-top-songs";
import { calculateMoodStats } from "@/lib/reports/calculate-mood-stats";
import { calculateListeningStats } from "@/lib/reports/calculate-listening-stats";
import { generateMoodSummary } from "@/lib/reports/generate-mood-summary";
import { type WeeklyReportData } from "@/lib/music/types";

export async function generateWeeklyReport(
  userId: string,
  weekStart: string,
  timezone: string,
  forceRegenerate = false,
): Promise<WeeklyReportData> {
  const supabase = createServiceClient();
  const weekEnd = getWeekEnd(weekStart, timezone);

  if (!forceRegenerate) {
    const { data: existing } = await supabase
      .from("weekly_reports")
      .select("*")
      .eq("user_id", userId)
      .eq("week_start", weekStart)
      .single();

    if (existing) {
      return mapReportRow(existing);
    }
  }

  const { data: entries } = await supabase
    .from("listening_entries")
    .select("*, songs(*)")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .order("listened_at", { ascending: true });

  const { data: moods } = await supabase
    .from("daily_moods")
    .select("*")
    .eq("user_id", userId)
    .gte("local_date", weekStart)
    .lte("local_date", weekEnd)
    .order("local_date", { ascending: true });

  const entryRows = (entries || []) as unknown as ListeningEntryRow[];
  const topSongs = calculateTopSongs(entryRows);
  const moodStats = calculateMoodStats(moods || []);
  const listeningStats = calculateListeningStats(
    entryRows,
    topSongs[0]?.validPlayCount || 0,
  );
  const moodSummary = generateMoodSummary(moodStats);

  const reportData = {
    user_id: userId,
    week_start: weekStart,
    week_end: weekEnd,
    total_valid_plays: listeningStats.totalValidPlays,
    unique_song_count: listeningStats.uniqueSongCount,
    active_days: listeningStats.activeDays,
    mood_days: moodStats.moodDays,
    average_mood: moodStats.averageMood,
    dominant_mood: moodStats.dominantMood,
    mood_summary: moodSummary,
    top_songs: topSongs,
    mood_stats: moodStats,
    listening_stats: listeningStats,
    generated_at: new Date().toISOString(),
  };

  const { data: saved, error } = await supabase
    .from("weekly_reports")
    .upsert(reportData, { onConflict: "user_id,week_start" })
    .select()
    .single();

  if (error) throw new Error("周报生成失败");
  return mapReportRow(saved);
}

function mapReportRow(row: Record<string, unknown>): WeeklyReportData {
  return {
    id: row.id as string,
    weekStart: row.week_start as string,
    weekEnd: row.week_end as string,
    totalValidPlays: row.total_valid_plays as number,
    uniqueSongCount: row.unique_song_count as number,
    activeDays: row.active_days as number,
    moodDays: row.mood_days as number,
    averageMood: row.average_mood as number | null,
    dominantMood: row.dominant_mood as string | null,
    moodSummary: row.mood_summary as string | null,
    topSongs: row.top_songs as WeeklyReportData["topSongs"],
    moodStats: row.mood_stats as Record<string, unknown>,
    listeningStats: row.listening_stats as Record<string, unknown>,
    generatedAt: row.generated_at as string,
  };
}

export async function getWeekProgress(
  userId: string,
  weekStart: string,
  weekEnd: string,
  timezone: string,
) {
  const supabase = createServiceClient();

  const { count: playCount } = await supabase
    .from("listening_entries")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("week_start", weekStart);

  const { data: activeDays } = await supabase
    .from("listening_entries")
    .select("local_date")
    .eq("user_id", userId)
    .eq("week_start", weekStart);

  const uniqueDays = new Set((activeDays || []).map((d) => d.local_date));

  const { count: moodCount } = await supabase
    .from("daily_moods")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("local_date", weekStart)
    .lte("local_date", weekEnd);

  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const { data: todayMood } = await supabase
    .from("daily_moods")
    .select("id")
    .eq("user_id", userId)
    .eq("local_date", today)
    .single();

  return {
    totalValidPlays: playCount || 0,
    activeDays: uniqueDays.size,
    moodDays: moodCount || 0,
    hasTodayMood: !!todayMood,
  };
}
