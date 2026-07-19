import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await request.json();
  const { timezone, displayName } = body;
  if (!timezone || typeof timezone !== "string") {
    return NextResponse.json({ error: "无效时区" }, { status: 400 });
  }

  const updates: Record<string, string> = { timezone };
  if (displayName && typeof displayName === "string") {
    updates.display_name = displayName;
  }

  await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}
