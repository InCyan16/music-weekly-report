import { type MusicPlaybackProvider } from "@/lib/music/types";
import { MockPlaybackProvider } from "@/lib/music/providers/mock";
import { SpotifyPlaybackProvider } from "@/lib/music/providers/spotify";

let providerInstance: MusicPlaybackProvider | null = null;

export function shouldUseMockProvider(): boolean {
  if (typeof window !== "undefined") {
    return process.env.NEXT_PUBLIC_USE_MOCK_MUSIC_PROVIDER === "true";
  }
  return (
    process.env.NEXT_PUBLIC_USE_MOCK_MUSIC_PROVIDER === "true" ||
    process.env.MUSIC_PROVIDER === "mock"
  );
}

export function getMusicProvider(): MusicPlaybackProvider {
  if (providerInstance) return providerInstance;

  if (shouldUseMockProvider()) {
    providerInstance = new MockPlaybackProvider();
  } else {
    const musicProvider = process.env.NEXT_PUBLIC_MUSIC_PROVIDER || process.env.MUSIC_PROVIDER || "spotify";
    if (musicProvider === "spotify") {
      providerInstance = new SpotifyPlaybackProvider();
    } else {
      throw new Error(`不支持的音乐服务: ${musicProvider}`);
    }
  }

  return providerInstance;
}

export function resetMusicProvider() {
  providerInstance = null;
}

export function isMockMode(): boolean {
  return shouldUseMockProvider();
}
