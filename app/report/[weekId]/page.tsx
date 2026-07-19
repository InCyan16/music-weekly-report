import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WeeklyReportView } from "@/components/report/WeeklyReport";

export default async function ReportPage({
  params,
}: {
  params: Promise<{ weekId: string }>;
}) {
  const { weekId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <WeeklyReportView weekId={weekId} />;
}
