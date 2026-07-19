let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getSpotifyClientCredentialsToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.value;
  }

  const clientId = process.env.MUSIC_CLIENT_ID;
  const clientSecret = process.env.MUSIC_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("未配置 Spotify 凭据 (MUSIC_CLIENT_ID / MUSIC_CLIENT_SECRET)");
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });

  if (!res.ok) {
    throw new Error("Spotify 授权失败，请检查 Client ID / Secret");
  }

  const data = await res.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}
