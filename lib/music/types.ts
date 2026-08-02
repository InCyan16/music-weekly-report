export type Track = {
  externalId: string;
  source: string;
  title: string;
  artist: string;
  album?: string | null;
  coverUrl?: string | null;
  durationMs: number;
  playable: boolean;
};

export type PlaybackState = {
  track: Track | null;
  isPlaying: boolean;
  isBuffering: boolean;
  isLoading: boolean;
  positionMs: number;
  durationMs: number;
  volume: number;
  isMuted: boolean;
  sessionId: string | null;
  error: string | null;
  connectionStatus: "disconnected" | "connecting" | "connected" | "error";
};

export type MusicPlaybackProvider = {
  readonly name: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  search(query: string): Promise<Track[]>;
  play(track: Track): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  setVolume(volume: number): Promise<void>;
  setMuted(muted: boolean): Promise<void>;
  replay(): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  subscribe(callback: (state: PlaybackState) => void): () => void;
  getState(): PlaybackState;
};

export type MoodLabel =
  | "loved"
  | "happy"
  | "calm"
  | "tired"
  | "sad";

export const MOOD_OPTIONS: {
  label: MoodLabel;
  score: number;
  emoji: string;
  text: string;
  color: string;
}[] = [
  { label: "happy", score: 4, emoji: "😊", text: "Happy", color: "#e8c84a" },
  { label: "loved", score: 5, emoji: "😍", text: "Loved", color: "#e891b0" },
  { label: "calm", score: 3, emoji: "😌", text: "Calm", color: "#9ec5d6" },
  { label: "tired", score: 2, emoji: "😫", text: "Tired", color: "#c9b896" },
  { label: "sad", score: 1, emoji: "😢", text: "Sad", color: "#9b8ec4" },
];

/** Majority mood from filled slots; ties → last inserted. */
export function primaryMoodFromSlots(slots: MoodLabel[]): {
  label: MoodLabel;
  score: number;
} | null {
  if (!slots.length) return null;
  const counts = new Map<MoodLabel, number>();
  for (const s of slots) counts.set(s, (counts.get(s) || 0) + 1);
  let best = slots[slots.length - 1];
  let bestCount = 0;
  for (const s of slots) {
    const c = counts.get(s) || 0;
    if (c >= bestCount) {
      best = s;
      bestCount = c;
    }
  }
  const opt = MOOD_OPTIONS.find((m) => m.label === best)!;
  return { label: best, score: opt.score };
}

export type TopSong = {
  rank: number;
  songId: string;
  externalId: string;
  source: string;
  title: string;
  artist: string;
  album: string | null;
  coverUrl: string | null;
  durationMs: number;
  validPlayCount: number;
  firstPlayedAt: string;
  lastPlayedAt: string;
};

export type WeeklyReportData = {
  id: string;
  weekStart: string;
  weekEnd: string;
  totalValidPlays: number;
  uniqueSongCount: number;
  activeDays: number;
  moodDays: number;
  averageMood: number | null;
  dominantMood: string | null;
  moodSummary: string | null;
  topSongs: TopSong[];
  moodStats: Record<string, unknown>;
  listeningStats: Record<string, unknown>;
  generatedAt: string;
};

export type PlaybackHistoryItem = {
  sessionId: string;
  track: Track;
  startedAt: string;
  isQualified: boolean;
};
