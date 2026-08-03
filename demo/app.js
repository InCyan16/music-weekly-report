/**
 * Music Diary — Standalone Demo
 * No backend required. Run: python3 demo/serve.py
 */

function mockUrl(folder, file) {
  return `/mock-musics/${encodeURIComponent(folder)}/${encodeURIComponent(file)}`;
}

function trackFromFolder(folder, color) {
  const sep = folder.lastIndexOf("_");
  const title = sep >= 0 ? folder.slice(0, sep) : folder;
  const artist = sep >= 0 ? folder.slice(sep + 1) : "Unknown";
  return {
    id: folder,
    title,
    artist,
    album: "",
    durationMs: 0,
    color,
    coverUrl: mockUrl(folder, "bg.jpg"),
    audioUrl: mockUrl(folder, "track.mp3"),
  };
}

const TRACKS = [
  trackFromFolder("Constellate_Chime", "#d4843a"),
  trackFromFolder("Mantis_Akira", "#5a7ec4"),
  trackFromFolder("Nose art_flying lotus", "#6a9e72"),
  trackFromFolder("dsco_sweettrip", "#c45c4a"),
  trackFromFolder("影子_大象体操", "#8b7ec8"),
];

const TWEMOJI_CDN =
  "https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.2/assets/svg";

const MOOD_TWEMOJI = {
  loved: "1f60d",
  happy: "1f60a",
  calm: "1f60c",
  tired: "1f62b",
  sad: "1f622",
};

function twemojiUrl(label) {
  return `${TWEMOJI_CDN}/${MOOD_TWEMOJI[label]}.svg`;
}

/** Tray order matches concept art; scores unchanged. */
const MOODS = [
  { label: "happy", score: 4, emoji: "😊", text: "Happy", color: "#e8c84a" },
  { label: "loved", score: 5, emoji: "😍", text: "Loved", color: "#e891b0" },
  { label: "calm", score: 3, emoji: "😌", text: "Calm", color: "#9ec5d6" },
  { label: "tired", score: 2, emoji: "😫", text: "Tired", color: "#c9b896" },
  { label: "sad", score: 1, emoji: "😢", text: "Sad", color: "#9b8ec4" },
];

const MOOD_SLOT_MAX = 5;

const VALID_THRESHOLD_MS = 30000;
const STORAGE_KEY = "music-diary-demo";

// ─── State ───────────────────────────────────────────────
const state = {
  history: [],       // { sessionId, track, startedAt, qualified }
  historyIndex: -1,
  currentTrack: null,
  sessionId: null,
  isPlaying: false,
  positionMs: 0,
  accumulatedMs: 0,
  lastPlayStart: null,
  qualified: false,
  validPlays: [],    // { sessionId, trackId, track, listenedAt }
  selections: [],    // { track, selectedAt } — clicks from search results
  mood: null,
  selectedMood: null,
  moodSlots: [],
  moodPhase: "picking", // picking | complete
  summaryTrack: null,
  manualRotationDeg: 0,
  isScrubbing: false,
};

let tickInterval = null;
let lastSearchResults = [];
let focusedResult = -1;
let audioEl = null;

function getAudio() {
  if (audioEl) return audioEl;
  audioEl = new Audio();
  audioEl.preload = "auto";
  audioEl.addEventListener("ended", () => {
    if (!state.currentTrack) return;
    state.positionMs = state.currentTrack.durationMs || audioEl.duration * 1000;
    onTrackEnded();
  });
  audioEl.addEventListener("loadedmetadata", () => {
    if (!state.currentTrack || !Number.isFinite(audioEl.duration)) return;
    const ms = Math.round(audioEl.duration * 1000);
    state.currentTrack.durationMs = ms;
    const catalog = TRACKS.find((t) => t.id === state.currentTrack.id);
    if (catalog) catalog.durationMs = ms;
    if (els.searchResults && !els.searchResults.classList.contains("hidden")) {
      handleSearch(els.searchInput?.value || "");
    }
  });
  audioEl.addEventListener("timeupdate", () => {
    if (!state.isPlaying || state.isScrubbing || !state.currentTrack) return;
    state.positionMs = audioEl.currentTime * 1000;
    checkQualify();
  });
  return audioEl;
}

function stopAudioElement() {
  if (!audioEl) return;
  try {
    audioEl.pause();
    audioEl.removeAttribute("src");
    audioEl.load();
  } catch { /* ignore */ }
}

function syncAudioToPosition() {
  if (!audioEl || !state.currentTrack) return;
  const dur = audioEl.duration;
  if (!Number.isFinite(dur) || dur <= 0) return;
  const t = Math.max(0, Math.min(state.positionMs / 1000, dur));
  if (Math.abs(audioEl.currentTime - t) > 0.05) {
    audioEl.currentTime = t;
  }
}

function trackDurationMs(track) {
  if (!track) return 0;
  if (track.durationMs > 0) return track.durationMs;
  if (audioEl && Number.isFinite(audioEl.duration) && audioEl.duration > 0) {
    return Math.round(audioEl.duration * 1000);
  }
  return 180000;
}

// ─── DOM refs ────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {
  todayDate: $("#today-date"),
  searchInput: $("#search-input"),
  searchResults: $("#search-results"),
  vinylDisc: $("#vinyl-disc"),
  vinylDiscIncoming: $("#vinyl-disc-incoming"),
  vinylStage: $("#vinyl-stage"),
  tonearm: $("#tonearm"),
  songTitle: $("#song-title"),
  songArtist: $("#song-artist"),
  coverImg: $("#cover-img"),
  coverFallback: $("#cover-fallback"),
  btnNextSong: $("#btn-next-song"),
  btnFinish: $("#btn-finish"),
  playCount: $("#play-count"),
  weekDots: $("#week-dots"),
  moodTrayList: $("#mood-tray-list"),
  moodBoxSlots: $("#mood-box-slots"),
  moodBoxCount: $("#mood-box-count"),
  moodBox: $("#music-box"),
  moodBoxLid: $("#music-box-lid"),
  moodLidHint: $("#mood-lid-hint"),
  moodComplete: $("#mood-complete"),
  moodDragGhost: $("#mood-drag-ghost"),
  moodDate: $("#mood-date"),
  btnMoodSkip: $("#btn-mood-skip"),
  btnMoodContinue: $("#btn-mood-continue"),
  collectionDate: $("#collection-date"),
  collectionGrid: $("#collection-grid"),
  collectionMoods: $("#collection-moods"),
  collectionPlayer: $("#collection-player"),
  summaryDisc: $("#summary-disc"),
  summaryDiscLabel: $("#summary-disc-label"),
  summaryTrackTitle: $("#summary-track-title"),
  summaryTrackArtist: $("#summary-track-artist"),
  modal: $("#modal"),
  modalText: $("#modal-text"),
  modalCancel: $("#modal-cancel"),
  modalConfirm: $("#modal-confirm"),
};

