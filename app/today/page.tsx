import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TodayPageClient } from "@/components/today/TodayPageClient";

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <TodayPageClient />;
}
