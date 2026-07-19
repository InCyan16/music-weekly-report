import { type ListeningEntryRow } from "@/lib/reports/calculate-top-songs";

export type ListeningStats = {
  totalValidPlays: number;
  uniqueSongCount: number;
  activeDays: number;
  averageDailyPlays: number;
  peakDay: string | null;
  peakDayPlays: number;
  topSongPercentage: number;
};

export function calculateListeningStats(
  entries: ListeningEntryRow[],
  topSongPlayCount: number,
): ListeningStats {
  const uniqueSongs = new Set(entries.map((e) => e.song_id));
  const dayCounts = new Map<string, number>();

  for (const entry of entries) {
    dayCounts.set(
      entry.local_date,
      (dayCounts.get(entry.local_date) || 0) + 1,
    );
  }

  let peakDay: string | null = null;
  let peakDayPlays = 0;
  for (const [day, count] of dayCounts) {
    if (count > peakDayPlays) {
      peakDay = day;
      peakDayPlays = count;
    }
  }

  const activeDays = dayCounts.size;
  const totalValidPlays = entries.length;

  return {
    totalValidPlays,
    uniqueSongCount: uniqueSongs.size,
    activeDays,
    averageDailyPlays:
      activeDays > 0
        ? Math.round((totalValidPlays / activeDays) * 10) / 10
        : 0,
    peakDay,
    peakDayPlays,
    topSongPercentage:
      totalValidPlays > 0
        ? Math.round((topSongPlayCount / totalValidPlays) * 100)
        : 0,
  };
}
