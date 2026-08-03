import { describe, expect, it } from "vitest";
import { primaryMoodFromSlots } from "@/lib/music/types";
import {
  selectDailyCollection,
  type DailyPlaybackSessionRow,
} from "@/lib/reports/daily-summary";

function session(
  songId: string,
  startedAt: string,
): DailyPlaybackSessionRow {
  return {
    song_id: songId,
    started_at: startedAt,
    songs: {
      external_id: songId,
      source: "mock",
      title: `Song ${songId}`,
      artist: "Artist",
      album: null,
      cover_url: null,
      duration_ms: 180_000,
      playable: true,
    },
  };
}

describe("daily collection", () => {
  it("deduplicates songs by first selection and preserves chronological order", () => {
    const tracks = selectDailyCollection([
      session("b", "2026-08-03T09:00:00.000Z"),
      session("a", "2026-08-03T08:00:00.000Z"),
      session("a", "2026-08-03T10:00:00.000Z"),
    ]);

    expect(tracks.map((track) => track.externalId)).toEqual(["a", "b"]);
  });

  it("caps the shelf at eight unique records", () => {
    const rows = Array.from({ length: 10 }, (_, index) =>
      session(String(index), `2026-08-03T${String(index).padStart(2, "0")}:00:00.000Z`),
    );

    expect(selectDailyCollection(rows)).toHaveLength(8);
  });
});

describe("mood box summary", () => {
  it("uses the most frequent mood", () => {
    expect(primaryMoodFromSlots(["happy", "sad", "happy"])?.label).toBe(
      "happy",
    );
  });

  it("breaks a tie with the last inserted record", () => {
    expect(primaryMoodFromSlots(["happy", "sad"])?.label).toBe("sad");
  });
});
