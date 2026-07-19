import {
  type MusicPlaybackProvider,
  type PlaybackState,
  type Track,
} from "@/lib/music/types";

const INITIAL_STATE: PlaybackState = {
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
};

const MOCK_TRACKS: Track[] = [
  {
    externalId: "mock-track-1",
    source: "mock",
    title: "Golden Hour",
    artist: "Mock Artist",
    album: "Demo Album",
    coverUrl: null,
    durationMs: 45_000,
    playable: true,
  },
  {
    externalId: "mock-track-2",
    source: "mock",
    title: "Midnight Drive",
    artist: "Test Band",
    album: "Night Sessions",
    coverUrl: null,
    durationMs: 180_000,
    playable: true,
  },
  {
    externalId: "mock-track-3",
    source: "mock",
    title: "Rainy Sunday",
    artist: "Lo-Fi Collective",
    album: "Calm Days",
    coverUrl: null,
    durationMs: 240_000,
    playable: true,
  },
  {
    externalId: "mock-track-unplayable",
    source: "mock",
    title: "Unavailable Track",
    artist: "No Rights",
    album: "Blocked",
    coverUrl: null,
    durationMs: 200_000,
    playable: false,
  },
];

export class MockPlaybackProvider implements MusicPlaybackProvider {
  readonly name = "mock";
  private state: PlaybackState = { ...INITIAL_STATE };
  private listeners = new Set<(state: PlaybackState) => void>();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;

  getState(): PlaybackState {
    return { ...this.state };
  }

  private emit() {
    const snapshot = this.getState();
    this.listeners.forEach((cb) => cb(snapshot));
  }

  private setState(partial: Partial<PlaybackState>) {
    this.state = { ...this.state, ...partial };
    this.emit();
  }

  async connect(): Promise<void> {
    this.setState({ connectionStatus: "connecting" });
    await new Promise((r) => setTimeout(r, 300));
    this.setState({ connectionStatus: "connected", error: null });
  }

  async disconnect(): Promise<void> {
    this.stopPlayback();
    this.setState({ ...INITIAL_STATE, connectionStatus: "disconnected" });
  }

  async search(query: string): Promise<Track[]> {
    const q = query.toLowerCase();
    return MOCK_TRACKS.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q) ||
        (t.album?.toLowerCase().includes(q) ?? false),
    );
  }

  private startOscillator() {
    if (typeof window === "undefined") return;
    try {
      this.audioContext = new AudioContext();
      this.oscillator = this.audioContext.createOscillator();
      this.gainNode = this.audioContext.createGain();
      this.oscillator.type = "sine";
      this.oscillator.frequency.value = 220;
      this.gainNode.gain.value = this.state.isMuted ? 0 : this.state.volume * 0.05;
      this.oscillator.connect(this.gainNode);
      this.gainNode.connect(this.audioContext.destination);
      this.oscillator.start();
    } catch {
      // Audio not available in test env
    }
  }

  private stopOscillator() {
    try {
      this.oscillator?.stop();
      this.oscillator?.disconnect();
      this.audioContext?.close();
    } catch {
      // ignore
    }
    this.oscillator = null;
    this.gainNode = null;
    this.audioContext = null;
  }

  private startTicking() {
    this.stopTicking();
    this.intervalId = setInterval(() => {
      if (!this.state.isPlaying || !this.state.track) return;
      const next = this.state.positionMs + 250;
      if (next >= this.state.durationMs) {
        this.setState({ positionMs: this.state.durationMs, isPlaying: false });
        this.stopTicking();
        this.stopOscillator();
        return;
      }
      this.setState({ positionMs: next });
    }, 250);
  }

  private stopTicking() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private stopPlayback() {
    this.stopTicking();
    this.stopOscillator();
    this.setState({ isPlaying: false });
  }

  async play(track: Track): Promise<void> {
    if (!track.playable) {
      throw new Error("当前歌曲暂不可播放");
    }
    this.setState({ isLoading: true, error: null });
    await new Promise((r) => setTimeout(r, 200));
    this.stopPlayback();
    this.setState({
      track,
      positionMs: 0,
      durationMs: track.durationMs,
      isPlaying: true,
      isLoading: false,
      isBuffering: false,
      sessionId: crypto.randomUUID(),
    });
    this.startOscillator();
    this.startTicking();
  }

  async pause(): Promise<void> {
    this.stopTicking();
    this.stopOscillator();
    this.setState({ isPlaying: false });
  }

  async resume(): Promise<void> {
    if (!this.state.track) return;
    this.setState({ isPlaying: true });
    this.startOscillator();
    this.startTicking();
  }

  async seek(positionMs: number): Promise<void> {
    this.setState({
      positionMs: Math.max(0, Math.min(positionMs, this.state.durationMs)),
    });
  }

  async setVolume(volume: number): Promise<void> {
    const v = Math.max(0, Math.min(1, volume));
    this.setState({ volume: v });
    if (this.gainNode) {
      this.gainNode.gain.value = this.state.isMuted ? 0 : v * 0.05;
    }
  }

  async setMuted(muted: boolean): Promise<void> {
    this.setState({ isMuted: muted });
    if (this.gainNode) {
      this.gainNode.gain.value = muted ? 0 : this.state.volume * 0.05;
    }
  }

  async replay(): Promise<void> {
    if (!this.state.track) return;
    await this.play(this.state.track);
  }

  async next(): Promise<void> {
    // Handled by session manager via history
  }

  async previous(): Promise<void> {
    // Handled by session manager via history
  }

  subscribe(callback: (state: PlaybackState) => void): () => void {
    this.listeners.add(callback);
    callback(this.getState());
    return () => this.listeners.delete(callback);
  }
}
