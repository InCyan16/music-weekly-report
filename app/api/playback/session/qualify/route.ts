import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getAuthenticatedUser,
  getUserTimezone,
  validateProgressDelta,
} from "@/lib/playback/session-helpers";
import { sessionQualifySchema } from "@/lib/validation/schemas";
import { isQualifiedPlay } from "@/lib/playback/qualification";
import { getLocalDateString } from "@/lib/dates/timezone";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = sessionQualifySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }

  const { clientSessionId, actualPlayedMs, lastPositionMs, reachedEnd } =
    parsed.data;

  const supabase = createServiceClient();
  const { data: session } = await supabase
    .from("playback_sessions")
    .select("*, songs(duration_ms)")
    .eq("user_id", user.id)
    .eq("client_session_id", clientSessionId)
    .single();

  if (!session) {
    return NextResponse.json({ error: "会话不存在" }, { status: 404 });
  }

  if (session.is_qualified) {
    const { data: existing } = await supabase
      .from("listening_entries")
      .select("id")
      .eq("playback_session_id", session.id)
      .single();

    return NextResponse.json({
      qualified: true,
      listeningEntryId: existing?.id,
    });
  }

  const lastUpdate = new Date(session.updated_at).getTime();
  const elapsed = Date.now() - lastUpdate;
  const validatedMs = validateProgressDelta(
    session.actual_played_ms,
    actualPlayedMs,
    elapsed,
  );

  const durationMs = (session.songs as { duration_ms: number })?.duration_ms || 0;
  const qualified = isQualifiedPlay(validatedMs, durationMs, !!reachedEnd);

  if (!qualified) {
    await supabase
      .from("playback_sessions")
      .update({
        actual_played_ms: validatedMs,
        last_position_ms: lastPositionMs,
      })
      .eq("id", session.id);

    return NextResponse.json({ qualified: false });
  }

  const timezone = await getUserTimezone(user.id);
  const qualifiedAt = new Date();
  const localDate = getLocalDateString(qualifiedAt, timezone);

  await supabase
    .from("playback_sessions")
    .update({
      actual_played_ms: validatedMs,
      last_position_ms: lastPositionMs,
      is_qualified: true,
      qualified_at: qualifiedAt.toISOString(),
      local_date: localDate,
    })
    .eq("id", session.id);

  const { data: entry, error } = await supabase
    .from("listening_entries")
    .upsert(
      {
        playback_session_id: session.id,
        user_id: user.id,
        song_id: session.song_id,
        listened_at: qualifiedAt.toISOString(),
        local_date: localDate,
        week_start: session.week_start,
        actual_played_ms: validatedMs,
      },
      { onConflict: "playback_session_id" },
    )
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "记录播放失败" }, { status: 500 });
  }

  return NextResponse.json({ qualified: true, listeningEntryId: entry.id });
}
