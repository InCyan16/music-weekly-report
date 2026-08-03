import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTodayLocalDate } from "@/lib/dates/timezone";
import {
  selectDailyCollection,
  type DailyPlaybackSessionRow,
  type DailySummaryData,
} from "@/lib/reports/daily-summary";
import { type MoodLabel } from "@/lib/music/types";

const MOOD_LABELS = new Set<MoodLabel>([
  "loved",
  "happy",
  "calm",
  "tired",
  "sad",
]);

function validMoodSlots(value: unknown): MoodLabel[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is MoodLabel =>
      typeof item === "string" && MOOD_LABELS.has(item as MoodLabel),
  ).slice(0, 5);
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();

  const localDate = getTodayLocalDate(profile?.timezone || "UTC");
  const [{ data: sessions, error: sessionsError }, { data: mood }] =
    await Promise.all([
      supabase
        .from("playback_sessions")
        .select(
          "song_id, started_at, songs(external_id, source, title, artist, album, cover_url, duration_ms, playable)",
        )
        .eq("user_id", user.id)
        .eq("local_date", localDate)
        .order("started_at", { ascending: true }),
      supabase
        .from("daily_moods")
        .select("mood_label, mood_slots")
        .eq("user_id", user.id)
        .eq("local_date", localDate)
        .maybeSingle(),
    ]);

  if (sessionsError) {
    return NextResponse.json(
      { error: "读取今日唱片失败" },
      { status: 500 },
    );
  }

  const savedSlots = validMoodSlots(mood?.mood_slots);
  const fallbackSlots = validMoodSlots(
    mood?.mood_label ? [mood.mood_label] : [],
  );
  const summary: DailySummaryData = {
    localDate,
    moodSlots: savedSlots.length ? savedSlots : fallbackSlots,
    tracks: selectDailyCollection(
      (sessions || []) as unknown as DailyPlaybackSessionRow[],
    ),
  };

  return NextResponse.json(summary);
}
