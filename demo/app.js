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
  { id: "6", title: "晨间咖啡", artist: "林一", album: "日常", durationMs: 195000, color: "#d4b83a" },
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
  { label: "very_happy", score: 5, emoji: "😄", text: "非常开心" },
  { label: "happy", score: 4, emoji: "😊", text: "开心" },
  { label: "calm", score: 3, emoji: "😌", text: "平静" },
  { label: "low", score: 2, emoji: "😔", text: "低落" },
  { label: "sad", score: 1, emoji: "😢", text: "难过" },
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

let audioCtx = null;
let oscillator = null;
let gainNode = null;
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
  tonearm: null,
  songTitle: $("#song-title"),
  songArtist: $("#song-artist"),
  coverImg: $("#cover-img"),
  coverFallback: $("#cover-fallback"),
  btnNextSong: $("#btn-next-song"),
  btnFinish: $("#btn-finish"),
  btnMoodJump: $("#btn-mood-jump"),
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
  els.todayDate.textContent = new Date().toLocaleDateString("zh-CN", {
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
  if (name === "report") renderReport();
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
      '<li style="padding:16px;text-align:center;color:#9a948c">没有找到相关歌曲</li>';
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
function playTrack(track) {
  endCurrentSession("changed_track");
  state.currentTrack = track;
  state.sessionId = crypto.randomUUID();
  state.positionMs = 0;
  state.accumulatedMs = 0;
  state.qualified = false;
  state.history.push({
    sessionId: state.sessionId,
    track,
    startedAt: new Date().toISOString(),
    qualified: false,
  });
  state.historyIndex = state.history.length - 1;
  startPlayback();
  updateUI();
}

function startPlayback() {
  state.isPlaying = true;
  state.lastPlayStart = performance.now();
  startAudio();
  startTick();
  els.vinylDisc.classList.add("spinning");
  els.vinylDisc.style.transform = "";
}

function pausePlayback() {
  if (state.isPlaying && state.lastPlayStart) {
    state.accumulatedMs += performance.now() - state.lastPlayStart;
    state.lastPlayStart = null;
  }
  state.isPlaying = false;
  stopAudio();
  stopTick();
  els.vinylDisc.classList.remove("spinning");
  els.vinylDisc.style.transform = state.currentTrack
    ? `rotate(${(state.positionMs / state.currentTrack.durationMs) * 360}deg)`
    : "";
  checkQualify();
}

function startAudio() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    stopAudio();
    oscillator = audioCtx.createOscillator();
    gainNode = audioCtx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 220 + (state.historyIndex * 30);
    gainNode.gain.value = 0.04;
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.start();
  } catch { /* audio unavailable */ }
}

function stopAudio() {
  try {
    oscillator?.stop();
    oscillator?.disconnect();
  } catch { /* ignore */ }
  oscillator = null;
}

