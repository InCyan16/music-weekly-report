"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MOOD_OPTIONS,
  primaryMoodFromSlots,
  type MoodLabel,
} from "@/lib/music/types";
import { MoodEmoji } from "@/components/mood/MoodEmoji";
import { cn } from "@/lib/utils";
import "./mood-box.css";

const SLOT_MAX = 5;
const SLOT_SPREADS = [-28, -14, 0, 14, 28];
const SLOT_TILTS = [-18, -8, 4, -6, 12];

function MiniVinyl({
  label,
  text,
  size,
}: {
  label: MoodLabel;
  text?: string;
  size?: "box" | "ghost";
}) {
  const mood = MOOD_OPTIONS.find((m) => m.label === label)!;
  return (
    <div
      className={cn(
        "mood-mini-vinyl",
        size === "box" && "mood-mini-vinyl--box",
        size === "ghost" && "mood-mini-vinyl--ghost",
      )}
    >
      <div className="mood-mini-disc">
        <div className="mood-mini-sheen" aria-hidden />
        <div className="mood-mini-grooves" aria-hidden />
        <div
          className="mood-mini-label"
          style={{ background: mood.color }}
        >
          <MoodEmoji label={label} />
        </div>
        <div className="mood-mini-hole" aria-hidden />
      </div>
      {text ? <span className="mood-mini-text">{text}</span> : null}
    </div>
  );
}

