import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getCurrentWeekStart,
  getLocalToday,
  getWeekDayStatuses,
} from "@/lib/reports/week-day-status";
import { getWeekEnd } from "@/lib/dates/week";

export async function GET() {
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
  const weekStart = getCurrentWeekStart(timezone);
  const weekEnd = getWeekEnd(weekStart, timezone);
  const today = getLocalToday(timezone);

  const { data: entries } = await supabase
    .from("listening_entries")
    .select("local_date")
    .eq("user_id", user.id)
    .gte("local_date", weekStart)
    .lte("local_date", weekEnd);

  const filledDates = new Set((entries || []).map((e) => e.local_date));
  const days = getWeekDayStatuses(weekStart, today, filledDates);

  return NextResponse.json({ weekStart, today, days });
}
