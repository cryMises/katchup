/* ================= DATA INGESTION ================= */
async function fetchEndpoint(name) {
  let res;
  const opts = { headers: { 'ngrok-skip-browser-warning': 'true', 'Accept': 'application/json' } };
  // a silent hang gets a deadline, otherwise the cached-payload fallback never gets a chance to fire
  if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) opts.signal = AbortSignal.timeout(8000);
  try {
    res = await fetch(API_BASE + name, opts);
  } catch (e) {
    console.error('Katchup: /' + name + ' nggak kejangkau', e);
    throw new Error('Server datanya nggak kejangkau. Cek koneksi internet, terus coba lagi ya.');
  }
  if (!res.ok) {
    console.error('Katchup: /' + name + ' balas status ' + res.status);
    /* the service worker answers an API call it can't reach with a synthetic 503 while offline */
    throw new Error(res.status === 503 && !navigator.onLine
      ? 'Kamu lagi offline. Cek koneksi internet, terus coba lagi ya.'
      : 'Server datanya lagi bermasalah. Coba lagi sebentar ya.');
  }
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    console.error('Katchup: /' + name + ' nggak balas JSON (content-type: ' + (contentType || 'kosong') + ')');
    throw new Error('Data yang masuk nggak kebaca. Coba lagi sebentar ya.');
  }
  return res.json();
}
/* ================= LOCAL PERSISTENCE: saved ideas + the last good payload ================= */
const SAVED_KEY = 'katchup_saved';
const CACHE_KEY = 'katchup_data_cache';
const SAVED_MAX = 100;
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;   // a week-old trend list is not today's news
let lastFetchedAt = 0;

let savedIdeas = (function () {
  const raw = readJson(SAVED_KEY, []);
  return Array.isArray(raw) ? raw.filter(function (s) { return s && s.key; }) : [];
})();
let savedKeys = new Set(savedIdeas.map(function (s) { return s.key; }));
let _ticketIndex = {};   // key -> { item, catKey } as filled by ideaTicket(); toggleSave() reads it
/* drop entries whose ticket is no longer rendered, so the map can't grow for the life of the page */
function pruneTicketIndex() {
  const live = {};
  document.querySelectorAll('[data-idea]').forEach(function (el) {
    const k = el.getAttribute('data-idea');
    if (_ticketIndex[k]) live[k] = _ticketIndex[k];
  });
  _ticketIndex = live;
}

function ideaKey(catKey, hook) {
  return String(catKey || '') + '|' + String(hook || '').trim().toLowerCase();
}

function readJson(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }
  catch (e) { return fallback; }
}
function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (e) { console.error('Katchup: gagal nulis ' + key, e); return false; }
}
function fmtClock(ms) {
  if (!ms) return '--';
  try { return new Date(ms).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }); }
  catch (e) { return '--'; }
}
/* pure on purpose (now is an argument) so tests/check_katchup.js can execute it */
function fmtAgo(ts, now) {
  const t = now == null ? Date.now() : now;
  const s = Math.max(0, Math.round((t - ts) / 1000));
  if (s < 60) return 'baru aja';
  const m = Math.floor(s / 60);
  if (m < 60) return m + ' menit lalu';
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' jam lalu';
  const d = Math.floor(h / 24);
  if (d === 1) return 'kemarin ' + fmtClock(ts);
  return d + ' hari lalu';
}

function applyApiData(payload) {
  API_DATA = {
    music: Array.isArray(payload.music) ? payload.music : [],
    topic: Array.isArray(payload.topic) ? payload.topic : [],
    idea: Array.isArray(payload.idea) ? payload.idea : [],
    type: Array.isArray(payload.type) ? payload.type : []
  };
  CATEGORY_LIST = Array.from(new Set(API_DATA.idea.map(function (c) { return c.contentType; }).filter(Boolean)));
}
function saveCachedData() {
  lastFetchedAt = Date.now();
  writeJson(CACHE_KEY, { v: 1, fetchedAt: lastFetchedAt, data: API_DATA });
}
/* hydrate from the last good payload; false => treat as "no cache" (unknown shape or past TTL) */
function loadCachedData() {
  const cached = readJson(CACHE_KEY, null);
  if (!cached || cached.v !== 1 || !cached.fetchedAt || !cached.data) return false;
  if (Date.now() - cached.fetchedAt > CACHE_TTL) return false;
  /* the signed CDN links expire (~4 days) before the payload does (7 days), so a hydrated row would always
     play dead: drop musicUrl and let playableMusicUrl() fall back to the honest cue tone */
  applyApiData(Object.assign({}, cached.data, {
    music: (Array.isArray(cached.data.music) ? cached.data.music : []).map(function (m) {
      return Object.assign({}, m, { musicUrl: '' });
    })
  }));
  lastFetchedAt = cached.fetchedAt;
  return true;
}

async function loadApiData() {
  const [music, topic, idea, type] = await Promise.all([
    fetchEndpoint('music'), fetchEndpoint('topic'), fetchEndpoint('idea'), fetchEndpoint('type')
  ]);
  /* a 200 with nothing in it is not healthy data: throw into the cache/error path instead of showing
     "RADAR: TERHUBUNG" over empty views, and leave the last good payload in place */
  const hasIdeas = Array.isArray(idea) && idea.some(function (c) { return c && Array.isArray(c.posts) && c.posts.length > 0; });
  const hasTypes = Array.isArray(type) && type.length > 0;
  if (!hasIdeas && !hasTypes) throw new Error('Server datanya balas kosong. Coba lagi sebentar ya.');
  applyApiData({ music: music, topic: topic, idea: idea, type: type });
  saveCachedData();
}

let currentView = 'home';
let dataStatus = 'loading';
let dataErrorMessage = '';
let currentCategory = 'education';
let activeTopicFilter = null;
let activeStatusFilter = null;   // saved-view production status: belum | dibuat | tayang
let isSidebarCollapsed = false;
let isMobileSidebarOpen = false;
let currentlyPlayingTrackIndex = null;

function fmt(n) { return Math.round(n || 0).toLocaleString('id-ID'); }
function fmt1(n) { return (Number(n) || 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
function signed(n) { return (n >= 0 ? '+' : '') + fmt1(n); }

