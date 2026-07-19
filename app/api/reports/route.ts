import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  generateWeeklyReport,
  getWeekProgress,
} from "@/lib/reports/generate-weekly-report";
import { getWeekStart, getWeekEnd } from "@/lib/dates/week";
import { isSunday } from "@/lib/dates/week";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();

  const timezone = profile?.timezone || "UTC";
  const weekId = request.nextUrl.searchParams.get("weekId");
  const now = new Date();
  const weekStart = weekId || getWeekStart(now, timezone);
  const weekEnd = getWeekEnd(weekStart, timezone);
  const forceRegenerate =
    request.nextUrl.searchParams.get("regenerate") === "true" &&
    isSunday(now, timezone);

  try {
    const report = await generateWeeklyReport(
      user.id,
      weekStart,
      timezone,
      forceRegenerate,
    );
    return NextResponse.json({ report });
  } catch {
    return NextResponse.json({ error: "周报生成失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();

  const timezone = profile?.timezone || "UTC";
  const now = new Date();
  const weekStart = getWeekStart(now, timezone);
  const weekEnd = getWeekEnd(weekStart, timezone);

  const progress = await getWeekProgress(user.id, weekStart, weekEnd, timezone);

  return NextResponse.json({
    weekStart,
    weekEnd,
    ...progress,
    daysUntilSunday: 7 - (new Date().getDay() || 7),
  });
}
