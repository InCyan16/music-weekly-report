/**
 * Music Diary — Standalone Demo
 * No backend required. Run: python3 demo/serve.py
 */

const TRACKS = [
  { id: "1", title: "Golden Hour", artist: "Mock Artist", album: "Demo Album", durationMs: 45000, color: "#d4843a" },
  { id: "2", title: "Midnight Drive", artist: "Test Band", album: "Night Sessions", durationMs: 180000, color: "#5a7ec4" },
  { id: "3", title: "Rainy Sunday", artist: "Lo-Fi Collective", album: "Calm Days", durationMs: 240000, color: "#6a9e72" },
  { id: "4", title: "City Lights", artist: "Urban Echo", album: "Neon", durationMs: 210000, color: "#c45c4a" },
  { id: "5", title: "Soft Landing", artist: "Ambient Works", album: "Drift", durationMs: 320000, color: "#8b7ec8" },
  { id: "6", title: "Morning Coffee", artist: "Lin Yi", album: "Everyday", durationMs: 195000, color: "#d4b83a" },
];

const TWEMOJI_CDN =
  "https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.2/assets/svg";

const MOOD_TWEMOJI = {
  very_happy: "1f604",
  happy: "1f60a",
  calm: "1f60c",
  low: "1f614",
  sad: "1f622",
};

function twemojiUrl(label) {
  return `${TWEMOJI_CDN}/${MOOD_TWEMOJI[label]}.svg`;
}

const MOODS = [
  { label: "very_happy", score: 5, emoji: "😄", text: "Very happy" },
  { label: "happy", score: 4, emoji: "😊", text: "Happy" },
  { label: "calm", score: 3, emoji: "😌", text: "Calm" },
  { label: "low", score: 2, emoji: "😔", text: "Low" },
  { label: "sad", score: 1, emoji: "😢", text: "Sad" },
];

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
  mood: null,
  selectedMood: null,
  manualRotationDeg: 0,
  isScrubbing: false,
};

let tickInterval = null;
let lastSearchResults = [];
let focusedResult = -1;

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
  moodRow: $("#mood-row"),
  btnMoodDone: $("#btn-mood-done"),
  weekRange: $("#week-range"),
  reportVinyls: $("#report-vinyls"),
  moodStats: $("#mood-stats"),
  top5List: $("#top5-list"),
  btnShare: $("#btn-share"),
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
  renderReport();
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (saved.validPlays) state.validPlays = saved.validPlays;
    if (saved.mood) state.mood = saved.mood;
  } catch { /* ignore */ }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    validPlays: state.validPlays,
    mood: state.mood,
  }));
}

// ─── Navigation ──────────────────────────────────────────
function showScreen(name) {
  $$(".screen").forEach((s) => s.classList.remove("active"));
  $(`#screen-${name}`).classList.add("active");
  if (name === "mood") renderMoodPicker();
  if (name === "report") renderReport();
}

/** 与向左拖唱片相同：有曲则滑出空白碟；已是空白则无反应 */
function goNextSongLikeSwipe() {
  if (!state.currentTrack) return;
  swapToBlankRecord(-1);
}

