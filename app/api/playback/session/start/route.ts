import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  getAuthenticatedUser,
  getSessionDates,
  upsertSong,
  getValidPlayThresholdMs,
} from "@/lib/playback/session-helpers";
import { sessionStartSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = sessionStartSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }

  const { clientSessionId, track } = parsed.data;
  const songId = await upsertSong(track);
  const { localDate, weekStart } = await getSessionDates(user.id);
  const threshold = getValidPlayThresholdMs(track.durationMs);

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("playback_sessions")
    .upsert(
      {
        client_session_id: clientSessionId,
        user_id: user.id,
        song_id: songId,
        local_date: localDate,
        week_start: weekStart,
        valid_play_threshold_ms: threshold,
        actual_played_ms: 0,
        last_position_ms: 0,
        is_qualified: false,
        started_at: new Date().toISOString(),
      },
      { onConflict: "user_id,client_session_id" },
    )
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "创建播放会话失败" }, { status: 500 });
  }

  return NextResponse.json({ sessionId: data.id });
}
