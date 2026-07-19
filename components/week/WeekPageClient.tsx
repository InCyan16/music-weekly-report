"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatWeekRange } from "@/lib/dates/week";

type WeekProgress = {
  weekStart: string;
  weekEnd: string;
  totalValidPlays: number;
  activeDays: number;
  moodDays: number;
  hasTodayMood: boolean;
  daysUntilSunday: number;
};

export function WeekPageClient() {
  const [progress, setProgress] = useState<WeekProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports", { method: "POST" })
      .then((r) => r.json())
      .then(setProgress)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-ink-muted">加载中...</p>
      </main>
    );
  }

  if (!progress) return null;

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <Link href="/today" className="mb-8 inline-block text-sm text-ink-muted hover:text-ink">
        ← 返回聆听
      </Link>

      <h1 className="font-display mb-2 text-3xl font-bold">本周进度</h1>
      <p className="mb-8 text-ink-muted">
        {formatWeekRange(progress.weekStart, progress.weekEnd)}
      </p>

      <div className="space-y-4">
        <StatCard label="有效播放次数" value={progress.totalValidPlays} unit="次" />
        <StatCard label="听音乐天数" value={progress.activeDays} unit="天" />
        <StatCard label="心情记录天数" value={progress.moodDays} unit="天" />
      </div>

      <div className="mt-8 rounded-xl border border-paper-dark bg-white/50 p-6 text-center">
        {progress.daysUntilSunday === 0 ? (
          <>
            <p className="mb-4 text-lg font-medium">今天是周日，周报已就绪！</p>
            <Link
              href={`/report/${progress.weekStart}`}
              className="inline-block rounded-full bg-accent px-8 py-3 text-white hover:bg-accent-dark"
            >
              查看本周周报
            </Link>
          </>
        ) : (
          <p className="text-ink-muted">
            距离周报还有 <span className="font-bold text-accent">{progress.daysUntilSunday}</span> 天
          </p>
        )}
      </div>

      {!progress.hasTodayMood && progress.totalValidPlays > 0 && (
        <p className="mt-4 text-center text-sm text-ink-muted">
          今天还没有记录心情哦
        </p>
      )}

      <p className="mt-8 text-center text-xs text-ink-light">
        Top 5 排名将在周日揭晓
      </p>
    </main>
  );
}

function StatCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-paper-dark bg-white px-6 py-4">
      <span className="text-ink-muted">{label}</span>
      <span className="font-display text-2xl font-bold">
        {value}
        <span className="ml-1 text-sm font-normal text-ink-muted">{unit}</span>
      </span>
    </div>
  );
}