// ─── Init ────────────────────────────────────────────────
function init() {
  els.todayDate.textContent = new Date().toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric", weekday: "long",
  });

  loadState();
  renderMoodPicker();
  bindEvents();
  updateUI();
  updateWeekDots();
  renderDailyCollection();
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (saved.validPlays) state.validPlays = saved.validPlays;
    if (Array.isArray(saved.selections)) state.selections = saved.selections;
    if (!state.selections.length && state.validPlays.length) {
      state.selections = state.validPlays.map((play) => ({
        track: play.track,
        selectedAt: play.listenedAt,
      }));
    }
    if (saved.mood) state.mood = saved.mood;
    if (Array.isArray(saved.moodSlots)) state.moodSlots = saved.moodSlots.slice(0, MOOD_SLOT_MAX);
  } catch { /* ignore */ }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    validPlays: state.validPlays,
    selections: state.selections,
    mood: state.mood,
    moodSlots: state.moodSlots,
  }));
}

// ─── Navigation ──────────────────────────────────────────
function showScreen(name) {
  $$(".screen").forEach((s) => s.classList.remove("active"));
  $(`#screen-${name}`).classList.add("active");
  if (name === "mood") renderMoodPicker();
  if (name === "summary") renderDailyCollection();
}

/** 与向左拖相同：有后续历史则前进，否则（最新一首）出空白碟 */
function goNextSongLikeSwipe() {
  if (!state.currentTrack) return;
  if (canGoHistory(1)) goHistory(1, { animate: true });
  else swapToBlankRecord(-1);
}

function goToMoodScreen() {
  pausePlayback();
  state.moodSlots = [];
  state.moodPhase = "picking";
  state.selectedMood = null;
  showScreen("mood");
}

// ─── Search (local mock, no API) ─────────────────────────
function searchMockTracks(q) {
  const query = (q || "").trim().toLowerCase();
  if (!query) return TRACKS.slice();
  return TRACKS.filter(
    (t) =>
      t.title.toLowerCase().includes(query) ||
      t.artist.toLowerCase().includes(query) ||
      (t.album || "").toLowerCase().includes(query),
  );
}

function handleSearch(q) {
  focusedResult = -1;
  renderSearchResults(searchMockTracks(q));
}

