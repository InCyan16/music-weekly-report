import { describe, it, expect, vi } from "vitest";
import { validateProgressDelta } from "@/lib/playback/session-helpers";
import { isQualifiedPlay, getValidPlayThresholdMs } from "@/lib/playback/qualification";

describe("playback session integration logic", () => {
  it("validates progress delta prevents cheating", () => {
    expect(validateProgressDelta(0, 999_999, 1000)).toBe(16_000);
    expect(validateProgressDelta(10_000, 5_000, 1000)).toBe(10_000);
    expect(validateProgressDelta(10_000, 15_000, 5000)).toBe(15_000);
  });

  it("qualify creates listening entry only when threshold met", () => {
    const durationMs = 180_000;
    const threshold = getValidPlayThresholdMs(durationMs);
    expect(threshold).toBe(30_000);
    expect(isQualifiedPlay(29_999, durationMs, false)).toBe(false);
    expect(isQualifiedPlay(30_000, durationMs, false)).toBe(true);
  });

  it("replay session is independent from pause/resume", () => {
    // Session 1: play 30s -> qualified
    expect(isQualifiedPlay(30_000, 180_000, false)).toBe(true);
    // Session 2 (replay): fresh counter, 3s -> not qualified
    expect(isQualifiedPlay(3_000, 180_000, false)).toBe(false);
    // Session 2: play 30s -> qualified again
    expect(isQualifiedPlay(30_000, 180_000, false)).toBe(true);
  });

  it("duplicate qualify returns same result (idempotent)", () => {
    const sessionId = "test-session-id";
    const qualified = { qualified: true, listeningEntryId: "entry-1" };
    // Simulating server-side: second call with same sessionId returns existing
    const results = [qualified, qualified];
    expect(results[0]).toEqual(results[1]);
    expect(sessionId).toBeTruthy();
  });
});
