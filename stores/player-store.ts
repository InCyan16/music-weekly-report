import { create } from "zustand";
import {
  type PlaybackHistoryItem,
  type PlaybackState,
  type Track,
} from "@/lib/music/types";
import { getMusicProvider, isMockMode } from "@/lib/music/provider";
import { PlayTimeTracker } from "@/lib/playback/play-time-tracker";
import { isQualifiedPlay } from "@/lib/playback/qualification";
import {
  endSession,
  qualifySession,
  sendProgressBeacon,
  startSession,
  updateProgress,
} from "@/lib/playback/playback-api";
import { generateSessionId } from "@/lib/utils";

const PROGRESS_INTERVAL = parseInt(
  process.env.NEXT_PUBLIC_PLAYBACK_PROGRESS_UPDATE_INTERVAL_MS ||
    process.env.PLAYBACK_PROGRESS_UPDATE_INTERVAL_MS ||
    "10000",
  10,
);

type PlayerStore = {
  playbackState: PlaybackState;
  history: PlaybackHistoryItem[];
  historyIndex: number;
  clientSessionId: string | null;
  isQualified: boolean;
  todayValidPlayCount: number;
  isMockMode: boolean;
  playTimeTracker: PlayTimeTracker | null;
  progressTimer: ReturnType<typeof setInterval> | null;
  initialized: boolean;

  init: () => () => void;
  connect: () => Promise<void>;
  search: (query: string) => Promise<Track[]>;
  playTrack: (track: Track) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  setMuted: (muted: boolean) => Promise<void>;
  replay: () => Promise<void>;
  nextInHistory: () => Promise<void>;
  previousInHistory: () => Promise<void>;
  switchToHistoryIndex: (index: number) => Promise<void>;
  endDayListening: () => Promise<void>;
  setTodayValidPlayCount: (count: number) => void;
};

async function createNewSession(
  track: Track,
  get: () => PlayerStore,
  set: (partial: Partial<PlayerStore>) => void,
) {
  const store = get();
  if (store.clientSessionId) {
    await finalizeSession(get, "changed_track");
  }

  const clientSessionId = generateSessionId();
  const tracker = new PlayTimeTracker();
  tracker.start();

  const historyItem: PlaybackHistoryItem = {
    sessionId: clientSessionId,
    track,
    startedAt: new Date().toISOString(),
    isQualified: false,
  };

  set({
    clientSessionId,
    isQualified: false,
    playTimeTracker: tracker,
    history: [...store.history, historyItem],
    historyIndex: store.history.length,
  });

  try {
    await startSession({ clientSessionId, track });
  } catch (err) {
    console.error("Failed to start session:", err);
  }

  startProgressTimer(get, set);
}

async function finalizeSession(
  get: () => PlayerStore,
  endReason: string,
) {
  const store = get();
  if (!store.clientSessionId || !store.playTimeTracker) return;

  const actualPlayedMs = Math.round(store.playTimeTracker.getAccumulatedMs());
  const lastPositionMs = store.playbackState.positionMs;

  try {
    await endSession({
      clientSessionId: store.clientSessionId,
      actualPlayedMs,
      lastPositionMs,
      endReason,
    });
  } catch {
    sendProgressBeacon({
      clientSessionId: store.clientSessionId,
      actualPlayedMs,
      lastPositionMs,
    });
  }

  if (store.progressTimer) {
    clearInterval(store.progressTimer);
  }
}

async function checkQualification(get: () => PlayerStore, set: (p: Partial<PlayerStore>) => void) {
  const store = get();
  if (store.isQualified || !store.clientSessionId || !store.playTimeTracker) return;
  if (!store.playbackState.track) return;

  const actualPlayedMs = Math.round(store.playTimeTracker.getAccumulatedMs());
  const reachedEnd =
    store.playbackState.positionMs >= store.playbackState.durationMs - 500 &&
    !store.playbackState.isPlaying;

  const qualified = isQualifiedPlay(
    actualPlayedMs,
    store.playbackState.durationMs,
    reachedEnd,
  );

  if (!qualified) return;

  try {
    const result = await qualifySession({
      clientSessionId: store.clientSessionId,
      actualPlayedMs,
      lastPositionMs: store.playbackState.positionMs,
      reachedEnd,
    });
    if (result.qualified) {
      set({
        isQualified: true,
        todayValidPlayCount: store.todayValidPlayCount + 1,
        history: store.history.map((h) =>
          h.sessionId === store.clientSessionId
            ? { ...h, isQualified: true }
            : h,
        ),
      });
    }
  } catch (err) {
    console.error("Qualify failed:", err);
  }
}