function renderSearchResults(tracks) {
  lastSearchResults = tracks;
  if (!tracks.length) {
    els.searchResults.innerHTML =
      '<li style="padding:16px;text-align:center;color:#9a948c">No songs found</li>';
  } else {
    els.searchResults.innerHTML = tracks
      .map(
        (t, i) => `
      <li data-id="${t.id}" class="${i === focusedResult ? "focused" : ""}">
        <div class="result-cover" style="${t.coverUrl ? "" : `background:linear-gradient(135deg, ${t.color || "#d4843a"}, #2a2a2a)`}">${t.coverUrl ? `<img src="${t.coverUrl}" alt="" />` : "♪"}</div>
        <div class="result-info">
          <div class="result-title">${t.title}</div>
          <div class="result-artist">${t.artist}${t.album ? ` · ${t.album}` : ""}</div>
        </div>
        <span class="result-duration">${fmt(t.durationMs)}</span>
      </li>`,
      )
      .join("");
  }
  els.searchResults.classList.remove("hidden");

  els.searchResults.querySelectorAll("li[data-id]").forEach((li) => {
    li.addEventListener("click", () => {
      const track = tracks.find((t) => t.id === li.dataset.id);
      if (track) playTrack(track);
      els.searchResults.classList.add("hidden");
      els.searchInput.value = "";
    });
  });
}

// ─── Playback ────────────────────────────────────────────
function playTrack(track, { appendHistory = true, recordSelection = true } = {}) {
  const fromBlank = !state.currentTrack;
  endCurrentSession("changed_track");
  state.currentTrack = track;
  state.sessionId = crypto.randomUUID();
  state.positionMs = 0;
  state.accumulatedMs = 0;
  state.qualified = false;
  if (appendHistory) {
    // 非末尾选新歌：截断「未来」再追加，避免盖掉已听列表
    if (state.historyIndex >= 0 && state.historyIndex < state.history.length - 1) {
      state.history = state.history.slice(0, state.historyIndex + 1);
    }
    state.history.push({
      sessionId: state.sessionId,
      track,
      startedAt: new Date().toISOString(),
      qualified: false,
    });
    state.historyIndex = state.history.length - 1;
  }
  if (recordSelection) {
    state.selections.push({ track, selectedAt: new Date().toISOString() });
    saveState();
  }

  const audio = getAudio();
  audio.pause();
  audio.src = track.audioUrl || "";
  audio.currentTime = 0;

  startPlayback();
  updateUI({ fadeInCover: fromBlank });
}

function canGoHistory(delta) {
  if (state.history.length === 0) return false;
  // 空白碟：只能「向后」恢复当前 historyIndex 那一首
  if (!state.currentTrack) {
    return (
      delta < 0 &&
      state.historyIndex >= 0 &&
      state.historyIndex < state.history.length
    );
  }
  const newIndex = state.historyIndex + delta;
  return newIndex >= 0 && newIndex < state.history.length;
}

function startPlayback() {
  state.isPlaying = true;
  state.lastPlayStart = performance.now();
  startTick();
  els.vinylDisc.classList.add("spinning");
  els.vinylDisc.style.transform = "";
  updateTonearm();
  const audio = getAudio();
  if (state.currentTrack?.audioUrl) {
    syncAudioToPosition();
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => { /* autoplay / missing file */ });
    }
  }
  updateSummaryPlayer();
}

function pausePlayback() {
  if (state.isPlaying && state.lastPlayStart) {
    state.accumulatedMs += performance.now() - state.lastPlayStart;
    state.lastPlayStart = null;
  }
  state.isPlaying = false;
  stopTick();
  if (audioEl) {
    try { audioEl.pause(); } catch { /* ignore */ }
  }
  els.vinylDisc.classList.remove("spinning");
  const dur = state.currentTrack?.durationMs || 0;
  els.vinylDisc.style.transform = state.currentTrack && dur
    ? `rotate(${(state.positionMs / dur) * 360}deg)`
    : "";
  updateTonearm();
  checkQualify();
  updateSummaryPlayer();
}

function updateTonearm() {
  if (!els.tonearm) return;
  const hasTrack = !!state.currentTrack;
  const isActive = !!(state.currentTrack && state.isPlaying);
  els.tonearm.classList.toggle("on-record", isActive);
  els.vinylStage?.classList.toggle("has-track", hasTrack);
  els.vinylStage?.classList.toggle("is-playing", isActive);
}

function startTick() {
  stopTick();
  tickInterval = setInterval(() => {
    if (!state.isPlaying || !state.currentTrack || state.isScrubbing) return;
    // Prefer audio clock when available
    if (audioEl && Number.isFinite(audioEl.currentTime)) {
      state.positionMs = audioEl.currentTime * 1000;
      const dur = state.currentTrack.durationMs || (audioEl.duration * 1000);
      if (dur && state.positionMs >= dur - 50) {
        state.positionMs = dur;
        onTrackEnded();
        return;
      }
    } else {
      state.positionMs += 250;
      if (
        state.currentTrack.durationMs &&
        state.positionMs >= state.currentTrack.durationMs
      ) {
        state.positionMs = state.currentTrack.durationMs;
        onTrackEnded();
        return;
      }
    }
    checkQualify();
    updateSummaryPlayer();
  }, 250);
}

function stopTick() {
  if (tickInterval) clearInterval(tickInterval);
  tickInterval = null;
}

function onTrackEnded() {
  pausePlayback();
  qualifySession(true);
}

function seek(ms) {
  if (!state.currentTrack) return;
  const dur = state.currentTrack.durationMs || (audioEl?.duration ? audioEl.duration * 1000 : 0);
  state.positionMs = Math.max(0, Math.min(ms, dur || ms));
  syncAudioToPosition();
  updateVinylRotation();
  updateSummaryPlayer();
}

function updateVinylRotation() {
  if (!state.currentTrack || state.isScrubbing) return;
  const ratio = state.positionMs / state.currentTrack.durationMs;
  const deg = ratio * 360;
  els.vinylDisc.style.setProperty("--manual-rotate", `${deg}deg`);
}

function checkQualify() {
  if (state.qualified || !state.sessionId || !state.currentTrack) return;
  const totalMs = state.accumulatedMs + (state.isPlaying && state.lastPlayStart
    ? performance.now() - state.lastPlayStart : 0);
  const threshold = state.currentTrack.durationMs < VALID_THRESHOLD_MS
    ? state.currentTrack.durationMs * 0.8
    : VALID_THRESHOLD_MS;
  const reachedEnd = state.positionMs >= state.currentTrack.durationMs - 500;
  if (totalMs >= threshold || reachedEnd) {
    qualifySession(reachedEnd);
  }
}

function qualifySession(reachedEnd) {
  if (state.qualified) return;
  state.qualified = true;
  const entry = {
    sessionId: state.sessionId,
    trackId: state.currentTrack.id,
    track: state.currentTrack,
    listenedAt: new Date().toISOString(),
  };
  state.validPlays.push(entry);
  const histItem = state.history.find((h) => h.sessionId === state.sessionId);
  if (histItem) histItem.qualified = true;
  saveState();
  updatePlayCount();
}

function endCurrentSession(reason) {
  if (!state.sessionId) return;
  checkQualify();
  pausePlayback();
  state.sessionId = null;
}

function goHistory(delta, { animate = false } = {}) {
  if (!canGoHistory(delta)) return false;
  // 空白碟恢复：仍用当前 historyIndex；有曲碟则按 delta 移动
  const newIndex = !state.currentTrack
    ? state.historyIndex
    : state.historyIndex + delta;
  const item = state.history[newIndex];
  if (!item) return false;

  const apply = () => {
    state.historyIndex = newIndex;
    playTrack(item.track, { appendHistory: false });
  };

  if (!animate) {
    apply();
    return true;
  }

  // 向后(delta<0 / 空白恢复)：当前出右、旧碟从左进
  // 向前(delta>0)：当前出左、下一首从右进
  const animDir = !state.currentTrack || delta < 0 ? 1 : -1;
  animateDiscSwap(animDir, apply);
  return true;
}

function animateDiscSwap(direction, onDone) {
  const disc = els.vinylDisc;
  const incoming = els.vinylDiscIncoming;
  if (!disc || !incoming || disc.classList.contains("swapping")) return false;

  endCurrentSession("changed_track");
  pausePlayback();

  const left = direction < 0;
  const outClass = left ? "swap-out-left" : "swap-out-right";
  const inClass = left ? "swap-in-right" : "swap-in-left";

  disc.classList.remove("spinning", "manual-rotate");
  disc.style.transform = "";
  disc.classList.add("swapping", outClass);
  incoming.classList.add("swap-active", inClass);

  const cleanup = () => {
    // Apply state (e.g. clear cover for blank) before revealing the disc again
    onDone();
    disc.classList.remove("swapping", outClass);
    incoming.classList.remove("swap-active", inClass);
    disc.style.transition = "none";
    disc.style.transform = "";
    state.isScrubbing = false;
    requestAnimationFrame(() => {
      disc.style.transition = "";
    });
  };
  disc.addEventListener("animationend", cleanup, { once: true });
  return true;
}

// ─── Swap in a fresh blank record with a slide animation ──
function swapToBlankRecord(direction) {
  animateDiscSwap(direction, () => {
    stopAudioElement();
    state.currentTrack = null;
    state.sessionId = null;
    state.positionMs = 0;
    state.accumulatedMs = 0;
    state.qualified = false;
    clearVinylCover();
    updateUI();
  });
}

// ─── Vinyl gestures: label = scrub along yellow circle, outer = swipe ──
function setupVinylGestures() {
  const LABEL_R = 0.17; // yellow label radius ≈ 34% diameter / 2
  const LABEL_HIT_R = 0.19; // slightly larger so edge sliding stays hittable
  const LABEL_CANCEL_R = 0.22; // leave yellow neighborhood → cancel scrub

  let startX = 0;
  let startY = 0;
  let startPositionMs = 0;
  let gestureMode = null; // 'rotate' | 'swipe'
  let lockZone = null; // 'label' | 'outer'
  let active = false;
  let cancelled = false;
  let lastFingerAngle = 0;
  let scrubBaseDeg = 0;
  let scrubAccumDeg = 0;

  const discMetrics = () => {
    const disc = els.vinylDisc;
    const rect = disc.getBoundingClientRect();
    return {
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      rx: Math.max(rect.width / 2, 1),
      ry: Math.max(rect.height / 2, 1),
    };
  };

  /** Normalized radius on disc ellipse (0 = center, 1 = rim). */
  const normRadius = (x, y) => {
    const { cx, cy, rx, ry } = discMetrics();
    const nx = (x - cx) / rx;
    const ny = (y - cy) / ry;
    return Math.hypot(nx, ny);
  };

  /** Hit-test: yellow circle vs black outer ring. */
  const hitZone = (x, y) => {
    const r = normRadius(x, y);
    if (r > 1) return null;
    if (r <= LABEL_HIT_R) return "label";
    return "outer";
  };

  /**
   * Angle of pointer around disc center (degrees).
   * Near-center moves keep last angle so scrub feels like sliding on the
   * yellow circle circumference — finger arc angle maps 1:1 to disc rotation.
   */
  const fingerAngleAt = (x, y, fallback) => {
    const { cx, cy, rx, ry } = discMetrics();
    const dx = x - cx;
    const dy = y - cy;
    const minPx = Math.min(rx, ry) * LABEL_R * 0.45;
    if (Math.hypot(dx, dy) < minPx) return fallback;
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  };

  const normalizeAngle = (a) => {
    let v = a % 360;
    if (v > 180) v -= 360;
    if (v < -180) v += 360;
    return v;
  };

  const beginLabelScrub = (x, y) => {
    state.isScrubbing = true;
    els.vinylStage.classList.add("scrubbing");
    els.vinylDisc.classList.remove("spinning");
    els.vinylDisc.classList.add("manual-rotate");
    scrubBaseDeg = state.currentTrack
      ? (state.positionMs / state.currentTrack.durationMs) * 360
      : 0;
    scrubAccumDeg = 0;
    lastFingerAngle = fingerAngleAt(x, y, 0);
    els.vinylDisc.style.transform = `rotate(${scrubBaseDeg}deg)`;
  };

  const clearScrubVisual = () => {
    els.vinylStage.classList.remove("scrubbing");
    els.vinylDisc.classList.remove("manual-rotate");
    state.isScrubbing = false;
    if (state.isPlaying && state.currentTrack) {
      els.vinylDisc.style.transform = "";
      els.vinylDisc.classList.add("spinning");
    }
  };

  const cancelGesture = () => {
    if (!active || cancelled) return;
    cancelled = true;
    active = false;
    if (gestureMode === "rotate" && state.currentTrack) {
      state.positionMs = startPositionMs;
      const dur = trackDurationMs(state.currentTrack);
      state.manualRotationDeg = dur ? (startPositionMs / dur) * 360 : 0;
      syncAudioToPosition();
      if (state.isPlaying) {
        els.vinylDisc.style.transform = "";
      } else {
        els.vinylDisc.style.transform = `rotate(${state.manualRotationDeg}deg)`;
      }
    }
    clearScrubVisual();
    updateVinylRotation();
    gestureMode = null;
    lockZone = null;
  };

  const onStart = (x, y) => {
    const zone = hitZone(x, y);
    if (!zone) return;
    if (!state.currentTrack && zone === "label") return;

    active = true;
    cancelled = false;
    lockZone = zone;
    gestureMode = zone === "label" ? "rotate" : "swipe";
    startX = x;
    startY = y;
    startPositionMs = state.positionMs;
    scrubAccumDeg = 0;

    if (zone === "label" && state.currentTrack) {
      beginLabelScrub(x, y);
    } else {
      state.isScrubbing = false;
    }
  };

  const onMove = (x, y) => {
    if (!active || cancelled) return;

    if (lockZone === "label") {
      if (normRadius(x, y) > LABEL_CANCEL_R) {
        cancelGesture();
        return;
      }
    } else if (lockZone === "outer") {
      if (hitZone(x, y) === "label") {
        cancelGesture();
        return;
      }
    }

    if (gestureMode === "rotate" && state.currentTrack && lockZone === "label") {
      const ang = fingerAngleAt(x, y, lastFingerAngle);
      const step = normalizeAngle(ang - lastFingerAngle);
      lastFingerAngle = ang;
      // Finger arc along yellow circle → same angle of disc rotation
      scrubAccumDeg += step;

      const visualDeg = scrubBaseDeg + scrubAccumDeg;
      state.manualRotationDeg = visualDeg;
      els.vinylDisc.style.transform = `rotate(${visualDeg}deg)`;

      const durMs = trackDurationMs(state.currentTrack);
      const deltaMs = (scrubAccumDeg / 360) * durMs;
      state.positionMs = Math.max(0, Math.min(startPositionMs + deltaMs, durMs));
      syncAudioToPosition();
    }
  };

  const onEnd = (x) => {
    if (cancelled) {
      cancelled = false;
      return;
    }
    if (!active) return;
    const mode = gestureMode;
    const zone = lockZone;
    active = false;
    lockZone = null;
    gestureMode = null;

    if (mode === "swipe" && zone === "outer") {
      const diff = x - startX;
      if (diff < -80) {
        goNextSongLikeSwipe();
      } else if (diff > 80) {
        goHistory(-1, { animate: true });
      }
    } else if (mode === "rotate") {
      syncAudioToPosition();
      clearScrubVisual();
      updateVinylRotation();
    }
  };

  els.vinylStage.addEventListener("mousedown", (e) => {
    e.preventDefault();
    onStart(e.clientX, e.clientY);
  });
  window.addEventListener("mousemove", (e) => {
    if (active) onMove(e.clientX, e.clientY);
  });
  window.addEventListener("mouseup", (e) => onEnd(e.clientX));

  els.vinylStage.addEventListener("dblclick", (e) => {
    e.preventDefault();
    if (!state.currentTrack) return;
    if (state.isPlaying) pausePlayback();
    else startPlayback();
  });

  els.vinylStage.addEventListener(
    "touchstart",
    (e) => {
      const t = e.touches[0];
      onStart(t.clientX, t.clientY);
    },
    { passive: true },
  );
  els.vinylStage.addEventListener(
    "touchmove",
    (e) => {
      if (!active) return;
      const t = e.touches[0];
      onMove(t.clientX, t.clientY);
      if (gestureMode === "rotate") e.preventDefault();
    },
    { passive: false },
  );
  els.vinylStage.addEventListener("touchend", (e) => {
    onEnd(e.changedTouches[0].clientX);
  });
}

function localISODate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getMonday(d = new Date()) {
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function dayHasMusic(isoDate) {
  return state.validPlays.some(
    (p) => localISODate(new Date(p.listenedAt)) === isoDate,
  );
}

function updateWeekDots() {
  if (!els.weekDots) return;
  const today = localISODate();
  const monday = getMonday();
  const dots = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = localISODate(d);
    let status = "today";

    if (iso > today) status = "future";
    else if (dayHasMusic(iso)) status = "filled";
    else if (iso === today) status = "today";
    else status = "missed";

    dots.push(`<span class="week-dot ${status}"></span>`);
  }

  els.weekDots.innerHTML = dots.join("");
}

// ─── UI updates ──────────────────────────────────────────
function clearVinylCover() {
  const label = $("#vinyl-label");
  if (els.coverImg) {
    els.coverImg.removeAttribute("src");
    els.coverImg.hidden = true;
  }
  if (els.coverFallback) {
    els.coverFallback.hidden = true;
    els.coverFallback.style.background = "";
  }
  label?.classList.remove("has-cover", "cover-fade-in");
}

function updateUI({ fadeInCover = false } = {}) {
  const t = state.currentTrack;
  const label = $("#vinyl-label");
  if (t) {
    els.songTitle.textContent = t.title;
    els.songArtist.textContent = `${t.artist}${t.album ? ` · ${t.album}` : ""}`;
    if (t.coverUrl) {
      els.coverImg.src = t.coverUrl;
      els.coverImg.hidden = false;
      els.coverFallback.hidden = true;
      label?.classList.add("has-cover");
      if (fadeInCover && label) {
        label.classList.remove("cover-fade-in");
        // restart CSS animation
        void label.offsetWidth;
        label.classList.add("cover-fade-in");
        const onEnd = () => label.classList.remove("cover-fade-in");
        label.addEventListener("animationend", onEnd, { once: true });
      }
    } else {
      clearVinylCover();
      els.coverFallback.textContent = "";
      els.coverFallback.style.background = `linear-gradient(135deg, ${t.color || "#d4843a"}, #333)`;
      els.coverFallback.hidden = false;
    }
  } else {
    els.songTitle.textContent = "";
    els.songArtist.textContent = "";
    clearVinylCover();
  }
  els.vinylDisc.classList.toggle("empty", !state.currentTrack);
  if (els.btnNextSong) els.btnNextSong.disabled = !state.currentTrack;
  updateVinylRotation();
  updateTonearm();
  updatePlayCount();
  updateWeekDots();
}

function updatePlayCount() {
  const today = new Date().toDateString();
  const todayPlays = state.validPlays.filter(
    (p) => new Date(p.listenedAt).toDateString() === today,
  );
  els.playCount.textContent = todayPlays.length
    ? `${todayPlays.length} valid play${todayPlays.length === 1 ? "" : "s"} today`
    : "";
}

function fmt(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

// ─── Mood box ────────────────────────────────────────────
function primaryMoodFromSlots(slots) {
  if (!slots.length) return null;
  const counts = new Map();
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
  return MOODS.find((m) => m.label === best) || null;
}

function moodColor(label) {
  return MOODS.find((m) => m.label === label)?.color || "#888";
}

function moodMiniVinylHtml(label, text, { size = "" } = {}) {
  const sizeClass = size ? ` mood-mini-vinyl--${size}` : "";
  return `
    <div class="mood-mini-vinyl${sizeClass}" data-label="${label}">
      <div class="mood-mini-disc">
        <div class="mood-mini-sheen" aria-hidden="true"></div>
        <div class="mood-mini-grooves" aria-hidden="true"></div>
        <div class="mood-mini-label" style="background:${moodColor(label)}">
          <img src="${twemojiUrl(label)}" alt="" draggable="false" />
        </div>
        <div class="mood-mini-hole" aria-hidden="true"></div>
      </div>
      ${text ? `<span class="mood-mini-text">${text}</span>` : ""}
    </div>`;
}

function renderMoodPicker() {
  if (els.moodDate) {
    els.moodDate.textContent = new Date().toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  }

  if (els.moodTrayList) {
    els.moodTrayList.innerHTML = MOODS.map(
      (m) => `
      <button type="button" class="mood-tray-item" data-label="${m.label}">
        ${moodMiniVinylHtml(m.label, m.text)}
      </button>`,
    ).join("");
  }

  renderMoodBoxSlots();
  updateMoodBoxChrome();

  if (els.moodComplete) {
    els.moodComplete.classList.toggle("hidden", state.moodPhase !== "complete");
  }
  if (els.moodBox) {
    els.moodBox.dataset.lid = state.moodPhase === "complete" ? "closed" : "open";
    els.moodBox.classList.toggle("is-full", state.moodSlots.length >= MOOD_SLOT_MAX);
  }

  setupMoodDrag();
}

function renderMoodBoxSlots() {
  if (!els.moodBoxSlots) return;
  const n = state.moodSlots.length;
  const spreads = [-28, -14, 0, 14, 28];
  const tilts = [-18, -8, 4, -6, 12];
  const cells = state.moodSlots.map((label, i) => {
    const x = spreads[i] ?? (i - 2) * 14;
    const r = tilts[i] ?? (i - 2) * 6;
    const z = 10 + i;
    return `
      <button type="button" class="mood-slot filled" data-slot-index="${i}" aria-label="Remove ${label} mood" style="--sx:${x}px;--sr:${r}deg;--sz:${z}">
        ${moodMiniVinylHtml(label, "", { size: "box" })}
      </button>`;
  });
  if (!n) {
    cells.push('<div class="mood-slot-placeholder">Drop feelings here</div>');
  }
  els.moodBoxSlots.innerHTML = cells.join("");
  els.moodBoxSlots.dataset.count = String(n);
}

function updateMoodBoxChrome() {
  const n = state.moodSlots.length;
  if (els.moodBoxCount) els.moodBoxCount.textContent = `${n} / ${MOOD_SLOT_MAX}`;
  if (els.moodLidHint) {
    els.moodLidHint.classList.toggle("hidden", state.moodPhase === "complete");
    els.moodLidHint.textContent = n > 0
      ? "Slide the lid closed to seal today's feelings"
      : "Drop 1–5 feelings into the box";
    els.moodLidHint.classList.toggle("ready", n > 0);
  }
  if (els.moodBox) {
    els.moodBox.classList.toggle("is-full", n >= MOOD_SLOT_MAX);
    els.moodBox.dataset.count = String(n);
  }
  const stage = els.moodBox?.closest(".mood-box-stage");
  stage?.classList.toggle("has-slots", n > 0);
  stage?.classList.toggle("is-ready", n > 0);
}

function addMoodSlot(label) {
  if (state.moodPhase !== "picking") return;
  if (state.moodSlots.length >= MOOD_SLOT_MAX) return;
  if (!MOODS.some((m) => m.label === label)) return;
  state.moodSlots.push(label);
  renderMoodBoxSlots();
  updateMoodBoxChrome();
}

function sealMoodBox() {
  if (state.moodSlots.length < 1) return;
  const primary = primaryMoodFromSlots(state.moodSlots);
  if (!primary) return;
  state.selectedMood = primary;
  state.mood = {
    label: primary.label,
    score: primary.score,
    date: new Date().toISOString(),
    slots: state.moodSlots.slice(),
  };
  state.moodPhase = "complete";
  saveState();
  if (els.moodBox) els.moodBox.dataset.lid = "closed";
  if (els.moodLidHint) els.moodLidHint.classList.add("hidden");
  if (els.moodComplete) els.moodComplete.classList.remove("hidden");
}

function setupMoodDrag() {
  if (!els.moodTrayList || !els.moodBox) return;
  if (els.moodTrayList.dataset.dragBound === "1") return;
  els.moodTrayList.dataset.dragBound = "1";

  let dragLabel = null;
  let dragging = false;
  let dragMoved = false;
  let startX = 0;
  let startY = 0;

  const ghost = els.moodDragGhost;

  const moveGhost = (x, y) => {
    if (!ghost) return;
    ghost.style.left = `${x}px`;
    ghost.style.top = `${y}px`;
  };

  const endDrag = (x, y) => {
    if (!dragging) return;
    dragging = false;
    ghost?.classList.add("hidden");
    const box = els.moodBox.getBoundingClientRect();
    const hit =
      x >= box.left && x <= box.right && y >= box.top && y <= box.bottom;
    if (dragLabel) {
      if (hit || !dragMoved) addMoodSlot(dragLabel);
    }
    dragLabel = null;
    dragMoved = false;
  };

  const startDrag = (label, x, y) => {
    if (state.moodPhase !== "picking") return;
    if (state.moodSlots.length >= MOOD_SLOT_MAX) return;
    dragLabel = label;
    dragging = true;
    dragMoved = false;
    startX = x;
    startY = y;
    if (ghost) {
      ghost.innerHTML = `
        <div class="mood-drag-trail" aria-hidden="true"></div>
        ${moodMiniVinylHtml(label, "", { size: "ghost" })}`;
      ghost.classList.remove("hidden");
      moveGhost(x, y);
    }
  };

  els.moodTrayList.addEventListener("pointerdown", (e) => {
    const item = e.target.closest(".mood-tray-item");
    if (!item) return;
    e.preventDefault();
    item.setPointerCapture?.(e.pointerId);
    startDrag(item.dataset.label, e.clientX, e.clientY);
  });

  els.moodBoxSlots?.addEventListener("click", (e) => {
    if (state.moodPhase !== "picking") return;
    const slot = e.target.closest("[data-slot-index]");
    if (!slot) return;
    const index = Number(slot.dataset.slotIndex);
    if (!Number.isInteger(index)) return;
    state.moodSlots.splice(index, 1);
    renderMoodBoxSlots();
    updateMoodBoxChrome();
  });

  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    if (Math.hypot(e.clientX - startX, e.clientY - startY) > 8) dragMoved = true;
    moveGhost(e.clientX, e.clientY);
  });

  window.addEventListener("pointerup", (e) => endDrag(e.clientX, e.clientY));
  window.addEventListener("pointercancel", (e) => endDrag(e.clientX, e.clientY));

  // Lid slide to close
  let lidDragging = false;
  let lidStartY = 0;
  let lidDelta = 0;

  els.moodBoxLid?.addEventListener("pointerdown", (e) => {
    if (state.moodSlots.length < 1 || state.moodPhase !== "picking") return;
    lidDragging = true;
    lidStartY = e.clientY;
    lidDelta = 0;
    els.moodBoxLid.setPointerCapture?.(e.pointerId);
  });

  window.addEventListener("pointermove", (e) => {
    if (!lidDragging || !els.moodBoxLid) return;
    lidDelta = Math.max(0, e.clientY - lidStartY);
    const pct = Math.min(lidDelta / 120, 1);
    els.moodBoxLid.style.setProperty("--lid-close", String(pct));
  });

  window.addEventListener("pointerup", () => {
    if (!lidDragging) return;
    lidDragging = false;
    if (lidDelta > 48) {
      sealMoodBox();
    }
    if (els.moodBoxLid) els.moodBoxLid.style.setProperty("--lid-close", "0");
    lidDelta = 0;
  });
}

// ─── Daily collection ───────────────────────────────────
function getTodayCollection() {
  const today = localISODate();
  const seen = new Set();
  const tracks = [];
  for (const selection of state.selections) {
    if (!selection?.track || !selection.selectedAt) continue;
    if (localISODate(new Date(selection.selectedAt)) !== today) continue;
    if (seen.has(selection.track.id)) continue;
    seen.add(selection.track.id);
    tracks.push(selection.track);
    if (tracks.length >= 8) break;
  }
  return tracks;
}

function collectionRecordHtml(track, selected) {
  const labelStyle = track.coverUrl
    ? `background-image:url('${track.coverUrl}')`
    : `background:linear-gradient(145deg, ${track.color || "#d4843a"}, #2a2018)`;
  return `
    <button type="button" class="collection-record${selected ? " is-selected" : ""}" data-track-id="${track.id}" aria-pressed="${selected}" title="${track.title} — ${track.artist}">
      <span class="collection-vinyl">
        <span class="collection-vinyl-grooves"></span>
        <span class="collection-vinyl-label" style="${labelStyle}"></span>
      </span>
    </button>`;
}

function renderDailyCollection() {
  if (!els.collectionGrid) return;
  const tracks = getTodayCollection();
  if (!state.summaryTrack || !tracks.some((track) => track.id === state.summaryTrack.id)) {
    state.summaryTrack = tracks[0] || null;
  }

  if (els.collectionDate) {
    els.collectionDate.textContent = new Date().toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
  }

  els.collectionGrid.innerHTML = Array.from({ length: 8 }, (_, index) => {
    const track = tracks[index];
    return `
      <div class="collection-slot">
        ${track ? collectionRecordHtml(track, track.id === state.summaryTrack?.id) : '<div class="collection-empty" aria-hidden="true"></div>'}
        <div class="collection-rest" aria-hidden="true"></div>
      </div>`;
  }).join("");

  els.collectionGrid.querySelectorAll("[data-track-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const track = tracks.find((item) => item.id === button.dataset.trackId);
      if (!track) return;
      if (state.isPlaying) pausePlayback();
      state.summaryTrack = track;
      renderDailyCollection();
    });
  });

  const moodSlots = Array.isArray(state.mood?.slots)
    ? state.mood.slots.slice(0, 5)
    : state.mood?.label
      ? [state.mood.label]
      : [];
  if (els.collectionMoods) {
    els.collectionMoods.innerHTML = moodSlots.map((label) => `
      <span class="collection-mood" title="${MOODS.find((m) => m.label === label)?.text || label}">
        <span style="background:${moodColor(label)}"><img src="${twemojiUrl(label)}" alt="" /></span>
      </span>`).join("");
  }

  updateSummaryPlayer();
}

