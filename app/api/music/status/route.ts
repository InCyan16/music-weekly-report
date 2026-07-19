import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ connected: false, provider: null });
  }

  const { data } = await supabase
    .from("music_connections")
    .select("provider, connection_status, token_expires_at")
    .eq("user_id", user.id)
    .single();

  return NextResponse.json({
    connected: data?.connection_status === "connected",
    provider: data?.provider || null,
    status: data?.connection_status || "disconnected",
    expiresAt: data?.token_expires_at || null,
  });
}
