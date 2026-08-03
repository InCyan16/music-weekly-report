import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DailyCollection } from "@/components/today/DailyCollection";

export default async function TodaySummaryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <DailyCollection />;
}
