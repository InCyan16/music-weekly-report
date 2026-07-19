import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { encryptToken } from "@/lib/security/token-crypto";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (error) {
    return NextResponse.redirect(
      `${appUrl}/connect-music?error=${encodeURIComponent(error)}`,
    );
  }

  const cookieStore = await cookies();
  const savedState = cookieStore.get("spotify_auth_state")?.value;
  const codeVerifier = cookieStore.get("spotify_code_verifier")?.value;

  if (!code || !state || state !== savedState || !codeVerifier) {
    return NextResponse.redirect(
      `${appUrl}/connect-music?error=invalid_state`,
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${appUrl}/login`);
  }

  const clientId = process.env.MUSIC_CLIENT_ID!;
  const clientSecret = process.env.MUSIC_CLIENT_SECRET!;
  const redirectUri = process.env.MUSIC_REDIRECT_URI!;

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      `${appUrl}/connect-music?error=token_exchange_failed`,
    );
  }

  const tokens = await tokenRes.json();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  const serviceClient = createServiceClient();
  await serviceClient.from("music_connections").upsert(
    {
      user_id: user.id,
      provider: "spotify",
      connection_status: "connected",
      access_token_encrypted: encryptToken(tokens.access_token),
      refresh_token_encrypted: tokens.refresh_token
        ? encryptToken(tokens.refresh_token)
        : null,
      token_expires_at: expiresAt.toISOString(),
      scopes: tokens.scope,
    },
    { onConflict: "user_id,provider" },
  );

  cookieStore.delete("spotify_code_verifier");
  cookieStore.delete("spotify_auth_state");

  return NextResponse.redirect(`${appUrl}/connect-music?connected=true`);
}
