import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthenticatedUser, validateProgressDelta } from "@/lib/playback/session-helpers";
import { sessionProgressSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }

  const parsed = sessionProgressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }

  const { clientSessionId, actualPlayedMs, lastPositionMs } = parsed.data;
  const supabase = createServiceClient();

  const { data: session } = await supabase
    .from("playback_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("client_session_id", clientSessionId)
    .single();

  if (!session) {
    return NextResponse.json({ error: "会话不存在" }, { status: 404 });
  }

  const lastUpdate = new Date(session.updated_at).getTime();
  const elapsed = Date.now() - lastUpdate;
  const validatedMs = validateProgressDelta(
    session.actual_played_ms,
    actualPlayedMs,
    elapsed,
  );

  await supabase
    .from("playback_sessions")
    .update({
      actual_played_ms: validatedMs,
      last_position_ms: lastPositionMs,
    })
    .eq("id", session.id);

  return NextResponse.json({ ok: true });
}
