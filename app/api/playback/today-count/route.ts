import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTodayLocalDate } from "@/lib/dates/timezone";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ count: 0 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();

  const timezone = profile?.timezone || "UTC";
  const localDate = request.nextUrl.searchParams.get("date") || getTodayLocalDate(timezone);

  const { count } = await supabase
    .from("listening_entries")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("local_date", localDate);

  return NextResponse.json({ count: count || 0 });
}
