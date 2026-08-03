"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Turntable } from "@/components/music/Turntable";
import { VinylRecord } from "@/components/music/VinylRecord";
import { MoodEmoji } from "@/components/mood/MoodEmoji";
import { usePlayerStore } from "@/stores/player-store";
import { type DailySummaryData } from "@/lib/reports/daily-summary";
import { type MoodLabel, type Track } from "@/lib/music/types";
import "./daily-collection.css";

const MOOD_TEXT: Record<MoodLabel, string> = {
  happy: "Happy",
  loved: "Loved",
  calm: "Calm",
  tired: "Tired",
  sad: "Sad",
};

const MOOD_COLOR: Record<MoodLabel, string> = {
  happy: "#e8c84a",
  loved: "#e891b0",
  calm: "#9ec5d6",
  tired: "#c9b896",
  sad: "#9b8ec4",
};

function trackKey(track: Track | null) {
  return track ? `${track.source}:${track.externalId}` : "";
}

function formatDate(localDate: string) {
  const [year, month, day] = localDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function DailyCollection() {
  const [summary, setSummary] = useState<DailySummaryData | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const {
    playbackState,
    init,
    connect,
    playTrack,
    pause,
    resume,
    seek,
  } = usePlayerStore();

  useEffect(() => {
    const cleanup = init();
    connect().catch(() => {});
    fetch("/api/today/summary")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not open today’s collection.");
        return response.json() as Promise<DailySummaryData>;
      })
      .then((data) => {
        setSummary(data);
        setSelectedTrack(data.tracks[0] || null);
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
    return cleanup;
  }, [connect, init]);

  const activeTrack = useMemo(
    () =>
      !!selectedTrack &&
      trackKey(playbackState.track) === trackKey(selectedTrack),
    [playbackState.track, selectedTrack],
  );

  async function mountTrack(track: Track) {
    if (playbackState.isPlaying) await pause();
    setSelectedTrack(track);
  }

  async function togglePlayback() {
    if (!selectedTrack || playbackState.isLoading) return;
    if (!activeTrack) {
      await playTrack(selectedTrack);
    } else if (playbackState.isPlaying) {
      await pause();
    } else {
      await resume();
    }
  }

  const slots = Array.from({ length: 8 }, (_, index) =>
    summary?.tracks[index] || null,
  );

  return (
    <main className="collection-page">
      <div className="collection-ambient" aria-hidden />
      <section className="collection-cabinet" aria-busy={loading}>
        <header className="collection-header">
          <div>
            <p className="collection-kicker">Daily music archive</p>
            <h1>Today&apos;s Collection</h1>
          </div>
          <p className="collection-date">
            {summary ? formatDate(summary.localDate) : "Loading…"}
          </p>
          <div className="collection-dial" aria-hidden />
        </header>

        <div className="collection-shelf-frame">
          {error ? <p className="collection-error">{error}</p> : null}
          <div className="collection-grid" aria-label="Today’s records">
            {slots.map((track, index) => (
              <div className="collection-slot" key={trackKey(track) || index}>
                {track ? (
                  <button
                    type="button"
                    className={`collection-record ${
                      trackKey(track) === trackKey(selectedTrack)
                        ? "is-selected"
                        : ""
                    }`}
                    onClick={() => mountTrack(track)}
                    aria-pressed={trackKey(track) === trackKey(selectedTrack)}
                    title={`${track.title} — ${track.artist}`}
                  >
                    <VinylRecord
                      coverUrl={track.coverUrl}
                      isPlaying={
                        activeTrack &&
                        trackKey(track) === trackKey(selectedTrack) &&
                        playbackState.isPlaying
                      }
                      size={116}
                      title={track.title}
                      view3d={false}
                    />
                  </button>
                ) : (
                  <div className="collection-empty" aria-hidden />
                )}
                <div className="collection-rest" aria-hidden />
              </div>
            ))}
          </div>
        </div>

        <footer className="collection-console">
          <div className="collection-meta">
            <Link href="/today" className="collection-back">
              ← Back to listening
            </Link>
            <div className="collection-moods" aria-label="Today’s feelings">
              {(summary?.moodSlots || []).map((label, index) => (
                <div
                  className="collection-mood"
                  key={`${label}-${index}`}
                  title={MOOD_TEXT[label]}
                >
                  <span style={{ background: MOOD_COLOR[label] }}>
                    <MoodEmoji label={label} />
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="collection-player">
            <Turntable
              track={selectedTrack}
              isPlaying={activeTrack && playbackState.isPlaying}
              isLoading={activeTrack && playbackState.isLoading}
              positionMs={activeTrack ? playbackState.positionMs : 0}
              durationMs={selectedTrack?.durationMs || 0}
              onSeek={(position) => {
                if (activeTrack) seek(position);
              }}
              onTogglePlay={togglePlayback}
              discSize={168}
            />
            {selectedTrack && !activeTrack ? (
              <p className="collection-player-hint">Mounted · tap to play</p>
            ) : null}
          </div>
        </footer>
      </section>
    </main>
  );
}
