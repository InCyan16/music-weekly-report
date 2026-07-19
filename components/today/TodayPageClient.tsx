"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePlayerStore } from "@/stores/player-store";
import { MusicSearch } from "@/components/music/MusicSearch";
import { SwipeableTurntable } from "@/components/music/Turntable";
import { WeekDayDots } from "@/components/week/WeekDayDots";
import { getBrowserTimezone } from "@/lib/dates/timezone";

export function TodayPageClient() {
  const router = useRouter();
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [musicConnected, setMusicConnected] = useState<boolean | null>(null);
  const isMock = process.env.NEXT_PUBLIC_USE_MOCK_MUSIC_PROVIDER === "true";

  const {
    playbackState,
    todayValidPlayCount,
    isMockMode,
    init,
    connect,
    search,
    playTrack,
    pause,
    resume,
    seek,
    nextInHistory,
    previousInHistory,
    endDayListening,
    setTodayValidPlayCount,
  } = usePlayerStore();

  useEffect(() => {
    const cleanup = init();
    fetch("/api/playback/today-count")
      .then((r) => r.json())
      .then((d) => setTodayValidPlayCount(d.count))
      .catch(() => {});

    if (!isMock) {
      fetch("/api/music/status")
        .then((r) => r.json())
        .then((d) => setMusicConnected(d.connected))
        .catch(() => setMusicConnected(false));
    } else {
      setMusicConnected(true);
      connect().catch(() => {});
    }

    // Set timezone on first visit
    fetch("/api/profile/timezone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone: getBrowserTimezone() }),
    }).catch(() => {});

    return cleanup;
  }, [init, connect, setTodayValidPlayCount, isMock]);

  useEffect(() => {
    if (musicConnected && !isMock) {
      connect().catch(() => {});
    }
  }, [musicConnected, connect, isMock]);

  const today = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  async function handleEndDay() {
    if (todayValidPlayCount === 0) {
      alert("先完整听一会儿音乐，再记录今天的心情吧。");
      return;
    }
    setShowEndConfirm(true);
  }

  async function confirmEndDay() {
    await endDayListening();
    router.push("/today/mood");
  }

  if (musicConnected === false && !isMock) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <h1 className="font-display mb-4 text-2xl font-bold">
          连接音乐账户
        </h1>
        <p className="mb-6 text-ink-muted">
          播放音乐前需要先连接你的音乐平台账户
        </p>
        <Link
          href="/connect-music"
          className="rounded-full bg-accent px-8 py-3 text-white hover:bg-accent-dark"
        >
          去连接
        </Link>
      </main>
    );
  }

  return (
    <main className="flex h-dvh max-h-dvh w-full flex-col overflow-hidden px-8 py-4">
      <header className="mb-0 shrink-0">
        <div className="flex items-center justify-between">
          <p className="text-sm text-ink-muted">{today}</p>
          <nav className="flex gap-4 text-sm">
            <Link href="/week" className="text-ink-muted hover:text-ink">
              本周
            </Link>
            <Link href="/reports" className="text-ink-muted hover:text-ink">
              报告
            </Link>
            <Link href="/settings" className="text-ink-muted hover:text-ink">
              设置
            </Link>
          </nav>
        </div>
      </header>

      {isMockMode && (
        <div className="mb-1 shrink-0 rounded-lg border border-dashed border-accent bg-accent/5 px-3 py-1.5 text-center text-xs text-accent-dark">
          Development Playback Mode
        </div>
      )}

      <div className="shrink-0 pt-3">
        <h1 className="font-display mb-3 text-center text-[clamp(1.5rem,4.5dvh,2.75rem)] font-extrabold leading-[1.15] tracking-tight">
          你今天喜欢听什么音乐？
        </h1>
        <MusicSearch onSelect={playTrack} onSearch={search} />
      </div>

      {playbackState.error && (
        <div className="mt-1 shrink-0 rounded-lg bg-red-50 p-2 text-center text-xs text-red-600">
          {playbackState.error}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
        <SwipeableTurntable
          track={playbackState.track}
          isPlaying={playbackState.isPlaying}
          isLoading={playbackState.isLoading}
          positionMs={playbackState.positionMs}
          durationMs={playbackState.durationMs}
          onSeek={seek}
          onTogglePlay={() =>
            playbackState.isPlaying ? pause() : resume()
          }
          onSwipeLeft={nextInHistory}
          onSwipeRight={previousInHistory}
        />
      </div>

      <WeekDayDots className="mt-2 shrink-0" refreshKey={todayValidPlayCount} />

      <div className="mt-2 shrink-0 pb-[max(8px,env(safe-area-inset-bottom))] text-center">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={handleEndDay}
            className="rounded-full border-2 border-ink px-6 py-2 text-sm font-medium transition-colors hover:bg-ink hover:text-white"
          >
            结束今天的聆听
          </button>
          <button
            onClick={() => router.push("/today/mood")}
            className="rounded-full border border-white/70 bg-white/55 px-5 py-2 text-sm font-medium backdrop-blur-xl transition-colors hover:bg-white/70"
          >
            心情 · 临时
          </button>
        </div>
        {todayValidPlayCount > 0 && (
          <p className="mt-1 text-xs text-ink-muted">
            今日有效播放 {todayValidPlayCount} 次
          </p>
        )}
      </div>

      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <p className="mb-6 text-lg">
              今天你听了 {todayValidPlayCount}{" "}
              次音乐，准备记录此刻的心情吗？
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 rounded-full border border-paper-dark py-2.5"
              >
                继续听
              </button>
              <button
                onClick={confirmEndDay}
                className="flex-1 rounded-full bg-accent py-2.5 text-white"
              >
                记录心情
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
