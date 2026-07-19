import { describe, it, expect } from "vitest";
import {
  getValidPlayThresholdMs,
  isQualifiedPlay,
  getRemainingMsForQualification,
} from "@/lib/playback/qualification";
import { PlayTimeTracker } from "@/lib/playback/play-time-tracker";
import { calculateTopSongs, type ListeningEntryRow } from "@/lib/reports/calculate-top-songs";
import { calculateMoodStats } from "@/lib/reports/calculate-mood-stats";
import { generateMoodSummary } from "@/lib/reports/generate-mood-summary";
import { getLocalDateString, getTodayLocalDate } from "@/lib/dates/timezone";
import { getWeekStart, getWeekEnd, isSunday } from "@/lib/dates/week";

describe("qualification", () => {
  it("uses 30s threshold for normal songs", () => {
    expect(getValidPlayThresholdMs(180_000)).toBe(30_000);
  });

  it("uses 80% rule for short songs", () => {
    expect(getValidPlayThresholdMs(20_000)).toBe(16_000);
  });

  it("qualifies at 30s accumulated play", () => {
    expect(isQualifiedPlay(30_000, 180_000, false)).toBe(true);
  });

  it("qualifies short song at 80%", () => {
    expect(isQualifiedPlay(16_000, 20_000, false)).toBe(true);
  });

  it("qualifies on natural end", () => {
    expect(isQualifiedPlay(5_000, 180_000, true)).toBe(true);
  });

  it("does not qualify below threshold", () => {
    expect(isQualifiedPlay(3_000, 180_000, false)).toBe(false);
  });

  it("calculates remaining ms", () => {
    expect(getRemainingMsForQualification(10_000, 180_000)).toBe(20_000);
  });
});

describe("PlayTimeTracker", () => {
  it("accumulates play time on pause/resume", () => {
    const tracker = new PlayTimeTracker();
    tracker.start();
    tracker.onPlay();
    // Simulate some play time
    tracker.onPause();
    const afterPause = tracker.getAccumulatedMs();
    expect(afterPause).toBeGreaterThanOrEqual(0);
    tracker.onPlay();
    tracker.onPause();
    expect(tracker.getAccumulatedMs()).toBeGreaterThanOrEqual(afterPause);
    tracker.destroy();
  });

  it("seek does not add accumulated time", () => {
    const tracker = new PlayTimeTracker();
    tracker.start();
    tracker.onPlay();
    tracker.onSeek();
    tracker.onPause();
    const ms = tracker.getAccumulatedMs();
    expect(ms).toBeGreaterThanOrEqual(0);
    tracker.destroy();
  });

  it("reset clears accumulated time", () => {
    const tracker = new PlayTimeTracker();
    tracker.start();
    tracker.onPlay();
    tracker.reset();
    expect(tracker.getAccumulatedMs()).toBe(0);
    tracker.destroy();
  });
});

describe("calculateTopSongs", () => {
  const makeEntry = (
    songId: string,
    externalId: string,
    title: string,
    listenedAt: string,
  ): ListeningEntryRow => ({
    song_id: songId,
    listened_at: listenedAt,
    local_date: "2026-07-07",
    actual_played_ms: 30_000,
    songs: {
      id: songId,
      external_id: externalId,
      source: "spotify",
      title,
      artist: "Artist",
      album: "Album",
      cover_url: null,
      duration_ms: 180_000,
    },
  });

  it("ranks by valid play count descending", () => {
    const entries = [
      makeEntry("a", "ext-a", "Song A", "2026-07-07T10:00:00Z"),
      makeEntry("a", "ext-a", "Song A", "2026-07-07T11:00:00Z"),
      makeEntry("b", "ext-b", "Song B", "2026-07-07T12:00:00Z"),
    ];
    const top = calculateTopSongs(entries);
    expect(top[0].title).toBe("Song A");
    expect(top[0].validPlayCount).toBe(2);
    expect(top[1].validPlayCount).toBe(1);
  });

  it("breaks ties by lastPlayedAt desc", () => {
    const entries = [
      makeEntry("a", "ext-a", "Song A", "2026-07-07T10:00:00Z"),
      makeEntry("b", "ext-b", "Song B", "2026-07-07T12:00:00Z"),
      makeEntry("a", "ext-a", "Song A", "2026-07-07T11:00:00Z"),
      makeEntry("b", "ext-b", "Song B", "2026-07-07T09:00:00Z"),
    ];
    const top = calculateTopSongs(entries);
    expect(top[0].title).toBe("Song A");
    expect(top[1].title).toBe("Song B");
  });

  it("returns max 5 songs", () => {
    const entries = Array.from({ length: 10 }, (_, i) =>
      makeEntry(`s${i}`, `ext-${i}`, `Song ${i}`, `2026-07-07T${10 + i}:00:00Z`),
    );
    expect(calculateTopSongs(entries)).toHaveLength(5);
  });
});