function updateSummaryPlayer() {
  if (!els.summaryDisc || !els.collectionPlayer) return;
  const track = state.summaryTrack;
  const isActive = !!track && state.currentTrack?.id === track.id;
  els.collectionPlayer.classList.toggle("has-track", !!track);
  els.collectionPlayer.classList.toggle("is-playing", isActive && state.isPlaying);
  els.summaryDisc.classList.toggle("spinning", isActive && state.isPlaying);

  if (!track) {
    els.summaryDiscLabel.style.backgroundImage = "";
    els.summaryDiscLabel.style.background = "linear-gradient(145deg,#8f653f,#30231a)";
    els.summaryTrackTitle.textContent = "Select a record";
    els.summaryTrackArtist.textContent = "Click a record on the shelf to mount it";
    return;
  }

  els.summaryTrackTitle.textContent = track.title;
  els.summaryTrackArtist.textContent = `${track.artist}${isActive ? "" : " · Mounted — tap to play"}`;
  if (track.coverUrl) {
    els.summaryDiscLabel.style.background = "";
    els.summaryDiscLabel.style.backgroundImage = `url('${track.coverUrl}')`;
  } else {
    els.summaryDiscLabel.style.backgroundImage = "";
    els.summaryDiscLabel.style.background = `linear-gradient(145deg,${track.color || "#d4843a"},#30231a)`;
  }
  if (isActive && !state.isPlaying) {
    const duration = trackDurationMs(track);
    els.summaryDisc.style.transform = duration
      ? `rotate(${(state.positionMs / duration) * 360}deg)`
      : "";
  } else if (!isActive) {
    els.summaryDisc.style.transform = "rotate(0deg)";
  } else {
    els.summaryDisc.style.transform = "";
  }
}

