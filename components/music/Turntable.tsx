"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VinylRecord } from "./VinylRecord";
import { type Track } from "@/lib/music/types";

import { calcDiscSize, calcSceneHeight, calcSceneWidth } from "@/lib/ui/vinyl-layout";

function useDiscSize() {
  const [size, setSize] = useState(400);

  useEffect(() => {
    const calc = () => {
      setSize(calcDiscSize(window.innerWidth, window.innerHeight));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  return size;
}

type TurntableProps = {
  track: Track | null;
  isPlaying: boolean;
  isLoading: boolean;
  positionMs: number;
  durationMs: number;
  onSeek: (ms: number) => void;
  onTogglePlay?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  children?: React.ReactNode;
};

function normalizeAngle(a: number) {
  let v = a % 360;
  if (v > 180) v -= 360;
  if (v < -180) v += 360;
  return v;
}

export function Turntable({
  track,
  isPlaying,
  isLoading,
  positionMs,
  durationMs,
  onSeek,
  onTogglePlay,
  onSwipeLeft,
  onSwipeRight,
  children,
}: TurntableProps) {
  const discSize = useDiscSize();
  const stageWidth = calcSceneWidth(discSize);
  const stageHeight = calcSceneHeight(discSize);
  const stageRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubRotation, setScrubRotation] = useState(0);
  const gestureRef = useRef<{
    mode: "rotate" | "swipe" | null;
    startX: number;
    startY: number;
    startAngle: number;
    startPositionMs: number;
    active: boolean;
  }>({
    mode: null,
    startX: 0,
    startY: 0,
    startAngle: 0,
    startPositionMs: 0,
    active: false,
  });

  const angleAt = useCallback((x: number, y: number) => {
    const el = stageRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    return (Math.atan2(y - cy, x - cx) * 180) / Math.PI;
  }, []);

  const handlePointerDown = (x: number, y: number) => {
    if (!track) return;
    gestureRef.current = {
      mode: null,
      startX: x,
      startY: y,
      startAngle: angleAt(x, y),
      startPositionMs: positionMs,
      active: true,
    };
  };

  const handlePointerMove = (x: number, y: number) => {
    const g = gestureRef.current;
    if (!g.active || !track) return;

    const dx = x - g.startX;
    const dy = y - g.startY;
    const dist = Math.hypot(dx, dy);

    if (!g.mode && dist > 8) {
      const angleDelta = Math.abs(normalizeAngle(angleAt(x, y) - g.startAngle));
      g.mode = angleDelta > Math.abs(dx) * 0.4 ? "rotate" : "swipe";
    }

    if (g.mode === "rotate") {
      setIsScrubbing(true);
      const deltaAngle = normalizeAngle(angleAt(x, y) - g.startAngle);
      const deltaMs = (deltaAngle / 360) * durationMs;
      const newPos = Math.max(
        0,
        Math.min(g.startPositionMs + deltaMs, durationMs),
      );
      setScrubRotation((newPos / durationMs) * 360);
      onSeek(newPos);
    }
  };

  const handlePointerUp = (x: number) => {
    const g = gestureRef.current;
    if (!g.active) return;

    const mode = g.mode;
    g.active = false;

    if (mode === "swipe") {
      const diff = x - g.startX;
      if (diff < -80) onSwipeLeft?.();
      else if (diff > 80) onSwipeRight?.();
    } else if (mode === "rotate") {
      setIsScrubbing(false);
    } else if (track && !isLoading) {
      onTogglePlay?.();
    }

    g.mode = null;
  };

  const playbackRotation =
    durationMs > 0 ? (positionMs / durationMs) * 360 : 0;

  return (
    <div className="relative mx-auto w-full">
      <div
        ref={stageRef}
        role={track ? "button" : undefined}
        aria-label={
          track ? (isPlaying ? "暂停" : "播放") : undefined
        }
        className="relative mx-auto flex cursor-grab justify-center active:cursor-grabbing"
        style={{
          width: stageWidth,
          height: stageHeight,
          touchAction: "pan-y",
        }}
        onKeyDown={(e) => {
          if (
            track &&
            !isLoading &&
            (e.key === "Enter" || e.key === " ")
          ) {
            e.preventDefault();
            onTogglePlay?.();
          }
        }}
        tabIndex={track ? 0 : undefined}
        onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
        onMouseMove={(e) => {
          if (gestureRef.current.active) handlePointerMove(e.clientX, e.clientY);
        }}
        onMouseUp={(e) => handlePointerUp(e.clientX)}
        onMouseLeave={(e) => {
          if (gestureRef.current.active) handlePointerUp(e.clientX);
        }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          handlePointerDown(t.clientX, t.clientY);
        }}
        onTouchMove={(e) => {
          const t = e.touches[0];
          handlePointerMove(t.clientX, t.clientY);
          if (gestureRef.current.mode === "rotate") e.preventDefault();
        }}
        onTouchEnd={(e) => handlePointerUp(e.changedTouches[0].clientX)}
      >
        <VinylRecord
          coverUrl={track?.coverUrl}
          isPlaying={isPlaying && !isLoading && !isScrubbing}
          size={discSize}
          title={track?.title}
          rotationDeg={isScrubbing ? scrubRotation : playbackRotation}
          isScrubbing={isScrubbing}
        />
      </div>

      {track && (
        <div className="mt-1 text-center">
          <h2 className="font-display truncate text-base font-bold text-ink">
            {track.title}
          </h2>
          <p className="truncate text-xs text-ink-muted">{track.artist}</p>
        </div>
      )}

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      )}

      {children}
    </div>
  );
}

/** @deprecated Use Turntable directly — swipe is built into vinyl gestures */
export function SwipeableTurntable(props: TurntableProps & {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}) {
  return <Turntable {...props} />;
}
