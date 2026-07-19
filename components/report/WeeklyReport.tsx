"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { type WeeklyReportData } from "@/lib/music/types";
import { VinylRecord } from "@/components/music/VinylRecord";
import { ShareCard } from "@/components/report/ShareCard";
import { formatWeekRange } from "@/lib/dates/week";
import { cn } from "@/lib/utils";

const MOOD_TEXT: Record<string, string> = {
  very_happy: "非常开心",
  happy: "开心",
  calm: "平静",
  low: "低落",
  sad: "难过",
};

export function WeeklyReportView({ weekId }: { weekId: string }) {
  const [report, setReport] = useState<WeeklyReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [focusedRank, setFocusedRank] = useState<number | null>(null);
  const [showShare, setShowShare] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    fetch(`/api/reports?weekId=${weekId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setReport(d.report);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [weekId]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-ink-muted">生成周报中...</p>
      </main>
    );
  }

  if (error || !report) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-red-600">{error || "周报加载失败"}</p>
        <Link href="/week" className="text-accent underline">
          返回
        </Link>
      </main>
    );
  }

  const topSong = report.topSongs[0];

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Link href="/reports" className="mb-6 inline-block text-sm text-ink-muted hover:text-ink">
        ← 历史报告
      </Link>

      <header className="mb-8 text-center">
        <h1 className="font-display text-4xl font-bold">音乐周报</h1>
        <p className="mt-2 text-ink-muted">
          {formatWeekRange(report.weekStart, report.weekEnd)}
        </p>
      </header>

      {/* Stats overview */}
      <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        <MiniStat label="总播放" value={`${report.totalValidPlays}次`} />
        <MiniStat label="听音天数" value={`${report.activeDays}天`} />
        <MiniStat label="不同歌曲" value={`${report.uniqueSongCount}首`} />
        <MiniStat
          label="主导心情"
          value={
            report.dominantMood
              ? MOOD_TEXT[report.dominantMood] || report.dominantMood
              : "—"
          }
        />
      </div>

      {/* Desktop: surrounding vinyls */}
      <div className="relative mb-12 hidden min-h-[500px] md:block">
        {/* Central turntable placeholder */}
        <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
          <div className="flex h-32 w-48 items-center justify-center rounded-xl bg-gradient-to-b from-[#3a3a3a] to-[#2a2a2a] shadow-turntable">
            <span className="text-white text-sm">♪ 唱机</span>
          </div>
        </div>

        {report.topSongs.map((song, i) => {
          const positions = [
            { top: "5%", left: "10%" },
            { top: "5%", right: "10%" },
            { bottom: "10%", left: "5%" },
            { bottom: "10%", right: "5%" },
            { top: "40%", left: "2%" },
          ];
          const pos = positions[i] || positions[0];
          const isFocused = focusedRank === song.rank;
          const isHidden = focusedRank !== null && !isFocused;

          return (
            <motion.div
              key={song.songId}
              className="absolute"
              style={pos}
              animate={
                isFocused
                  ? {
                      top: "50%",
                      left: "50%",
                      x: "-50%",
                      y: "-50%",
                      scale: 1.3,
                      opacity: 1,
                      zIndex: 30,
                    }
                  : isHidden
                    ? { opacity: 0, scale: 0.5 }
                    : { opacity: 1, scale: 1 }
              }
              transition={reduceMotion ? { duration: 0 } : { duration: 0.5 }}
            >
              <div className="text-center">
                <VinylRecord
                  coverUrl={song.coverUrl}
                  isPlaying={false}
                  size={isFocused ? 200 : 120}
                  title={song.title}
                  rank={song.rank}
                  onClick={() =>
                    setFocusedRank(isFocused ? null : song.rank)
                  }
                />
                <p className="mt-2 max-w-[120px] truncate text-xs font-medium">
                  {song.title}
                </p>
                <p className="text-xs text-ink-muted">
                  {song.validPlayCount} 次
                </p>
              </div>

              {isFocused && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 w-64 rounded-xl bg-white p-4 shadow-lg text-left"
                >
                  <h3 className="font-bold">{song.title}</h3>
                  <p className="text-sm text-ink-muted">{song.artist}</p>
                  <div className="mt-3 space-y-1 text-sm">
                    <p>排名：#{song.rank}</p>
                    <p>播放次数：{song.validPlayCount}</p>
                    <p>
                      占比：
                      {report.totalValidPlays > 0
                        ? Math.round(
                            (song.validPlayCount / report.totalValidPlays) *
                              100,
                          )
                        : 0}
                      %
                    </p>
                  </div>
                  <button
                    onClick={() => setFocusedRank(null)}
                    className="mt-3 text-sm text-accent hover:underline"
                  >
                    关闭
                  </button>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Mobile: horizontal scroll */}
      <div className="mb-10 md:hidden">
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
          {report.topSongs.map((song) => (
            <div key={song.songId} className="flex-shrink-0 snap-center text-center">
              <VinylRecord
                coverUrl={song.coverUrl}
                isPlaying={false}
                size={140}
                title={song.title}
                rank={song.rank}
                onClick={() =>
                  setFocusedRank(
                    focusedRank === song.rank ? null : song.rank,
                  )
                }
              />
              <p className="mt-2 max-w-[140px] truncate text-sm font-medium">
                {song.title}
              </p>
              <p className="text-xs text-ink-muted">
                {song.validPlayCount} 次
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Top 5 list */}
      <div className="mb-10 space-y-3">
        <h2 className="font-display text-xl font-bold">Top 5</h2>
        {report.topSongs.map((song) => (
          <div
            key={song.songId}
            className="flex items-center gap-4 rounded-xl border border-paper-dark bg-white px-4 py-3"
          >
            <span className="font-display text-2xl font-bold text-accent w-8">
              {song.rank}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{song.title}</p>
              <p className="text-sm text-ink-muted truncate">{song.artist}</p>
            </div>
            <span className="text-sm text-ink-muted">
              {song.validPlayCount} 次
            </span>
          </div>
        ))}
      </div>

      {/* Mood summary */}
      {report.moodSummary && (
        <div className="mb-10 rounded-xl border border-paper-dark bg-white/50 p-6">
          <h2 className="font-display mb-3 text-xl font-bold">情绪总结</h2>
          <p className="leading-relaxed text-ink-muted">{report.moodSummary}</p>
          {report.averageMood && (
            <p className="mt-3 text-sm text-ink-light">
              平均心情：{report.averageMood.toFixed(1)} / 5
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-center gap-4">
        <button
          onClick={() => setShowShare(true)}
          className="rounded-full bg-accent px-8 py-3 text-white hover:bg-accent-dark"
        >
          保存分享图
        </button>
        <Link
          href="/today"
          className="rounded-full border border-ink px-8 py-3 hover:bg-ink hover:text-white"
        >
          继续聆听
        </Link>
      </div>

      <AnimatePresence>
        {showShare && (
          <ShareCard report={report} onClose={() => setShowShare(false)} />
        )}
      </AnimatePresence>
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-paper-dark bg-white px-4 py-3 text-center">
      <p className="text-xs text-ink-muted">{label}</p>
      <p className="font-display text-lg font-bold">{value}</p>
    </div>
  );
}
