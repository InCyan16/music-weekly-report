"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/today`,
      },
    });

    setLoading(false);
    if (error) {
      setError("登录失败，请重试");
    } else {
      setMessage("魔法链接已发送到你的邮箱，请查收");
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/today`,
      },
    });
    if (error) {
      setError("Google 登录失败");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 inline-block text-sm text-ink-muted hover:text-ink"
        >
          ← 返回首页
        </Link>

        <h1 className="font-display mb-2 text-3xl font-bold">登录</h1>
        <p className="mb-8 text-ink-muted">进入你的音乐日记</p>

        <form onSubmit={handleMagicLink} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-ink-muted">
              邮箱地址
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-paper-dark bg-white px-4 py-3 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="you@example.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-accent py-3 font-medium text-white transition-colors hover:bg-accent-dark disabled:opacity-50"
          >
            {loading ? "发送中..." : "发送魔法链接"}
          </button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="h-px flex-1 bg-paper-dark" />
          <span className="text-xs text-ink-light">或</span>
          <div className="h-px flex-1 bg-paper-dark" />
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full rounded-full border border-paper-dark bg-white py-3 font-medium transition-colors hover:bg-paper-dark disabled:opacity-50"
        >
          使用 Google 登录
        </button>

        {message && (
          <p className="mt-4 text-center text-sm text-mood-calm">{message}</p>
        )}
        {error && (
          <p className="mt-4 text-center text-sm text-red-600">{error}</p>
        )}
      </div>
    </main>
  );
}
