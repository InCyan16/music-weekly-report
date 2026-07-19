import { type TopSong } from "@/lib/music/types";

export type ListeningEntryRow = {
  song_id: string;
  listened_at: string;
  local_date: string;
  actual_played_ms: number;
  songs: {
    id: string;
    external_id: string;
    source: string;
    title: string;
    artist: string;
    album: string | null;
    cover_url: string | null;
    duration_ms: number;
  };
};

export function calculateTopSongs(entries: ListeningEntryRow[]): TopSong[] {
  const songMap = new Map<
    string,
    {
      song: ListeningEntryRow["songs"];
      count: number;
      firstPlayedAt: string;
      lastPlayedAt: string;
    }
  >();

  for (const entry of entries) {
    const existing = songMap.get(entry.song_id);
    if (existing) {
      existing.count++;
      if (entry.listened_at < existing.firstPlayedAt) {
        existing.firstPlayedAt = entry.listened_at;
      }
      if (entry.listened_at > existing.lastPlayedAt) {
        existing.lastPlayedAt = entry.listened_at;
      }
    } else {
      songMap.set(entry.song_id, {
        song: entry.songs,
        count: 1,
        firstPlayedAt: entry.listened_at,
        lastPlayedAt: entry.listened_at,
      });
    }
  }

  const sorted = Array.from(songMap.entries())
    .map(([songId, data]) => ({
      songId,
      ...data,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (b.lastPlayedAt !== a.lastPlayedAt)
        return b.lastPlayedAt.localeCompare(a.lastPlayedAt);
      if (a.firstPlayedAt !== b.firstPlayedAt)
        return a.firstPlayedAt.localeCompare(b.firstPlayedAt);
      return a.song.external_id.localeCompare(b.song.external_id);
    });

  return sorted.slice(0, 5).map((item, index) => ({
    rank: index + 1,
    songId: item.songId,
    externalId: item.song.external_id,
    source: item.song.source,
    title: item.song.title,
    artist: item.song.artist,
    album: item.song.album,
    coverUrl: item.song.cover_url,
    durationMs: item.song.duration_ms,
    validPlayCount: item.count,
    firstPlayedAt: item.firstPlayedAt,
    lastPlayedAt: item.lastPlayedAt,
  }));
}
