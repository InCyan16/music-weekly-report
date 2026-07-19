import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WeekPageClient } from "@/components/week/WeekPageClient";

export default async function WeekPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <WeekPageClient />;
}