function goToMoodScreen() {
  pausePlayback();
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
function playTrack(track, { appendHistory = true } = {}) {
  endCurrentSession("changed_track");
  state.currentTrack = track;
  state.sessionId = crypto.randomUUID();
  state.positionMs = 0;
  state.accumulatedMs = 0;
  state.qualified = false;
  if (appendHistory) {
    state.history.push({
      sessionId: state.sessionId,
      track,
      startedAt: new Date().toISOString(),
      qualified: false,
    });
    state.historyIndex = state.history.length - 1;
  }
  startPlayback();
  updateUI();
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
}

function pausePlayback() {
  if (state.isPlaying && state.lastPlayStart) {
    state.accumulatedMs += performance.now() - state.lastPlayStart;
    state.lastPlayStart = null;
  }
  state.isPlaying = false;
  stopTick();
  els.vinylDisc.classList.remove("spinning");
  els.vinylDisc.style.transform = state.currentTrack
    ? `rotate(${(state.positionMs / state.currentTrack.durationMs) * 360}deg)`
    : "";
  updateTonearm();
  checkQualify();
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
    state.positionMs += 250;
    if (state.positionMs >= state.currentTrack.durationMs) {
      state.positionMs = state.currentTrack.durationMs;
      onTrackEnded();
    }
    checkQualify();
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
  state.positionMs = Math.max(0, Math.min(ms, state.currentTrack.durationMs));
  updateVinylRotation();
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

  // 回到上一首：当前碟向右出，历史碟从左进
  animateDiscSwap(1, apply);
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
    disc.classList.remove("swapping", outClass);
    incoming.classList.remove("swap-active", inClass);
    disc.style.transition = "none";
    disc.style.transform = "";
    state.isScrubbing = false;
    onDone();
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
    state.currentTrack = null;
    state.sessionId = null;
    state.positionMs = 0;
    state.accumulatedMs = 0;
    state.qualified = false;
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
      state.manualRotationDeg =
        (startPositionMs / state.currentTrack.durationMs) * 360;
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

      const deltaMs = (scrubAccumDeg / 360) * state.currentTrack.durationMs;
      state.positionMs = Math.max(
        0,
        Math.min(startPositionMs + deltaMs, state.currentTrack.durationMs),
      );
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
function updateUI() {
  const t = state.currentTrack;
  if (t) {
    els.songTitle.textContent = t.title;
    els.songArtist.textContent = `${t.artist}${t.album ? ` · ${t.album}` : ""}`;
    if (t.coverUrl) {
      els.coverImg.src = t.coverUrl;
      els.coverImg.hidden = false;
      els.coverFallback.hidden = true;
    } else {
      els.coverFallback.textContent = "";
      els.coverFallback.style.background = `linear-gradient(135deg, ${t.color || "#d4843a"}, #333)`;
      els.coverFallback.hidden = false;
      els.coverImg.hidden = true;
    }
  } else {
    els.songTitle.textContent = "";
    els.songArtist.textContent = "";
    els.coverImg.hidden = true;
    els.coverFallback.hidden = true;
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

// ─── Mood ────────────────────────────────────────────────
function renderMoodPicker() {
  els.moodRow.innerHTML = MOODS.map(
    (m, i) => `
    <button class="mood-item" data-label="${m.label}" role="radio" aria-checked="false" style="animation-delay:${i * 60}ms">
      <div class="mood-ring"></div>
      <span class="mood-face"><img src="${twemojiUrl(m.label)}" alt="" draggable="false" /></span>
      <span class="mood-label">${m.text}</span>
    </button>`,
  ).join("");

  els.moodRow.querySelectorAll(".mood-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      els.moodRow.querySelectorAll(".mood-item").forEach((b) => {
        b.classList.remove("selected");
        b.setAttribute("aria-checked", "false");
      });
      btn.classList.add("selected");
      btn.setAttribute("aria-checked", "true");
      state.selectedMood = MOODS.find((m) => m.label === btn.dataset.label);
      els.btnMoodDone.disabled = false;
    });
  });
}

// ─── Report ──────────────────────────────────────────────
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

  els.btnMoodDone.addEventListener("click", () => {
    if (!state.selectedMood) return;
    state.mood = {
      label: state.selectedMood.label,
      score: state.selectedMood.score,
      date: new Date().toISOString(),
    };
    saveState();
    showScreen("report");
  });

  els.btnShare.addEventListener("click", generateShareImage);

  $$("[data-go]").forEach((btn) => {
    btn.addEventListener("click", () => showScreen(btn.dataset.go));
  });

  setupVinylGestures();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.isPlaying) pausePlayback();
  });
}

// ─── Boot ────────────────────────────────────────────────
init();
