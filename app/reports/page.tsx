import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatWeekRange } from "@/lib/dates/week";

const MOOD_TEXT: Record<string, string> = {
  loved: "Loved",
  happy: "Happy",
  calm: "Calm",
  tired: "Tired",
  sad: "Sad",
  very_happy: "Loved",
  low: "Tired",
};

export default async function ReportsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: reports } = await supabase
    .from("weekly_reports")
    .select("*")
    .eq("user_id", user.id)
    .order("week_start", { ascending: false });

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <Link href="/today" className="mb-8 inline-block text-sm text-ink-muted hover:text-ink">
        ← 返回聆听
      </Link>

      <h1 className="font-display mb-8 text-3xl font-bold">历史报告</h1>

      {!reports || reports.length === 0 ? (
        <p className="text-center text-ink-muted">
          还没有生成的周报，继续聆听吧
        </p>
      ) : (
        <ul className="space-y-4">
          {reports.map((report) => {
            const topSongs = report.top_songs as {
              title: string;
              rank: number;
            }[];
            const firstSong = topSongs?.[0];
            return (
              <li key={report.id}>
                <Link
                  href={`/report/${report.week_start}`}
                  className="block rounded-xl border border-paper-dark bg-white p-5 transition-shadow hover:shadow-md"
                >
                  <p className="text-sm text-ink-muted">
                    {formatWeekRange(report.week_start, report.week_end)}
                  </p>
                  {firstSong && (
                    <p className="mt-2 font-medium">
                      🥇 {firstSong.title}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-ink-muted">
                    {report.dominant_mood
                      ? MOOD_TEXT[report.dominant_mood as string] ||
                        report.dominant_mood
                      : "无心情记录"}
                    {" · "}
                    {report.total_valid_plays} 次播放
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
