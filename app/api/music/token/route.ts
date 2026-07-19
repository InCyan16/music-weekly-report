import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { decryptToken, encryptToken } from "@/lib/security/token-crypto";

async function refreshSpotifyToken(
  refreshToken: string,
): Promise<{ access_token: string; expires_in: number; refresh_token?: string }> {
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

  if (!res.ok) throw new Error("Token refresh failed");
  return res.json();
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const { data: connection } = await serviceClient
    .from("music_connections")
    .select("*")
    .eq("user_id", user.id)
    .eq("provider", "spotify")
    .single();

  if (!connection || connection.connection_status !== "connected") {
    return NextResponse.json({ error: "音乐账户未连接" }, { status: 403 });
  }

  let accessToken = decryptToken(connection.access_token_encrypted);
  const expiresAt = connection.token_expires_at
    ? new Date(connection.token_expires_at)
    : new Date(0);

  if (expiresAt.getTime() - Date.now() < 60_000) {
    const refreshToken = decryptToken(connection.refresh_token_encrypted);
    const tokens = await refreshSpotifyToken(refreshToken);
    accessToken = tokens.access_token;
    const newExpires = new Date(Date.now() + tokens.expires_in * 1000);

    await serviceClient
      .from("music_connections")
      .update({
        access_token_encrypted: encryptToken(tokens.access_token),
        refresh_token_encrypted: tokens.refresh_token
          ? encryptToken(tokens.refresh_token)
          : connection.refresh_token_encrypted,
        token_expires_at: newExpires.toISOString(),
      })
      .eq("id", connection.id);
  }

  return NextResponse.json({ accessToken });
}