export function MoodPicker() {
  const [slots, setSlots] = useState<MoodLabel[]>([]);
  const [phase, setPhase] = useState<"picking" | "complete">("picking");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lidClose, setLidClose] = useState(0);
  const [lidDragging, setLidDragging] = useState(false);
  const [ghostLabel, setGhostLabel] = useState<MoodLabel | null>(null);
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const dragLabel = useRef<MoodLabel | null>(null);
  const dragMoved = useRef(false);
  const lidCloseRef = useRef(0);
  const lidDrag = useRef<{ startY: number; active: boolean }>({
    startY: 0,
    active: false,
  });

  const full = slots.length >= SLOT_MAX;
  const canClose = slots.length > 0;

  const addSlot = useCallback((label: MoodLabel) => {
    setSlots((prev) => (prev.length >= SLOT_MAX ? prev : [...prev, label]));
  }, []);

  const removeSlot = useCallback((index: number) => {
    setSlots((prev) => prev.filter((_, slotIndex) => slotIndex !== index));
  }, []);

  const goNext = () => {
    router.push("/today/summary");
  };

  async function handleContinue() {
    const primary = primaryMoodFromSlots(slots);
    if (!primary) {
      goNext();
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moodSlots: slots,
        }),
      });
      if (!res.ok) throw new Error("保存失败");
      goNext();
    } catch {
      setError("保存心情失败，请重试");
      setSaving(false);
    }
  }

  function onPointerDownItem(label: MoodLabel, e: React.PointerEvent) {
    if (phase !== "picking" || full) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    dragLabel.current = label;
    dragMoved.current = false;
    setGhostLabel(label);
    if (ghostRef.current) {
      ghostRef.current.style.left = `${e.clientX}px`;
      ghostRef.current.style.top = `${e.clientY}px`;
    }
  }

  function onPointerMove(e: React.PointerEvent | PointerEvent) {
    if (!dragLabel.current) {
      if (lidDrag.current.active) {
        const delta = Math.max(0, e.clientY - lidDrag.current.startY);
        const next = Math.min(delta / 120, 1);
        lidCloseRef.current = next;
        setLidClose(next);
      }
      return;
    }
    if (Math.hypot(e.movementX, e.movementY) > 0) dragMoved.current = true;
    if (ghostRef.current) {
      ghostRef.current.style.left = `${e.clientX}px`;
      ghostRef.current.style.top = `${e.clientY}px`;
    }
  }

  function onPointerUp(e: React.PointerEvent | PointerEvent) {
    if (lidDrag.current.active) {
      lidDrag.current.active = false;
      setLidDragging(false);
      const progress = Math.max(
        lidCloseRef.current,
        (e.clientY - lidDrag.current.startY) / 120,
      );
      if (progress > 0.4) {
        setPhase("complete");
        lidCloseRef.current = 1;
        setLidClose(1);
      } else {
        lidCloseRef.current = 0;
        setLidClose(0);
      }
      return;
    }

    const label = dragLabel.current;
    if (!label) return;
    dragLabel.current = null;
    setGhostLabel(null);
    const box = boxRef.current?.getBoundingClientRect();
    const hit =
      !!box &&
      e.clientX >= box.left &&
      e.clientX <= box.right &&
      e.clientY >= box.top &&
      e.clientY <= box.bottom;
    if (hit || !dragMoved.current) addSlot(label);
    dragMoved.current = false;
  }

  const dateLabel = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className="mood-screen relative flex h-full w-full flex-col"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="mood-spot" aria-hidden />
      <div className="mood-desk" aria-hidden />

      <header className="mood-top">
        <div className="mood-eyebrow">
          <span className="mood-eyebrow-label">Daily wrap</span>
          <span className="mood-eyebrow-date">{dateLabel}</span>
        </div>
        <div className="mood-heading">
          <h1 className="mood-title">
            How did today&apos;s music make you feel?
          </h1>
          <p className="mood-subtitle">Drag your feeling into the music box</p>
        </div>
        <span className="mood-skip" aria-hidden>
          1–5 RECORDS
        </span>
      </header>

      <div className="mood-workspace">
        <aside className="mood-tray" aria-label="Today I felt">
          <div className="mood-tray-tape" aria-hidden />
          <div className="mood-tray-label">Today I Felt</div>
          <div className="mood-tray-list">
            {MOOD_OPTIONS.map((mood) => (
              <button
                key={mood.label}
                type="button"
                className="mood-tray-item"
                onPointerDown={(e) => onPointerDownItem(mood.label, e)}
              >
                <MiniVinyl label={mood.label} text={mood.text} />
              </button>
            ))}
          </div>
        </aside>

        <div
          className={cn(
            "mood-box-stage",
            slots.length > 0 && "has-slots",
            canClose && "is-ready",
          )}
        >
          <div className="mood-drag-hint" aria-hidden />
          <div className="music-box-scene">
            <div
              ref={boxRef}
              className={cn("music-box", full && "is-full")}
              data-lid={phase === "complete" ? "closed" : "open"}
              data-count={slots.length}
              style={
                {
                  ["--lid-close" as string]:
                    phase === "complete" ? 1 : lidClose,
                } as React.CSSProperties
              }
            >
              <div
                className="music-box-lid"
                style={
                  {
                    ["--lid-close" as string]:
                      phase === "complete" ? 1 : lidClose,
                    transition: lidDragging ? "none" : undefined,
                  } as React.CSSProperties
                }
                onPointerDown={(e) => {
                  if (!canClose || phase !== "picking") return;
                  e.preventDefault();
                  lidDrag.current = { active: true, startY: e.clientY };
                  setLidDragging(true);
                  (e.currentTarget as HTMLElement).setPointerCapture?.(
                    e.pointerId,
                  );
                }}
              >
                <div className="music-box-lid-outer" />
                <div className="music-box-lid-inner">
                  <span className="music-box-lid-title">
                    Today&apos;s Music Box
                  </span>
                  <span className="music-box-count">
                    {slots.length} / {SLOT_MAX}
                  </span>
                  <div className="music-box-lid-rules" aria-hidden />
                </div>
              </div>

              <div className="music-box-hinges" aria-hidden>
                <i />
                <i />
              </div>

              <div className="music-box-cavity">
                <div className="music-box-cavity-shade" aria-hidden />
                <div className="music-box-slots">
                  {slots.length === 0 ? (
                    <div className="mood-slot-placeholder">
                      Drop feelings here
                    </div>
                  ) : (
                    slots.map((label, i) => (
                      <button
                        type="button"
                        key={`${label}-${i}`}
                        className="mood-slot filled"
                        aria-label={`Remove ${label} mood`}
                        onClick={() => removeSlot(i)}
                        style={
                          {
                            ["--sx" as string]: `${SLOT_SPREADS[i] ?? (i - 2) * 14}px`,
                            ["--sr" as string]: `${SLOT_TILTS[i] ?? (i - 2) * 6}deg`,
                            ["--sz" as string]: 10 + i,
                          } as React.CSSProperties
                        }
                      >
                        <MiniVinyl label={label} size="box" />
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="music-box-shell">
                <div className="music-box-rim" aria-hidden />
                <div className="music-box-front">
                  <p>Every song, every feeling, becomes a memory.</p>
                  <div className="music-box-wave" aria-hidden>
                    {Array.from({ length: 13 }).map((_, i) => (
                      <span key={i} />
                    ))}
                  </div>
                </div>
                <i className="music-box-rivet r1" />
                <i className="music-box-rivet r2" />
                <i className="music-box-rivet r3" />
                <i className="music-box-rivet r4" />
              </div>
            </div>
          </div>

          {phase === "picking" ? (
            <p className={cn("mood-lid-hint", canClose && "ready")}>
              {canClose
                ? "Slide the lid closed to seal today's feelings"
                : "Drop 1–5 feelings into the box"}
            </p>
          ) : null}
          {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
        </div>
      </div>

      <div className="mood-decor" aria-hidden>
        <div className="mood-decor-sleeve" />
        <div className="mood-decor-polaroid" />
        <div className="mood-decor-clip" />
        <div className="mood-decor-pen" />
      </div>

      <div
        ref={ghostRef}
        className={cn("mood-drag-ghost", !ghostLabel && "hidden")}
        aria-hidden
      >
        {ghostLabel ? (
          <>
            <div className="mood-drag-trail" />
            <MiniVinyl label={ghostLabel} size="ghost" />
          </>
        ) : null}
      </div>

      {phase === "complete" ? (
        <div className="mood-complete">
          <button
            type="button"
            disabled={saving}
            onClick={handleContinue}
            className="rounded-full border border-white/20 bg-white/10 px-8 py-3 text-sm font-semibold backdrop-blur hover:bg-white/15 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Enter Today’s Report"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