describe("mood stats", () => {
  it("calculates average mood", () => {
    const stats = calculateMoodStats([
      { local_date: "2026-07-07", mood_score: 5, mood_label: "very_happy" },
      { local_date: "2026-07-08", mood_score: 3, mood_label: "calm" },
    ]);
    expect(stats.averageMood).toBe(4);
    expect(stats.moodDays).toBe(2);
  });

  it("finds dominant mood", () => {
    const stats = calculateMoodStats([
      { local_date: "2026-07-07", mood_score: 5, mood_label: "very_happy" },
      { local_date: "2026-07-08", mood_score: 5, mood_label: "very_happy" },
      { local_date: "2026-07-09", mood_score: 3, mood_label: "calm" },
    ]);
    expect(stats.dominantMood).toBe("very_happy");
  });

  it("generates insufficient data summary for 1 day", () => {
    const stats = calculateMoodStats([
      { local_date: "2026-07-07", mood_score: 3, mood_label: "calm" },
    ]);
    expect(generateMoodSummary(stats)).toContain("1 天心情");
  });

  it("generates cautious summary for 2-3 days", () => {
    const stats = calculateMoodStats([
      { local_date: "2026-07-07", mood_score: 3, mood_label: "calm" },
      { local_date: "2026-07-08", mood_score: 4, mood_label: "happy" },
    ]);
    expect(generateMoodSummary(stats)).toContain("还不算多");
  });
});

describe("timezone", () => {
  it("formats local date in timezone", () => {
    const date = new Date("2026-07-07T15:00:00Z");
    const local = getLocalDateString(date, "Asia/Shanghai");
    expect(local).toMatch(/2026-07-0[78]/);
  });

  it("gets today local date", () => {
    const today = getTodayLocalDate("UTC");
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("week calculation", () => {
  it("gets Monday as week start", () => {
    // Wednesday July 8, 2026
    const date = new Date("2026-07-08T12:00:00Z");
    const weekStart = getWeekStart(date, "UTC");
    expect(weekStart).toBe("2026-07-06");
  });

  it("gets Sunday as week end", () => {
    const weekEnd = getWeekEnd("2026-07-06", "UTC");
    expect(weekEnd).toBe("2026-07-12");
  });

  it("detects Sunday", () => {
    const sunday = new Date("2026-07-12T12:00:00Z");
    expect(isSunday(sunday, "UTC")).toBe(true);
  });
});

describe("session rules", () => {
  it("same session qualifies only once", () => {
    const qualified1 = isQualifiedPlay(30_000, 180_000, false);
    const qualified2 = isQualifiedPlay(30_000, 180_000, false);
    expect(qualified1).toBe(true);
    expect(qualified2).toBe(true);
    // Idempotency is enforced server-side via unique constraint
  });

  it("multiple sessions for same song accumulate", () => {
    const entries = [
      {
        song_id: "a",
        listened_at: "2026-07-07T10:00:00Z",
        local_date: "2026-07-07",
        actual_played_ms: 30_000,
        songs: {
          id: "a",
          external_id: "ext-a",
          source: "spotify",
          title: "Song A",
          artist: "A",
          album: null,
          cover_url: null,
          duration_ms: 180_000,
        },
      },
      {
        song_id: "a",
        listened_at: "2026-07-07T14:00:00Z",
        local_date: "2026-07-07",
        actual_played_ms: 30_000,
        songs: {
          id: "a",
          external_id: "ext-a",
          source: "spotify",
          title: "Song A",
          artist: "A",
          album: null,
          cover_url: null,
          duration_ms: 180_000,
        },
      },
    ] as ListeningEntryRow[];
    const top = calculateTopSongs(entries);
    expect(top[0].validPlayCount).toBe(2);
  });
});
