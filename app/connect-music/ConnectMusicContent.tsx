"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function ConnectMusicContent() {
  const [status, setStatus] = useState<{
    connected: boolean;
    provider: string | null;
    status: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const searchParams = useSearchParams();
  const connected = searchParams.get("connected");
  const error = searchParams.get("error");
  const isMock = process.env.NEXT_PUBLIC_USE_MOCK_MUSIC_PROVIDER === "true";

  useEffect(() => {
    fetch("/api/music/status")
      .then((r) => r.json())
      .then(setStatus)
      .finally(() => setLoading(false));
  }, [connected]);

  async function handleDisconnect() {
    setDisconnecting(true);
    await fetch("/api/music/disconnect", { method: "POST" });
    setStatus({ connected: false, provider: null, status: "disconnected" });
    setDisconnecting(false);
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-12">
      <Link href="/today" className="mb-8 inline-block text-sm text-ink-muted hover:text-ink">
        ← 返回
      </Link>

      <h1 className="font-display mb-2 text-3xl font-bold">连接音乐账户</h1>
      <p className="mb-8 text-ink-muted">
        需要连接音乐平台才能搜索和播放完整歌曲
      </p>

      {isMock && (
        <div className="mb-6 rounded-lg border-2 border-dashed border-accent bg-accent/5 p-4">
          <p className="font-medium text-accent-dark">Development Playback Mode</p>
          <p className="mt-1 text-sm text-ink-muted">
            当前使用 Mock 播放模式，无需连接真实音乐账户
          </p>
        </div>
      )}

      {connected && (
        <div className="mb-6 rounded-lg bg-mood-calm/10 p-4 text-mood-calm">
          音乐账户连接成功！
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600">
          授权失败：{error === "access_denied" ? "你拒绝了授权" : error}
        </div>
      )}

      {loading ? (
        <p className="text-ink-muted">加载中...</p>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-paper-dark bg-white p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1DB954] text-white font-bold text-lg">
                S
              </div>
              <div>
                <h2 className="font-medium">Spotify</h2>
                <p className="text-sm text-ink-muted">
                  {status?.connected ? "已连接" : "未连接"}
                </p>
              </div>
            </div>

            <div className="mb-4 space-y-2 text-sm text-ink-muted">
              <p>• 需要 Spotify Premium 账户</p>
              <p>• 可搜索和播放完整歌曲</p>
              <p>• 播放行为自动记录，无需手动添加</p>
            </div>

            {status?.connected ? (
              <div className="flex gap-3">
                <Link
                  href="/today"
                  className="flex-1 rounded-full bg-accent py-2.5 text-center text-white hover:bg-accent-dark"
                >
                  开始聆听
                </Link>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="rounded-full border border-paper-dark px-6 py-2.5 text-sm hover:bg-paper-dark disabled:opacity-50"
                >
                  断开连接
                </button>
              </div>
            ) : !isMock ? (
              <a
                href="/api/music/connect"
                className="block w-full rounded-full bg-[#1DB954] py-2.5 text-center font-medium text-white hover:bg-[#1aa34a]"
              >
                连接 Spotify
              </a>
            ) : (
              <Link
                href="/today"
                className="block w-full rounded-full bg-accent py-2.5 text-center text-white hover:bg-accent-dark"
              >
                使用 Mock 模式进入
              </Link>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
