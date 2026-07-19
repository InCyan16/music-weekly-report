import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, encryptToken } from "@/lib/security/token-crypto";
import {
  getSpotifyMarket,
  searchSpotifyTracks,
} from "@/lib/spotify/search-tracks";

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

    await serviceClient
      .from("music_connections")
      .update({
        access_token_encrypted: encryptToken(tokens.access_token),
        token_expires_at: new Date(
          Date.now() + tokens.expires_in * 1000,
        ).toISOString(),
      })
      .eq("id", connection.id);
  }

  return accessToken;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.length < 2) {
    return NextResponse.json({ tracks: [] });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const token = await getSpotifyToken(user.id);
    const tracks = await searchSpotifyTracks(token, q, getSpotifyMarket());
    return NextResponse.json({ tracks });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "搜索失败" },
      { status: 500 },
    );
  }
}
