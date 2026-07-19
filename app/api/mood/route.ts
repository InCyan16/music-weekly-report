import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { moodSchema } from "@/lib/validation/schemas";
import { getTodayLocalDate } from "@/lib/dates/timezone";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = moodSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "无效的心情数据" }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .single();

  const timezone = profile?.timezone || "UTC";
  const localDate = getTodayLocalDate(timezone);

  const { data, error } = await supabase
    .from("daily_moods")
    .upsert(
      {
        user_id: user.id,
        local_date: localDate,
        mood_score: parsed.data.moodScore,
        mood_label: parsed.data.moodLabel,
      },
      { onConflict: "user_id,local_date" },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "保存心情失败" }, { status: 500 });
  }

  return NextResponse.json({ mood: data });
}
