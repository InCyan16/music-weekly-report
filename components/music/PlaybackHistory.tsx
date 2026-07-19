"use client";

import { cn, formatDuration } from "@/lib/utils";
import { type PlaybackHistoryItem } from "@/lib/music/types";

type PlaybackHistoryProps = {
  history: PlaybackHistoryItem[];
  currentSessionId: string | null;
  onSelect: (index: number) => void;
};

export function PlaybackHistory({
  history,
  currentSessionId,
  onSelect,
}: PlaybackHistoryProps) {
  if (history.length === 0) {
    return (
      <p className="text-center text-sm text-ink-muted">
        今天还没有播放记录，搜索一首歌开始吧
      </p>
    );
  }

  const reversed = [...history].reverse();

  return (
    <div className="space-y-1">
      <h3 className="mb-2 text-xs uppercase tracking-wider text-ink-light">
        今日播放
      </h3>
      <ul className="max-h-40 space-y-1 overflow-auto">
        {reversed.map((item) => {
          const originalIndex = history.indexOf(item);
          const isCurrent = item.sessionId === currentSessionId;
          return (
            <li key={item.sessionId}>
              <button
                onClick={() => onSelect(originalIndex)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-paper-dark",
                  isCurrent && "bg-paper-dark font-medium",
                )}
              >
                <span className="text-ink-light">
                  {item.isQualified ? "✓" : "○"}
                </span>
                <span className="flex-1 truncate">{item.track.title}</span>
                <span className="text-xs text-ink-light truncate max-w-[100px]">
                  {item.track.artist}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
