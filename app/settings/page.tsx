import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone, display_name")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <Link href="/today" className="mb-8 inline-block text-sm text-ink-muted hover:text-ink">
        ← 返回
      </Link>
      <h1 className="font-display mb-8 text-3xl font-bold">设置</h1>
      <SettingsForm
        currentTimezone={profile?.timezone || "UTC"}
        displayName={profile?.display_name || ""}
      />
    </main>
  );
}
