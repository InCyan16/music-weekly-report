import { z } from "zod";
import { type Track } from "@/lib/music/types";

export const trackSchema = z.object({
  externalId: z.string().min(1),
  source: z.string().min(1),
  title: z.string().min(1),
  artist: z.string().min(1),
  album: z.string().nullable().optional(),
  coverUrl: z.string().nullable().optional(),
  durationMs: z.number().int().nonnegative(),
  playable: z.boolean(),
});

export const sessionStartSchema = z.object({
  clientSessionId: z.string().uuid(),
  track: trackSchema,
});

export const sessionProgressSchema = z.object({
  clientSessionId: z.string().uuid(),
  actualPlayedMs: z.number().int().nonnegative().max(3_600_000),
  lastPositionMs: z.number().int().nonnegative().max(3_600_000),
});

export const sessionEndSchema = sessionProgressSchema.extend({
  endReason: z.enum([
    "completed",
    "changed_track",
    "replayed",
    "user_stopped",
    "page_closed",
    "error",
    "disconnected",
  ]),
});

export const sessionQualifySchema = sessionProgressSchema.extend({
  reachedEnd: z.boolean().optional(),
});

export const moodSchema = z.object({
  moodScore: z.number().int().min(1).max(5),
  moodLabel: z.enum(["very_happy", "happy", "calm", "low", "sad"]),
});

export type TrackInput = z.infer<typeof trackSchema>;

export function trackToDbFields(track: Track) {
  return {
    external_id: track.externalId,
    source: track.source,
    title: track.title,
    artist: track.artist,
    album: track.album ?? null,
    cover_url: track.coverUrl ?? null,
    duration_ms: track.durationMs,
    playable: track.playable,
  };
}
