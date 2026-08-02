"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { type Track } from "@/lib/music/types";
import { formatDuration, cn } from "@/lib/utils";
import Image from "next/image";

type MusicSearchProps = {
  onSelect: (track: Track) => void;
  onSearch: (query: string) => Promise<Track[]>;
};

export function MusicSearch({
  onSelect,
  onSearch,
}: MusicSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const doSearch = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setResults([]);
        setIsOpen(false);
        return;
      }

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setLoading(true);
      setError("");
      try {
        const tracks = await onSearch(q);
        setResults(tracks);
        setIsOpen(true);
        setSelectedIndex(-1);
      } catch (err) {
        setError(err instanceof Error ? err.message : "搜索失败");
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [onSearch],
  );

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(timer);
  }, [query, doSearch]);

  function handleSelect(track: Track) {
    if (!track.playable) {
      setError("当前歌曲暂不可播放");
      return;
    }
    onSelect(track);
    setIsOpen(false);
    setQuery("");
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div className="relative mx-auto w-[min(65vw,420px)]">
      <label htmlFor="music-search" className="sr-only">
        搜索音乐
      </label>
      <div className="flex items-center gap-3 rounded-full border border-white/20 bg-white/[0.065] px-6 py-[11px] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_10px_32px_rgba(0,0,0,0.14)] backdrop-blur-2xl focus-within:border-white/35 focus-within:bg-white/[0.09] focus-within:ring-2 focus-within:ring-white/[0.04]">
        <input
          ref={inputRef}
          id="music-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder=""
          className="min-w-0 flex-1 border-none bg-transparent text-[16px] font-medium text-white outline-none"
          autoComplete="off"
        />
        <span className="shrink-0 text-lg text-white/40" aria-hidden>⌕</span>
      </div>

      {loading && (
        <div className="absolute right-14 top-1/2 -translate-y-1/2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      )}

      {error && (
        <p className="mt-2 text-center text-sm text-red-600">{error}</p>
      )}

      {isOpen && (
        <ul
          className="absolute z-50 mt-2 max-h-80 w-full overflow-auto rounded-2xl border border-white/15 bg-[#1b1815]/90 text-white shadow-[0_22px_60px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
          role="listbox"
        >
          {loading && results.length === 0 && (
            <li className="px-4 py-6 text-center text-ink-muted">
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex animate-pulse gap-3">
                    <div className="h-10 w-10 rounded bg-paper-dark" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 w-3/4 rounded bg-paper-dark" />
                      <div className="h-2 w-1/2 rounded bg-paper-dark" />
                    </div>
                  </div>
                ))}
              </div>
            </li>
          )}

          {!loading && results.length === 0 && query.length >= 2 && (
            <li className="px-4 py-6 text-center text-ink-muted">
              没有找到相关歌曲
            </li>
          )}

          {results.map((track, index) => (
              <li
                key={`${track.source}-${track.externalId}`}
                role="option"
                aria-selected={index === selectedIndex}
                className={cn(
                  "flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.07]",
                  index === selectedIndex && "bg-white/[0.07]",
                  !track.playable && "opacity-50",
                )}
                onClick={() => handleSelect(track)}
              >
                <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded">
                  {track.coverUrl ? (
                    <Image
                      src={track.coverUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-paper-dark text-xs">
                      ♪
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">
                    {track.title}
                  </p>
                  <p className="truncate text-sm text-white/55">
                    {track.artist}
                    {track.album && ` · ${track.album}`}
                  </p>
                </div>
                <span className="text-xs text-white/35">
                  {formatDuration(track.durationMs)}
                </span>
                {!track.playable && (
                  <span className="text-xs text-red-500">不可播放</span>
                )}
              </li>
          ))}
        </ul>
      )}
    </div>
  );
}