function startProgressTimer(
  get: () => PlayerStore,
  set: (p: Partial<PlayerStore>) => void,
) {
  const store = get();
  if (store.progressTimer) clearInterval(store.progressTimer);

  const timer = setInterval(async () => {
    const s = get();
    if (!s.clientSessionId || !s.playTimeTracker) return;

    const actualPlayedMs = Math.round(s.playTimeTracker.getAccumulatedMs());
    try {
      await updateProgress({
        clientSessionId: s.clientSessionId,
        actualPlayedMs,
        lastPositionMs: s.playbackState.positionMs,
      });
    } catch {
      sendProgressBeacon({
        clientSessionId: s.clientSessionId,
        actualPlayedMs,
        lastPositionMs: s.playbackState.positionMs,
      });
    }
    await checkQualification(get, set);
  }, PROGRESS_INTERVAL);

  set({ progressTimer: timer });
}

function setupMultiTabSync(get: () => PlayerStore) {
  if (typeof BroadcastChannel === "undefined") return () => {};
  const channel = new BroadcastChannel("music-diary-player");
  channel.onmessage = (event) => {
    if (event.data?.type === "request_pause" && get().playbackState.isPlaying) {
      get().pause();
    }
  };
  return () => channel.close();
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  playbackState: {
    track: null,
    isPlaying: false,
    isBuffering: false,
    isLoading: false,
    positionMs: 0,
    durationMs: 0,
    volume: 0.7,
    isMuted: false,
    sessionId: null,
    error: null,
    connectionStatus: "disconnected",
  },
  history: [],
  historyIndex: -1,
  clientSessionId: null,
  isQualified: false,
  todayValidPlayCount: 0,
  isMockMode: isMockMode(),
  playTimeTracker: null,
  progressTimer: null,
  initialized: false,

  init: () => {
    if (get().initialized) return () => {};
    const provider = getMusicProvider();
    const unsub = provider.subscribe((state) => {
      set({ playbackState: state });
      const store = get();
      if (state.isPlaying) {
        store.playTimeTracker?.onPlay();
      } else {
        store.playTimeTracker?.onPause();
      }
      if (
        state.track &&
        state.positionMs >= state.durationMs - 500 &&
        !state.isPlaying &&
        state.durationMs > 0
      ) {
        checkQualification(get, set);
      }
    });

    const cleanupTab = setupMultiTabSync(get);

    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => {
        finalizeSession(get, "page_closed");
      });
    }

    set({ initialized: true });

    return () => {
      unsub();
      cleanupTab();
      finalizeSession(get, "page_closed");
      if (get().progressTimer) clearInterval(get().progressTimer!);
      set({ initialized: false, progressTimer: null });
    };
  },

  connect: async () => {
    const provider = getMusicProvider();
    await provider.connect();
  },

  search: async (query) => {
    const provider = getMusicProvider();
    return provider.search(query);
  },

  playTrack: async (track) => {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel("music-diary-player");
      channel.postMessage({ type: "request_pause" });
      channel.close();
    }
    const provider = getMusicProvider();
    await createNewSession(track, get, set);
    await provider.play(track);
  },

  pause: async () => {
    const provider = getMusicProvider();
    get().playTimeTracker?.onPause();
    await provider.pause();
  },

  resume: async () => {
    const provider = getMusicProvider();
    get().playTimeTracker?.onPlay();
    await provider.resume();
  },

  seek: async (positionMs) => {
    const provider = getMusicProvider();
    get().playTimeTracker?.onSeek();
    await provider.seek(positionMs);
  },

  setVolume: async (volume) => {
    const provider = getMusicProvider();
    await provider.setVolume(volume);
  },

  setMuted: async (muted) => {
    const provider = getMusicProvider();
    await provider.setMuted(muted);
  },

  replay: async () => {
    await finalizeSession(get, "replayed");
    const track = get().playbackState.track;
    if (!track) return;
    const provider = getMusicProvider();
    await createNewSession(track, get, set);
    await provider.replay();
  },

  nextInHistory: async () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      await get().switchToHistoryIndex(historyIndex + 1);
    }
  },

  previousInHistory: async () => {
    const { historyIndex } = get();
    if (historyIndex > 0) {
      await get().switchToHistoryIndex(historyIndex - 1);
    }
  },

  switchToHistoryIndex: async (index) => {
    const { history } = get();
    if (index < 0 || index >= history.length) return;
    const item = history[index];
    set({ historyIndex: index });
    await get().playTrack(item.track);
  },

  endDayListening: async () => {
    await get().pause();
    await finalizeSession(get, "user_stopped");
    set({
      clientSessionId: null,
      playTimeTracker: null,
      isQualified: false,
    });
  },

  setTodayValidPlayCount: (count) => set({ todayValidPlayCount: count }),
}));
