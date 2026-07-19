import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  await serviceClient
    .from("music_connections")
    .update({ connection_status: "disconnected" })
    .eq("user_id", user.id);

  return NextResponse.json({ ok: true });
}
