import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, encryptToken } from "@/lib/security/token-crypto";
import { trackSchema } from "@/lib/validation/schemas";
import { upsertSong } from "@/lib/playback/session-helpers";

async function getSpotifyToken(userId: string): Promise<string> {
  const serviceClient = createServiceClient();
  const { data: connection } = await serviceClient
    .from("music_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", "spotify")
    .single();

  if (!connection?.access_token_encrypted) {
    throw new Error("音乐账户未连接");
  }

  let accessToken = decryptToken(connection.access_token_encrypted);
  const expiresAt = connection.token_expires_at
    ? new Date(connection.token_expires_at)
    : new Date(0);

  if (expiresAt.getTime() - Date.now() < 60_000) {
    const refreshToken = decryptToken(connection.refresh_token_encrypted);
    const clientId = process.env.MUSIC_CLIENT_ID!;
    const clientSecret = process.env.MUSIC_CLIENT_SECRET!;

    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) throw new Error("Token 刷新失败");
    const tokens = await res.json();
    accessToken = tokens.access_token;
  }

  return accessToken;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = trackSchema.safeParse(body.track);
  if (!parsed.success) {
    return NextResponse.json({ error: "无效的歌曲数据" }, { status: 400 });
  }

  const track = parsed.data;
  if (!track.playable) {
    return NextResponse.json({ error: "当前歌曲暂不可播放" }, { status: 400 });
  }

  try {
    const token = await getSpotifyToken(user.id);
    await upsertSong(track);

    const res = await fetch("https://api.spotify.com/v1/me/player/play", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uris: [`spotify:track:${track.externalId}`],
      }),
    });

    if (res.status === 204 || res.ok) {
      return NextResponse.json({ ok: true });
    }

    const errData = await res.json().catch(() => ({}));
    if (res.status === 403) {
      return NextResponse.json(
        { error: "需要 Spotify Premium 账户才能播放" },
        { status: 403 },
      );
    }
    if (res.status === 404) {
      return NextResponse.json(
        { error: "未找到可用播放设备，请确保已连接播放器" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { error: errData.error?.message || "播放失败" },
      { status: res.status },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "播放失败" },
      { status: 500 },
    );
  }
}
