import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MoodPicker } from "@/components/mood/MoodPicker";

export default async function MoodPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <main className="flex h-dvh max-h-dvh w-full flex-col overflow-hidden bg-[#070605]">
      <MoodPicker />
    </main>
  );
}
