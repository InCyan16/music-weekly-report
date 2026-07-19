import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { trackToDbFields } from "@/lib/validation/schemas";
import { type Track } from "@/lib/music/types";
import { getValidPlayThresholdMs } from "@/lib/playback/qualification";
import { getTodayLocalDate } from "@/lib/dates/timezone";
import { getWeekStart } from "@/lib/dates/week";

export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getUserTimezone(userId: string): Promise<string> {
  const supabase = createServiceClient();
  const { data } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", userId)
    .single();
  return data?.timezone || "UTC";
}

export async function upsertSong(track: Track): Promise<string> {
  const supabase = createServiceClient();
  const fields = trackToDbFields(track);

  const { data, error } = await supabase
    .from("songs")
    .upsert(fields, { onConflict: "source,external_id" })
    .select("id")
    .single();

  if (error || !data) throw new Error("Failed to save song");
  return data.id;
}

export async function getSessionDates(userId: string) {
  const timezone = await getUserTimezone(userId);
  const now = new Date();
  const localDate = getTodayLocalDate(timezone);
  const weekStart = getWeekStart(now, timezone);
  return { timezone, localDate, weekStart };
}

export function validateProgressDelta(
  previousMs: number,
  newMs: number,
  elapsedSinceLastUpdate: number,
): number {
  const delta = newMs - previousMs;
  const maxAllowed = Math.max(elapsedSinceLastUpdate + 5000, 15000);
  if (delta < 0) return previousMs;
  if (delta > maxAllowed) return previousMs + maxAllowed;
  return newMs;
}

export function getDefaultThreshold(): number {
  return parseInt(
    process.env.PLAYBACK_DEFAULT_VALID_THRESHOLD_MS || "30000",
    10,
  );
}

export { getValidPlayThresholdMs };
