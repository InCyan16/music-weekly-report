export class PlayTimeTracker {
  private accumulatedMs = 0;
  private lastPlayStart: number | null = null;
  private isPlaying = false;
  private isPageVisible = true;

  constructor() {
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.handleVisibility);
    }
  }

  private handleVisibility = () => {
    const visible = document.visibilityState === "visible";
    if (!visible && this.isPlaying) {
      this.pauseAccumulation();
    } else if (visible && this.isPlaying) {
      this.resumeAccumulation();
    }
    this.isPageVisible = visible;
  };

  start() {
    this.accumulatedMs = 0;
    this.isPlaying = true;
    if (this.isPageVisible) {
      this.lastPlayStart = performance.now();
    }
  }

  onPlay() {
    if (!this.isPlaying) {
      this.isPlaying = true;
      if (this.isPageVisible) {
        this.lastPlayStart = performance.now();
      }
    }
  }

  onPause() {
    this.pauseAccumulation();
    this.isPlaying = false;
  }

  private pauseAccumulation() {
    if (this.lastPlayStart !== null) {
      this.accumulatedMs += performance.now() - this.lastPlayStart;
      this.lastPlayStart = null;
    }
  }

  private resumeAccumulation() {
    if (this.isPlaying && this.lastPlayStart === null) {
      this.lastPlayStart = performance.now();
    }
  }

  /** Seek does NOT add to accumulated time */
  onSeek() {
    // Intentionally no-op for accumulated time
  }

  getAccumulatedMs(): number {
    if (this.isPlaying && this.lastPlayStart !== null && this.isPageVisible) {
      return this.accumulatedMs + (performance.now() - this.lastPlayStart);
    }
    return this.accumulatedMs;
  }

  reset() {
    this.accumulatedMs = 0;
    this.lastPlayStart = null;
    this.isPlaying = false;
  }

  destroy() {
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.handleVisibility);
    }
  }
}
