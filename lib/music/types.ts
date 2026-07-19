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
  | "very_happy"
  | "happy"
  | "calm"
  | "low"
  | "sad";

export const MOOD_OPTIONS: {
  label: MoodLabel;
  score: number;
  emoji: string;
  text: string;
}[] = [
  { label: "very_happy", score: 5, emoji: "😄", text: "非常开心" },
  { label: "happy", score: 4, emoji: "😊", text: "开心" },
  { label: "calm", score: 3, emoji: "😌", text: "平静" },
  { label: "low", score: 2, emoji: "😔", text: "低落" },
  { label: "sad", score: 1, emoji: "😢", text: "难过" },
];

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