function toggleSummaryPlayback() {
  const track = state.summaryTrack;
  if (!track) return;
  if (state.currentTrack?.id !== track.id) {
    playTrack(track, { appendHistory: true, recordSelection: false });
  } else if (state.isPlaying) {
    pausePlayback();
  } else {
    startPlayback();
  }
}

function setupSummaryPlayerGestures() {
  const player = els.collectionPlayer;
  if (!player || player.dataset.bound === "1") return;
  player.dataset.bound = "1";
  let active = false;
  let rotating = false;
  let startX = 0;
  let startY = 0;
  let startAngle = 0;
  let startPosition = 0;

  const angleAt = (x, y) => {
    const rect = els.summaryDisc.getBoundingClientRect();
    return Math.atan2(y - (rect.top + rect.height / 2), x - (rect.left + rect.width / 2));
  };

  player.addEventListener("pointerdown", (event) => {
    if (!state.summaryTrack) return;
    active = true;
    rotating = false;
    startX = event.clientX;
    startY = event.clientY;
    startAngle = angleAt(event.clientX, event.clientY);
    startPosition = state.positionMs;
    player.setPointerCapture?.(event.pointerId);
  });

  player.addEventListener("pointermove", (event) => {
    if (!active || state.currentTrack?.id !== state.summaryTrack?.id) return;
    if (Math.hypot(event.clientX - startX, event.clientY - startY) > 8) rotating = true;
    if (!rotating) return;
    const delta = angleAt(event.clientX, event.clientY) - startAngle;
    const normalized = Math.atan2(Math.sin(delta), Math.cos(delta));
    seek(startPosition + (normalized / (Math.PI * 2)) * trackDurationMs(state.summaryTrack));
  });

  player.addEventListener("pointerup", () => {
    if (!active) return;
    active = false;
    if (!rotating) toggleSummaryPlayback();
  });
  player.addEventListener("pointercancel", () => {
    active = false;
    rotating = false;
  });
  player.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleSummaryPlayback();
    }
  });
}

