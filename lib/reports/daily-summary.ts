import { type MoodLabel, type Track } from "@/lib/music/types";

export type DailyPlaybackSessionRow = {
  song_id: string;
  started_at: string;
  songs: {
    external_id: string;
    source: string;
    title: string;
    artist: string;
    album: string | null;
    cover_url: string | null;
    duration_ms: number;
    playable: boolean;
  } | null;
};

export type DailySummaryData = {
  localDate: string;
  moodSlots: MoodLabel[];
  tracks: Track[];
};

export function selectDailyCollection(
  sessions: DailyPlaybackSessionRow[],
  limit = 8,
): Track[] {
  const seen = new Set<string>();
  const tracks: Track[] = [];

  const orderedSessions = [...sessions].sort((a, b) =>
    a.started_at.localeCompare(b.started_at),
  );

  for (const session of orderedSessions) {
    if (!session.songs || seen.has(session.song_id)) continue;
    seen.add(session.song_id);
    tracks.push({
      externalId: session.songs.external_id,
      source: session.songs.source,
      title: session.songs.title,
      artist: session.songs.artist,
      album: session.songs.album,
      coverUrl: session.songs.cover_url,
      durationMs: session.songs.duration_ms,
      playable: session.songs.playable,
    });
    if (tracks.length >= limit) break;
  }

  return tracks;
}
