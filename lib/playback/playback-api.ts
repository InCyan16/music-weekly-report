import { type Track } from "@/lib/music/types";

export type SessionStartPayload = {
  clientSessionId: string;
  track: Track;
};

export type SessionProgressPayload = {
  clientSessionId: string;
  actualPlayedMs: number;
  lastPositionMs: number;
};

export type SessionEndPayload = {
  clientSessionId: string;
  actualPlayedMs: number;
  lastPositionMs: number;
  endReason: string;
};

export type SessionQualifyPayload = {
  clientSessionId: string;
  actualPlayedMs: number;
  lastPositionMs: number;
  reachedEnd?: boolean;
};

async function apiCall<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export async function startSession(payload: SessionStartPayload) {
  return apiCall<{ sessionId: string }>("/api/playback/session/start", payload);
}

export async function updateProgress(payload: SessionProgressPayload) {
  return apiCall<{ ok: boolean }>("/api/playback/session/progress", payload);
}

export async function endSession(payload: SessionEndPayload) {
  const body = JSON.stringify(payload);
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon("/api/playback/session/end", blob);
    return { ok: true };
  }
  return apiCall<{ ok: boolean }>("/api/playback/session/end", payload);
}

export async function qualifySession(payload: SessionQualifyPayload) {
  return apiCall<{ qualified: boolean; listeningEntryId?: string }>(
    "/api/playback/session/qualify",
    payload,
  );
}

export function sendProgressBeacon(payload: SessionProgressPayload) {
  if (typeof navigator !== "undefined" && navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(payload)], {
      type: "application/json",
    });
    navigator.sendBeacon("/api/playback/session/progress", blob);
  }
}
