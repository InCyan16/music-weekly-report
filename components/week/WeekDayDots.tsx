"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type WeekDayDotStatus = "filled" | "missed" | "future" | "today";

const LABELS = ["一", "二", "三", "四", "五", "六", "日"];

export function WeekDayDots({
  className,
  refreshKey = 0,
}: {
  className?: string;
  refreshKey?: number;
}) {
  const [days, setDays] = useState<WeekDayDotStatus[] | null>(null);

  useEffect(() => {
    fetch("/api/week/days")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setDays(data?.days ?? null))
      .catch(() => setDays(null));
  }, [refreshKey]);

  if (!days) return null;

  return (
    <div
      className={cn("flex items-center justify-center gap-2.5", className)}
      role="img"
      aria-label="本周聆听记录：绿为已填写，红为未填写，白为未到或今日"
    >
      {days.map((status, index) => (
        <span
          key={index}
          className={cn(
            "h-2.5 w-2.5 rounded-full border",
            status === "filled" && "border-[#6a9e72] bg-[#6a9e72]",
            status === "missed" && "border-[#c45c4a] bg-[#c45c4a]",
            (status === "future" || status === "today") &&
              "border-black/10 bg-white",
          )}
          title={`周${LABELS[index]}`}
        />
      ))}
    </div>
  );
}
