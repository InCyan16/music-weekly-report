import {
  type MusicPlaybackProvider,
  type PlaybackState,
  type Track,
} from "@/lib/music/types";

declare global {
  interface Window {
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayer;
    };
    onSpotifyWebPlaybackSDKReady: (() => void) | undefined;
  }
}

interface SpotifyPlayer {
  connect(): Promise<boolean>;
  disconnect(): void;
  addListener(event: string, cb: (data: unknown) => void): void;
  removeListener(event: string, cb: (data: unknown) => void): void;
  getCurrentState(): Promise<SpotifyPlaybackState | null>;
  setVolume(volume: number): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  nextTrack(): Promise<void>;
  previousTrack(): Promise<void>;
}

interface SpotifyPlaybackState {
  paused: boolean;
  position: number;
  duration: number;
  track_window: {
    current_track: {
      id: string;
      name: string;
      artists: { name: string }[];
      album: { name: string; images: { url: string }[] };
      duration_ms: number;
    };
  };
}

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

function spotifyTrackToTrack(sp: SpotifyPlaybackState["track_window"]["current_track"]): Track {
  return {
    externalId: sp.id,
    source: "spotify",
    title: sp.name,
    artist: sp.artists.map((a) => a.name).join(", "),
    album: sp.album.name,
    coverUrl: sp.album.images[0]?.url ?? null,
    durationMs: sp.duration_ms,
    playable: true,
  };
}

export class SpotifyPlaybackProvider implements MusicPlaybackProvider {
  readonly name = "spotify";
  private state: PlaybackState = { ...INITIAL_STATE };
  private listeners = new Set<(state: PlaybackState) => void>();
  private player: SpotifyPlayer | null = null;
  private sdkReady = false;
  private pollInterval: ReturnType<typeof setInterval> | null = null;

  getState(): PlaybackState {
    return { ...this.state };
  }

  private emit() {
    this.listeners.forEach((cb) => cb(this.getState()));
  }

  private setState(partial: Partial<PlaybackState>) {
    this.state = { ...this.state, ...partial };
    this.emit();
  }

  private async getAccessToken(): Promise<string> {
    const res = await fetch("/api/music/token", { credentials: "include" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "无法获取音乐授权");
    }
    const { accessToken } = await res.json();
    return accessToken;
  }

  private async loadSDK(): Promise<void> {
    if (this.sdkReady) return;
    await new Promise<void>((resolve, reject) => {
      if (window.Spotify) {
        this.sdkReady = true;
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://sdk.scdn.co/spoti-sdk-1.0.0.js";
      script.async = true;
      window.onSpotifyWebPlaybackSDKReady = () => {
        this.sdkReady = true;
        resolve();
      };
      script.onerror = () => reject(new Error("无法加载 Spotify SDK"));
      document.body.appendChild(script);
      setTimeout(() => reject(new Error("Spotify SDK 加载超时")), 15000);
    });
  }

  private async initPlayer(): Promise<void> {
    if (this.player) return;
    await this.loadSDK();

    this.player = new window.Spotify.Player({
      name: "Music Diary Player",
      getOAuthToken: async (cb) => {
        try {
          const token = await this.getAccessToken();
          cb(token);
        } catch {
          cb("");
        }
      },
      volume: this.state.volume,
    });

    this.player.addListener("ready", () => {
      this.setState({ connectionStatus: "connected", error: null });
    });
    this.player.addListener("not_ready", () => {
      this.setState({ connectionStatus: "disconnected" });
    });
    this.player.addListener("player_state_changed", (data) => {
      const s = data as SpotifyPlaybackState | null;
      if (!s) return;
      const track = spotifyTrackToTrack(s.track_window.current_track);
      this.setState({
        track,
        isPlaying: !s.paused,
        positionMs: s.position,
        durationMs: s.duration,
      });
    });
    this.player.addListener("initialization_error", (data) => {
      const e = data as { message: string };
      this.setState({ error: e.message, connectionStatus: "error" });
    });
    this.player.addListener("authentication_error", () => {
      this.setState({
        error: "音乐账户授权已过期，请重新连接",
        connectionStatus: "error",
      });
    });
    this.player.addListener("account_error", () => {
      this.setState({
        error: "需要 Spotify Premium 账户才能播放完整歌曲",
        connectionStatus: "error",
      });
    });
    this.player.addListener("playback_error", (data) => {
      const e = data as { message: string };
      this.setState({ error: e.message || "播放出错" });
    });
  }

  private startPolling() {
    this.stopPolling();
    this.pollInterval = setInterval(async () => {
      if (!this.player) return;
      const s = await this.player.getCurrentState();
      if (!s) return;
      const track = spotifyTrackToTrack(s.track_window.current_track);
      this.setState({
        track,
        isPlaying: !s.paused,
        positionMs: s.position,
        durationMs: s.duration,
      });
    }, 1000);
  }

  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async connect(): Promise<void> {
    this.setState({ connectionStatus: "connecting", error: null });
    try {
      await this.initPlayer();
      const connected = await this.player!.connect();
      if (!connected) {
        throw new Error("无法连接到 Spotify");
      }
      this.startPolling();
      this.setState({ connectionStatus: "connected" });
    } catch (err) {
      this.setState({
        connectionStatus: "error",
        error: err instanceof Error ? err.message : "连接失败",
      });
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    this.stopPolling();
    this.player?.disconnect();
    this.player = null;
    this.setState({ ...INITIAL_STATE, connectionStatus: "disconnected" });
  }

  async search(query: string): Promise<Track[]> {
    const res = await fetch(
      `/api/music/search?q=${encodeURIComponent(query)}`,
      { credentials: "include" },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "搜索失败");
    }
    const { tracks } = await res.json();
    return tracks;
  }

  async play(track: Track): Promise<void> {
    if (!track.playable) {
      throw new Error("当前歌曲暂不可播放");
    }
    this.setState({ isLoading: true, error: null });
    const res = await fetch("/api/music/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ track }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      this.setState({ isLoading: false, error: data.error || "播放失败" });
      throw new Error(data.error || "播放失败");
    }
    this.setState({
      track,
      isPlaying: true,
      isLoading: false,
      positionMs: 0,
      durationMs: track.durationMs,
      sessionId: crypto.randomUUID(),
    });
  }

  async pause(): Promise<void> {
    await this.player?.pause();
    this.setState({ isPlaying: false });
  }

  async resume(): Promise<void> {
    await this.player?.resume();
    this.setState({ isPlaying: true });
  }

  async seek(positionMs: number): Promise<void> {
    await this.player?.seek(positionMs);
    this.setState({ positionMs });
  }

  async setVolume(volume: number): Promise<void> {
    const v = Math.max(0, Math.min(1, volume));
    await this.player?.setVolume(v);
    this.setState({ volume: v });
  }

  async setMuted(muted: boolean): Promise<void> {
    if (muted) {
      await this.player?.setVolume(0);
    } else {
      await this.player?.setVolume(this.state.volume);
    }
    this.setState({ isMuted: muted });
  }

  async replay(): Promise<void> {
    if (!this.state.track) return;
    await this.seek(0);
    await this.resume();
    this.setState({ sessionId: crypto.randomUUID() });
  }

  async next(): Promise<void> {
    await this.player?.nextTrack();
  }

  async previous(): Promise<void> {
    await this.player?.previousTrack();
  }

  subscribe(callback: (state: PlaybackState) => void): () => void {
    this.listeners.add(callback);
    callback(this.getState());
    return () => this.listeners.delete(callback);
  }
}
