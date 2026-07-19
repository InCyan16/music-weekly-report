"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { MOOD_OPTIONS, type MoodLabel } from "@/lib/music/types";
import { cn } from "@/lib/utils";
import { MoodEmoji } from "@/components/mood/MoodEmoji";

export function MoodPicker() {
  const [selected, setSelected] = useState<MoodLabel | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  async function handleSave() {
    if (!selected) return;
    const mood = MOOD_OPTIONS.find((m) => m.label === selected)!;
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moodScore: mood.score,
          moodLabel: mood.label,
        }),
      });

      if (!res.ok) throw new Error("保存失败");

      const now = new Date();
      const isSunday = now.getDay() === 0;
      if (isSunday) {
        router.push("/reports");
      } else {
        router.push("/week");
      }
    } catch {
      setError("保存心情失败，请重试");
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-between py-[8vh]">
      <motion.h1
        className="font-display shrink-0 text-center text-[clamp(1.75rem,4.5dvh,2.75rem)] font-extrabold leading-[1.15] tracking-tight"
        initial={reduceMotion ? false : { opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        你今天听音乐的心情如何？
      </motion.h1>

      <div
        className="flex flex-1 items-center justify-center"
        role="radiogroup"
        aria-label="心情选择"
      >
        <div className="flex flex-nowrap items-center justify-center gap-[10px]">
          {MOOD_OPTIONS.map((mood, index) => {
            const isSelected = selected === mood.label;
            return (
              <motion.button
                key={mood.label}
                role="radio"
                aria-checked={isSelected}
                aria-label={mood.text}
                onClick={() => setSelected(mood.label)}
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: index * 0.06,
                  ease: "easeOut",
                }}
                whileHover={
                  reduceMotion ? undefined : { y: -4, scale: 1.04 }
                }
                whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                className={cn(
                  "relative h-[clamp(3.75rem,8.5dvh,5.25rem)] w-[clamp(3.75rem,8.5dvh,5.25rem)] rounded-full p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
                  isSelected && "z-10",
                )}
              >
                {isSelected && (
                  <motion.span
                    className="pointer-events-none absolute -inset-1 rounded-full border-[3px] border-accent"
                    layoutId="mood-ring"
                    initial={false}
                    animate={
                      reduceMotion
                        ? {}
                        : {
                            boxShadow: [
                              "0 0 0 0 rgba(212,132,58,0.35)",
                              "0 0 0 8px rgba(212,132,58,0)",
                              "0 0 0 0 rgba(212,132,58,0.35)",
                            ],
                          }
                    }
                    transition={
                      reduceMotion
                        ? {}
                        : { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    }
                    aria-hidden
                  />
                )}
                <MoodEmoji label={mood.label} />
              </motion.button>
            );
          })}
        </div>
      </div>

      {error && <p className="shrink-0 text-sm text-red-600">{error}</p>}

      <motion.button
        onClick={handleSave}
        disabled={!selected || saving}
        whileHover={reduceMotion || !selected ? undefined : { scale: 1.03 }}
        whileTap={reduceMotion || !selected ? undefined : { scale: 0.97 }}
        className="shrink-0 rounded-full border-[1.5px] border-white/70 bg-accent px-12 py-3 text-base font-semibold text-white backdrop-blur-xl transition-colors hover:bg-accent-dark disabled:opacity-40"
      >
        {saving ? "保存中..." : "完成"}
      </motion.button>
    </div>
  );
}