// ─── Legacy weekly report helpers (kept for share-card compatibility) ──
function getTop5() {
  const counts = {};
  for (const p of state.validPlays) {
    if (!counts[p.trackId]) {
      counts[p.trackId] = { track: p.track, count: 0, lastPlayed: p.listenedAt };
    }
    counts[p.trackId].count++;
    if (p.listenedAt > counts[p.trackId].lastPlayed) {
      counts[p.trackId].lastPlayed = p.listenedAt;
    }
  }
  return Object.values(counts)
    .sort((a, b) => b.count - a.count || b.lastPlayed.localeCompare(a.lastPlayed))
    .slice(0, 5);
}

function renderReport() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmtD = (d) => `${d.getMonth() + 1}/${d.getDate()}`;
  els.weekRange.textContent = `${fmtD(monday)} – ${fmtD(sunday)}, ${sunday.getFullYear()}`;

  const top5 = getTop5();
  const positions = [
    { top: "2%", left: "5%" },
    { top: "2%", right: "5%" },
    { bottom: "8%", left: "0%" },
    { bottom: "8%", right: "0%" },
    { top: "38%", left: "-2%" },
  ];

  els.reportVinyls.innerHTML = top5
    .map((item, i) => {
      const pos = positions[i] || positions[0];
      const style = Object.entries(pos).map(([k, v]) => `${k}:${v}`).join(";");
      return `
      <div class="mini-vinyl" style="${style}">
        <div class="mini-vinyl-disc">
          <span class="rank rank-${i + 1}">${i + 1}</span>
          <div class="label" style="background:${item.track.color}">${item.track.title.slice(0, 2)}</div>
        </div>
        <p>${item.track.title}</p>
        <p>${item.count}×</p>
      </div>`;
    })
    .join("");

  if (!top5.length) {
    els.reportVinyls.innerHTML = '<p style="text-align:center;color:#9a948c;width:100%;padding-top:40px">No plays yet — go listen to a few songs</p>';
  }

  const moodText = state.mood
    ? MOODS.find((m) => m.label === state.mood.label)?.text || ""
    : "Not logged";
  const uniqueDays = new Set(
    state.validPlays.map((p) => new Date(p.listenedAt).toDateString()),
  ).size;

  els.moodStats.innerHTML = `
    <div class="stat-pill">${state.validPlays.length} total plays</div>
    <div class="stat-pill">${uniqueDays} listening days</div>
    <div class="stat-pill">Mood ${moodText}</div>
    <div class="stat-pill">${new Set(state.validPlays.map((p) => p.trackId)).size} songs</div>
  `;

  els.top5List.innerHTML = top5.length
    ? top5
        .map(
          (item, i) => `
      <div class="top5-item">
        <span class="top5-rank">${i + 1}</span>
        <div class="top5-info">
          <div class="top5-title">${item.track.title}</div>
          <div class="top5-artist">${item.track.artist}</div>
        </div>
        <span class="top5-count">${item.count}×</span>
      </div>`,
        )
        .join("")
    : '<p style="color:#9a948c;font-size:14px">No data yet</p>';
}

