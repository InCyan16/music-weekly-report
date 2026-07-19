import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { VinylRecord } from "@/components/music/VinylRecord";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="max-w-lg text-center">
        <div className="mb-8 flex justify-center">
          <VinylRecord
            coverUrl={null}
            isPlaying={false}
            size={200}
            title="音乐日记"
          />
        </div>

        <h1 className="font-display mb-3 text-5xl font-bold tracking-tight text-ink">
          音乐日记
        </h1>
        <p className="mb-2 text-sm uppercase tracking-[0.3em] text-ink-muted">
          Music Diary
        </p>
        <p className="mb-10 text-lg leading-relaxed text-ink-muted">
          搜索、聆听、记录。
          <br />
          每周日，你的音乐时光化作一张黑胶周报。
        </p>

        <div className="flex flex-col items-center gap-4">
          {user ? (
            <Link
              href="/today"
              className="rounded-full bg-accent px-10 py-3 text-lg font-medium text-white transition-colors hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
            >
              进入今日聆听
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-full bg-accent px-10 py-3 text-lg font-medium text-white transition-colors hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
              >
                开始聆听
              </Link>
              <Link
                href="/login"
                className="text-sm text-ink-muted underline-offset-4 hover:underline"
              >
                已有账户？登录
              </Link>
            </>
          )}
        </div>
      </div>

      <footer className="absolute bottom-6 text-xs text-ink-light">
        真实播放 · 自动记录 · 周日揭晓
      </footer>
    </main>
  );
}
