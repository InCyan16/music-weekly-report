"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { motion } from "framer-motion";
import { type WeeklyReportData } from "@/lib/music/types";
import { formatWeekRange } from "@/lib/dates/week";

const MOOD_TEXT: Record<string, string> = {
  loved: "Loved",
  happy: "Happy",
  calm: "Calm",
  tired: "Tired",
  sad: "Sad",
  very_happy: "Loved",
  low: "Tired",
};

type ShareCardProps = {
  report: WeeklyReportData;
  onClose: () => void;
};

export function ShareCard({ report, onClose }: ShareCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [aspect, setAspect] = useState<"4:5" | "1:1">("4:5");

  async function handleDownload() {
    if (!cardRef.current) return;
    setGenerating(true);
    setError("");

    try {
      await document.fonts.ready;
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        skipFonts: false,
      });

      const link = document.createElement("a");
      link.download = `music-weekly-report-${report.weekStart}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setError("生成图片失败，请重试");
    } finally {
      setGenerating(false);
    }
  }

  const topSong = report.topSongs[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] overflow-auto rounded-2xl bg-white p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">分享图预览</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setAspect("4:5")}
              className={`rounded px-3 py-1 text-sm ${aspect === "4:5" ? "bg-accent text-white" : "bg-paper-dark"}`}
            >
              4:5
            </button>
            <button
              onClick={() => setAspect("1:1")}
              className={`rounded px-3 py-1 text-sm ${aspect === "1:1" ? "bg-accent text-white" : "bg-paper-dark"}`}
            >
              1:1
            </button>
          </div>
        </div>

        <div
          ref={cardRef}
          className="bg-paper text-ink"
          style={{
            width: 540,
            height: aspect === "4:5" ? 675 : 540,
            padding: 40,
            fontFamily: "Georgia, serif",
          }}
        >
          <div className="text-center mb-6">
            <h1 style={{ fontSize: 28, fontWeight: "bold", margin: 0 }}>
              音乐日记
            </h1>
            <p style={{ fontSize: 12, color: "#6B6560", marginTop: 4 }}>
              {formatWeekRange(report.weekStart, report.weekEnd)}
            </p>
          </div>

          {topSong && (
            <div
              style={{
                background: "#1A1A1A",
                borderRadius: 12,
                padding: 20,
                color: "white",
                marginBottom: 20,
                textAlign: "center",
              }}
            >
              <p style={{ fontSize: 10, opacity: 0.7, margin: 0 }}>#1</p>
              <p style={{ fontSize: 20, fontWeight: "bold", margin: "8px 0 4px" }}>
                {topSong.title}
              </p>
              <p style={{ fontSize: 12, opacity: 0.7, margin: 0 }}>
                {topSong.artist} · {topSong.validPlayCount} 次
              </p>
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 14, fontWeight: "bold", marginBottom: 8 }}>
              Top 5
            </p>
            {report.topSongs.map((song) => (
              <div
                key={song.songId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  padding: "4px 0",
                  borderBottom: "1px solid #E8E0D4",
                }}
              >
                <span>
                  {song.rank}. {song.title}
                </span>
                <span style={{ color: "#6B6560" }}>{song.validPlayCount}次</span>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              fontSize: 11,
              marginBottom: 16,
            }}
          >
            <div>总播放 {report.totalValidPlays} 次</div>
            <div>听音 {report.activeDays} 天</div>
            <div>歌曲 {report.uniqueSongCount} 首</div>
            <div>
              心情{" "}
              {report.dominantMood
                ? MOOD_TEXT[report.dominantMood]
                : "—"}
            </div>
          </div>

          {report.moodSummary && (
            <p
              style={{
                fontSize: 11,
                color: "#6B6560",
                lineHeight: 1.5,
                marginBottom: 16,
              }}
            >
              {report.moodSummary}
            </p>
          )}

          <div
            style={{
              textAlign: "center",
              fontSize: 10,
              color: "#9A948C",
              borderTop: "1px solid #E8E0D4",
              paddingTop: 12,
            }}
          >
            music-diary.app · {new Date().toLocaleDateString("zh-CN")}
          </div>
        </div>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <div className="mt-4 flex gap-3">
          <button
            onClick={handleDownload}
            disabled={generating}
            className="flex-1 rounded-full bg-accent py-2.5 text-white disabled:opacity-50"
          >
            {generating ? "生成中..." : "下载 PNG"}
          </button>
          <button
            onClick={onClose}
            className="rounded-full border border-paper-dark px-6 py-2.5"
          >
            关闭
          </button>
        </div>
      </div>
    </motion.div>
  );
}