// ─── Share image ─────────────────────────────────────────
function generateShareImage() {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#f4efe6";
  ctx.fillRect(0, 0, 1080, 1350);

  ctx.fillStyle = "#2a2a2a";
  ctx.font = "bold 56px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText("Music Diary", 540, 100);
  ctx.font = "28px sans-serif";
  ctx.fillStyle = "#6b6560";
  ctx.fillText(els.weekRange.textContent, 540, 150);

  const top5 = getTop5();
  if (top5[0]) {
    ctx.fillStyle = "#1a1a1a";
    roundRect(ctx, 80, 200, 920, 200, 20);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 42px Georgia, serif";
    ctx.fillText(`#1 ${top5[0].track.title}`, 540, 290);
    ctx.font = "28px sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText(`${top5[0].track.artist} · ${top5[0].count}×`, 540, 340);
  }

  let y = 460;
  ctx.fillStyle = "#2a2a2a";
  ctx.font = "bold 32px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Top 5", 80, y);
  y += 40;
  ctx.font = "26px sans-serif";
  top5.forEach((item, i) => {
    y += 50;
    ctx.fillStyle = "#2a2a2a";
    ctx.fillText(`${i + 1}. ${item.track.title}`, 80, y);
    ctx.fillStyle = "#9a948c";
    ctx.textAlign = "right";
    ctx.fillText(`${item.count}×`, 1000, y);
    ctx.textAlign = "left";
  });

  ctx.fillStyle = "#9a948c";
  ctx.font = "22px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${state.validPlays.length} total plays · music-diary demo`, 540, 1280);

  const link = document.createElement("a");
  link.download = `music-weekly-report-${new Date().toISOString().slice(0, 10)}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Events ──────────────────────────────────────────────
function bindEvents() {
  const openSearch = () => {
    els.searchInput.focus();
    handleSearch(els.searchInput.value);
  };

  els.searchInput.addEventListener("input", (e) => handleSearch(e.target.value));
  els.searchInput.addEventListener("focus", (e) => handleSearch(e.target.value));
  // Click anywhere on the search chrome opens the mock dropdown
  const searchGlass = document.querySelector(".search-glass");
  if (searchGlass) {
    searchGlass.addEventListener("mousedown", (e) => {
      if (e.target === els.searchInput) return;
      e.preventDefault();
      openSearch();
    });
  }

  els.searchInput.addEventListener("keydown", (e) => {
    const items = els.searchResults.querySelectorAll("li[data-id]");
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusedResult = Math.min(focusedResult + 1, items.length - 1);
      items.forEach((li, i) => li.classList.toggle("focused", i === focusedResult));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusedResult = Math.max(focusedResult - 1, 0);
      items.forEach((li, i) => li.classList.toggle("focused", i === focusedResult));
    } else if (e.key === "Enter" && focusedResult >= 0 && lastSearchResults[focusedResult]) {
      playTrack(lastSearchResults[focusedResult]);
      els.searchResults.classList.add("hidden");
      els.searchInput.value = "";
    } else if (e.key === "Escape") {
      els.searchResults.classList.add("hidden");
    }
  });

  document.addEventListener("mousedown", (e) => {
    if (!e.target.closest(".search-wrap")) {
      els.searchResults.classList.add("hidden");
    }
  });

  els.btnNextSong.addEventListener("click", () => goNextSongLikeSwipe());

  // After picking a song, "That's it" goes straight to the mood screen
  els.btnFinish.addEventListener("click", () => {
    if (!state.currentTrack && state.history.length === 0) {
      alert("Pick a song first.");
      return;
    }
    goToMoodScreen();
  });

  els.modalCancel.addEventListener("click", () => els.modal.classList.add("hidden"));
  els.modalConfirm.addEventListener("click", () => {
    els.modal.classList.add("hidden");
    goToMoodScreen();
  });

  els.btnMoodContinue?.addEventListener("click", () => {
    showScreen("summary");
  });

  $$("[data-go]").forEach((btn) => {
    btn.addEventListener("click", () => showScreen(btn.dataset.go));
  });

  setupVinylGestures();
  setupSummaryPlayerGestures();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.isPlaying) pausePlayback();
  });
}

// ─── Boot ────────────────────────────────────────────────
init();
