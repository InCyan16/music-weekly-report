"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getBrowserTimezone } from "@/lib/dates/timezone";

export function SettingsForm({
  currentTimezone,
  displayName,
}: {
  currentTimezone: string;
  displayName: string;
}) {
  const [timezone, setTimezone] = useState(currentTimezone);
  const [name, setName] = useState(displayName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/profile/timezone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone, displayName: name }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage("已保存");
    } else {
      setMessage("保存失败");
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  function detectTimezone() {
    setTimezone(getBrowserTimezone());
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-1 block text-sm text-ink-muted">显示名称</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-paper-dark px-4 py-2"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm text-ink-muted">时区</label>
        <div className="flex gap-2">
          <input
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="flex-1 rounded-lg border border-paper-dark px-4 py-2"
          />
          <button
            onClick={detectTimezone}
            className="rounded-lg border border-paper-dark px-4 py-2 text-sm hover:bg-paper-dark"
          >
            自动检测
          </button>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-full bg-accent py-2.5 text-white disabled:opacity-50"
      >
        {saving ? "保存中..." : "保存设置"}
      </button>

      {message && <p className="text-sm text-mood-calm">{message}</p>}

      <hr className="border-paper-dark" />

      <button
        onClick={handleLogout}
        className="w-full rounded-full border border-red-300 py-2.5 text-red-600 hover:bg-red-50"
      >
        退出登录
      </button>
    </div>
  );
}