function startTick() {
  stopTick();
  tickInterval = setInterval(() => {
    if (!state.isPlaying || !state.currentTrack) return;
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

function goHistory(delta) {
  const newIndex = state.historyIndex + delta;
  if (newIndex < 0 || newIndex >= state.history.length) return;
  state.historyIndex = newIndex;
  const item = state.history[newIndex];
  playTrack(item.track);
}

// ─── Swap in a fresh blank record with a slide animation ──
function swapToBlankRecord(direction) {
  const disc = els.vinylDisc;
  const incoming = els.vinylDiscIncoming;
  if (!disc || !incoming || disc.classList.contains("swapping")) return;

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

    state.currentTrack = null;
    state.sessionId = null;
    state.positionMs = 0;
    state.accumulatedMs = 0;
    state.qualified = false;
    state.isScrubbing = false;
    updateUI();

    requestAnimationFrame(() => {
      disc.style.transition = "";
    });
  };
  disc.addEventListener("animationend", cleanup, { once: true });
}

// ─── Vinyl gestures: rotate = seek, swipe = swap record ──
function setupVinylGestures() {
  let startX = 0;
  let startY = 0;
  let startAngle = 0;
  let startPositionMs = 0;
  let gestureMode = null; // 'rotate' | 'swipe'
  let active = false;

  const center = () => {
    const r = els.vinylStage.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  const angleAt = (x, y) => {
    const c = center();
    return (Math.atan2(y - c.y, x - c.x) * 180) / Math.PI;
  };

  const normalizeAngle = (a) => {
    let v = a % 360;
    if (v > 180) v -= 360;
    if (v < -180) v += 360;
    return v;
  };

  const onStart = (x, y) => {
    if (!state.currentTrack) return;
    active = true;
    gestureMode = null;
    startX = x;
    startY = y;
    startAngle = angleAt(x, y);
    startPositionMs = state.positionMs;
    state.isScrubbing = false;
  };

  const onMove = (x, y) => {
    if (!active || !state.currentTrack) return;
    const dx = x - startX;
    const dy = y - startY;
    const dist = Math.hypot(dx, dy);

    if (!gestureMode && dist > 8) {
      // 横向位移明显大于纵向 => 切歌；否则按转盘处理（拨动=定位）
      gestureMode = Math.abs(dx) > Math.abs(dy) * 1.4 ? "swipe" : "rotate";
    }

    if (gestureMode === "rotate") {
      state.isScrubbing = true;
      els.vinylStage.classList.add("scrubbing");
      els.vinylDisc.classList.add("manual-rotate");
      if (state.isPlaying) {
        pausePlayback();
      }

      const currentAngle = angleAt(x, y);
      const deltaAngle = normalizeAngle(currentAngle - startAngle);
      const deltaMs = (deltaAngle / 360) * state.currentTrack.durationMs;
      const newPos = Math.max(
        0,
        Math.min(startPositionMs + deltaMs, state.currentTrack.durationMs),
      );
      state.positionMs = newPos;
      state.manualRotationDeg = (newPos / state.currentTrack.durationMs) * 360;
      els.vinylDisc.style.transform = `rotate(${state.manualRotationDeg}deg)`;
    }
  };

  const onEnd = (x) => {
    if (!active) return;
    const mode = gestureMode;
    active = false;

    if (mode === "swipe") {
      const diff = x - startX;
      if (diff < -80) swapToBlankRecord(-1);
      else if (diff > 80) swapToBlankRecord(1);
    } else if (mode === "rotate") {
      els.vinylStage.classList.remove("scrubbing");
      els.vinylDisc.classList.remove("manual-rotate");
      state.isScrubbing = false;
      updateVinylRotation();
    } else if (state.currentTrack) {
      if (state.isPlaying) pausePlayback();
      else startPlayback();
    }

    gestureMode = null;
  };

  els.vinylStage.addEventListener("mousedown", (e) => {
    e.preventDefault();
    onStart(e.clientX, e.clientY);
  });
  window.addEventListener("mousemove", (e) => {
    if (active) onMove(e.clientX, e.clientY);
  });
  window.addEventListener("mouseup", (e) => onEnd(e.clientX));

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
  updateVinylRotation();
  updatePlayCount();
  updateWeekDots();
}

function updatePlayCount() {
  const today = new Date().toDateString();
  const todayPlays = state.validPlays.filter(
    (p) => new Date(p.listenedAt).toDateString() === today,
  );
  els.playCount.textContent = todayPlays.length
    ? `今日有效播放 ${todayPlays.length} 次`
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
        <p>${item.count} 次</p>
      </div>`;
    })
    .join("");

  if (!top5.length) {
    els.reportVinyls.innerHTML = '<p style="text-align:center;color:#9a948c;width:100%;padding-top:40px">还没有播放记录，先去听几首歌吧</p>';
  }

  const moodText = state.mood
    ? MOODS.find((m) => m.label === state.mood.label)?.text || ""
    : "未记录";
  const uniqueDays = new Set(
    state.validPlays.map((p) => new Date(p.listenedAt).toDateString()),
  ).size;

  els.moodStats.innerHTML = `
    <div class="stat-pill">总播放 ${state.validPlays.length} 次</div>
    <div class="stat-pill">听音 ${uniqueDays} 天</div>
    <div class="stat-pill">心情 ${moodText}</div>
    <div class="stat-pill">歌曲 ${new Set(state.validPlays.map((p) => p.trackId)).size} 首</div>
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
        <span class="top5-count">${item.count} 次</span>
      </div>`,
        )
        .join("")
    : '<p style="color:#9a948c;font-size:14px">暂无数据</p>';
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
  ctx.fillText("音乐日记", 540, 100);
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
    ctx.fillText(`${top5[0].track.artist} · ${top5[0].count} 次`, 540, 340);
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
    ctx.fillText(`${item.count} 次`, 1000, y);
    ctx.textAlign = "left";
  });

  ctx.fillStyle = "#9a948c";
  ctx.font = "22px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`总播放 ${state.validPlays.length} 次 · music-diary demo`, 540, 1280);

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
  els.searchInput.addEventListener("input", (e) => handleSearch(e.target.value));
  els.searchInput.addEventListener("focus", (e) => handleSearch(e.target.value));
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

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-wrap")) {
      els.searchResults.classList.add("hidden");
    }
  });

  els.btnNextSong.addEventListener("click", () => goHistory(1));

  els.btnFinish.addEventListener("click", () => {
    const today = new Date().toDateString();
    const count = state.validPlays.filter(
      (p) => new Date(p.listenedAt).toDateString() === today,
    ).length;
    if (count === 0) {
      alert("先完整听一会儿音乐，再记录今天的心情吧。");
      return;
    }
    pausePlayback();
    els.modalText.textContent = `今天你听了 ${count} 次音乐，准备记录此刻的心情吗？`;
    els.modal.classList.remove("hidden");
  });

  els.btnMoodJump.addEventListener("click", () => {
    renderMoodPicker();
    showScreen("mood");
  });

  els.modalCancel.addEventListener("click", () => els.modal.classList.add("hidden"));
  els.modalConfirm.addEventListener("click", () => {
    els.modal.classList.add("hidden");
    showScreen("mood");
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
