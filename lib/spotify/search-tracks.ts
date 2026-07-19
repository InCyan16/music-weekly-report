import { type Track } from "@/lib/music/types";

type SpotifyTrackItem = {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
  duration_ms: number;
  is_playable?: boolean;
};

export function mapSpotifyTrack(item: SpotifyTrackItem): Track {
  return {
    externalId: item.id,
    source: "spotify",
    title: item.name,
    artist: item.artists.map((a) => a.name).join(", "),
    album: item.album.name,
    coverUrl: item.album.images[0]?.url ?? null,
    durationMs: item.duration_ms,
    playable: item.is_playable !== false,
  };
}

export async function searchSpotifyTracks(
  accessToken: string,
  query: string,
  market?: string,
): Promise<Track[]> {
  const params = new URLSearchParams({
    q: query,
    type: "track",
    limit: "20",
  });
  if (market) params.set("market", market);

  const res = await fetch(
    `https://api.spotify.com/v1/search?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg =
      typeof body?.error?.message === "string"
        ? body.error.message
        : "Spotify 搜索失败";
    throw new Error(msg);
  }

  const data = await res.json();
  return (data.tracks?.items || []).map(mapSpotifyTrack);
}

export function getSpotifyMarket(): string | undefined {
  return process.env.SPOTIFY_MARKET || undefined;
}
