'use strict';

/* Data layer: fetch the four endpoints, validate them, cache the last good payload, and own every state the
   screen can be in (loading / ready / stale / error) plus the honest "ditarik" fetch time.
   It renders no cards and no chart — only counts, so the payload's arrival is visible. */

let lastFetchedAt = 0;
let dataStatus = 'loading';      // 'loading' | 'ready' | 'stale' | 'error'
let dataErrorMessage = '';
let _isRefreshingTopics = false;

/* ================= FETCH & VALIDATE ================= */
async function fetchEndpoint(name) {
  let res;
  const opts = { headers: { 'ngrok-skip-browser-warning': 'true', 'Accept': 'application/json' } };
  /* a silent hang gets a deadline, otherwise the cached-payload fallback never gets a chance to fire */
  if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) opts.signal = AbortSignal.timeout(API_TIMEOUT_MS);
  try {
    res = await fetch(API_BASE + name, opts);
  } catch (e) {
    console.error('Katchup: /' + name + ' nggak kejangkau', e);
    throw new Error('Server data tidak bisa dihubungi. Cek koneksi internet, lalu coba lagi.');
  }
  if (!res.ok) {
    console.error('Katchup: /' + name + ' balas status ' + res.status);
    throw new Error(res.status === 503 && !navigator.onLine
      ? 'Kamu sedang offline. Cek koneksi internet, lalu coba lagi.'
      : 'Server data sedang bermasalah. Coba lagi sebentar.');
  }
  /* an OK status is not enough: a captive portal or an error page answers 200 with HTML */
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    console.error('Katchup: /' + name + ' nggak balas JSON (content-type: ' + (contentType || 'kosong') + ')');
    throw new Error('Data yang diterima tidak bisa dibaca. Coba lagi sebentar.');
  }
  return res.json();
}

function applyApiData(payload) {
  /* a payload swap owns the sound list from here on: stop the old preview before the new rows render, or a
     cached track keeps playing under a list that no longer shows it (js/music.js owns the player) */
  stopMusicPlayback();
  API_DATA = {
    music: Array.isArray(payload.music) ? payload.music : [],
    topic: Array.isArray(payload.topic) ? payload.topic : [],
    idea: Array.isArray(payload.idea) ? payload.idea : [],
    type: Array.isArray(payload.type) ? payload.type : []
  };
  /* the payload names its own categories through idea[].contentType; an empty list keeps the config fallback */
  const live = Array.from(new Set(API_DATA.idea.map(function (c) { return c.contentType; }).filter(Boolean)));
  if (live.length) CATEGORY_LIST = live;
}

/* ================= CACHE (last good payload) ================= */
function saveDataCache() {
  lastFetchedAt = Date.now();
  writeJson(CACHE_KEY, { v: 1, fetchedAt: lastFetchedAt, data: API_DATA });
}
/* hydrate from the last good payload; false => treat as "no cache" (unknown shape, or past the 7-day TTL) */
function loadCachedData() {
  const cached = readJson(CACHE_KEY, null);
  if (!cached || cached.v !== 1 || !cached.fetchedAt || !cached.data) return false;
  if (Date.now() - cached.fetchedAt > CACHE_TTL) return false;
  applyApiData(cached.data);
  lastFetchedAt = cached.fetchedAt;
  return true;
}

async function loadApiData() {
  const [music, topic, idea, type] = await Promise.all(API_ENDPOINTS.map(fetchEndpoint));
  applyApiData({ music: music, topic: topic, idea: idea, type: type });
  saveDataCache();
}

/* ================= STATES ================= */
let _staleTimer = null;
function stopStaleClock() { if (_staleTimer) { clearInterval(_staleTimer); _staleTimer = null; } }

function showLoading() {
  stopStaleClock();
  dataStatus = 'loading';
  setA11yStatus('Sedang memuat data tren.');
  updateLinkStatus('loading');
  paintDataState();
}
function showApp() {
  dataStatus = 'ready';
  stopStaleClock();
  /* the refresh path raises a toast of its own; two announcements of one event read as chatter */
  if (!_isRefreshingTopics) setA11yStatus('Data tren sudah siap.');
  updateLinkStatus('ready');
  paintDataState();
  /* the numbers are painted once the payload is on screen; a refresh re-runs this with the new rows.
     renderHome() also re-renders the ideas list + chips, so it is the one call the topics view needs too. */
  renderAnalytics();
  renderHome();
}
/* same as showApp(), except the payload came from the local cache and the fetch genuinely failed */
function showStale() {
  dataStatus = 'stale';
  /* keeps "12 menit lalu" honest while the banner is up; paintFreshness() is cheap and idempotent */
  if (!_staleTimer) _staleTimer = setInterval(paintFreshness, 60000);
  updateLinkStatus('stale');
  paintDataState();
  renderAnalytics();
  renderHome();
}
function showError(message) {
  stopStaleClock();
  dataStatus = 'error';
  dataErrorMessage = message || 'Gagal terhubung ke server data. Cek koneksi, lalu coba lagi.';
  setA11yStatus('Gagal memuat data tren.');
  updateLinkStatus('error');
  paintDataState();
}

function updateLinkStatus(status) {
  const dot = document.getElementById('telemetryLedDot');
  const label = document.getElementById('telemetryStatusLabel');
  if (status === 'ready') { dot.className = 'w-3 h-3 shrink-0 inline-block bg-pop-mint jewel-led'; label.innerText = 'RADAR: TERHUBUNG'; }
  else if (status === 'loading') { dot.className = 'w-3 h-3 shrink-0 inline-block bg-pop-yellow jewel-led'; label.innerText = 'RADAR: MEMUAT...'; }
  else if (status === 'stale') { dot.className = 'w-3 h-3 shrink-0 inline-block bg-pop-yellow jewel-led'; label.innerText = 'RADAR: DATA TERSIMPAN'; }
  else { dot.className = 'w-3 h-3 shrink-0 inline-block bg-pop-red jewel-led'; label.innerText = 'RADAR: TERPUTUS'; }
}

/* ================= PAINT: state surfaces ================= */
/* One paint for every surface that reports the data state: the loading/error panels, which view panel is
   visible, the fetch time, the stale banner and the per-view counts. Called on each state change and on every
   view switch — the hidden panels are display:none, so none of them repaints itself. */
function paintDataState() {
  /* the home and saved pages are local-first: saved ideas live in localStorage and home is orientational, so
     neither waits for the payload — loading/error only own the two pages built from API rows */
  const localView = currentView === 'home' || currentView === 'saved';
  const loading = dataStatus === 'loading' && !localView;
  const failed = dataStatus === 'error' && !localView;
  const showContent = localView || dataStatus === 'ready' || dataStatus === 'stale';
  const ls = document.getElementById('loadingState'), es = document.getElementById('errorState');
  ls.classList.toggle('hidden', !loading); ls.classList.toggle('flex', loading);
  es.classList.toggle('hidden', !failed); es.classList.toggle('flex', failed);
  if (failed) document.getElementById('errorMessage').innerText = dataErrorMessage;
  ['home', 'analytics', 'topics', 'saved'].forEach(function (v) {
    document.getElementById('view-' + v).classList.toggle('active', showContent && v === currentView);
  });
  paintFreshness();
  renderDataSummary();
}

/* One timestamp, three surfaces, all labelled "ditarik": the backend scrapes weekly, so this is when the app
   pulled the payload, never a claim about when Instagram changed. */
function paintFreshness() {
  const stale = dataStatus === 'stale';
  const clock = fmtClock(lastFetchedAt);
  const clockEl = document.getElementById('dataClock');
  if (clockEl) clockEl.innerText = '· ditarik ' + clock;
  /* the home status line reports the same fetch time as the header pill; "ditarik" is when the app pulled the
     payload, never a claim about when Instagram changed */
  const statusEl = document.getElementById('statusLine');
  if (statusEl) statusEl.innerText = (stale ? 'Status: memakai data tersimpan' : 'Status: data tren Instagram Indonesia sudah terhubung') + ' · ditarik ' + clock;
  const footEl = document.getElementById('pageFootDitarik');
  if (footEl) footEl.innerText = (stale ? 'Data tersimpan' : 'Data radar') + ' · ditarik ' + clock + ' · update tiap Senin';
  const topicsEl = document.getElementById('topicsUpdated');
  if (topicsEl) topicsEl.innerText = 'Ditarik ' + clock;
  const banner = document.getElementById('cacheBanner');
  if (banner) {
    const wasHidden = banner.classList.contains('hidden');
    banner.classList.toggle('hidden', !stale);
    banner.classList.toggle('flex', stale);
    /* the banner materialises out of a display:none flip, so it gets its one entrance each time it shows */
    if (stale && wasHidden && !prefersReducedMotion) {
      banner.classList.remove('drop-in');
      void banner.offsetWidth;
      banner.classList.add('drop-in');
    }
  }
  const bannerTime = document.getElementById('cacheBannerTime');
  if (bannerTime && stale) bannerTime.innerText = fmtAgo(lastFetchedAt, Date.now());
}

/* ================= PAINT: the quiet per-view summary ================= */
/* The honest answer to "did the payload actually arrive?": row counts, nothing more. No KPI, no bar, no chart —
   a number the reader can check against the API himself. */
function renderDataSummary() {
  let text;
  if (dataStatus === 'loading') text = 'Sedang mengambil data dari radar...';
  else if (dataStatus === 'error') text = 'Data tren belum bisa dimuat. Coba lagi.';
  else {
    const topicKeys = API_DATA.topic.length ? Object.keys(API_DATA.topic[0] || {}).length : 0;
    text = (dataStatus === 'stale' ? 'Data tersimpan — ' : '') + 'Data yang diterima: ' + fmt(API_DATA.music.length) + ' sound, ' + fmt(API_DATA.idea.length) + ' ide, '
      + fmt(API_DATA.type.length) + ' baris format, ' + fmt(topicKeys) + ' kolom topik.';
    if (CATEGORY_LIST.length) {
      text += ' Kategori: ' + CATEGORY_LIST.map(function (k) { return CATEGORY_LABELS[k] || k; }).join(', ') + '.';
    }
  }
  /* written with innerText, never innerHTML: an unknown category key from the API cannot inject markup */
  document.querySelectorAll('[data-summary]').forEach(function (el) { if (el.innerText !== text) el.innerText = text; });
}

/* ================= REFRESH ================= */
async function refreshLiveTopics() {
  if (_isRefreshingTopics || dataStatus === 'loading') return;   // the initial load is already on the wire
  _isRefreshingTopics = true;
  const icon = document.getElementById('syncIcon');
  if (icon) icon.classList.add('animate-spin');
  updateLinkStatus('loading');
  try {
    await loadApiData();
    showApp();
    showToast('Data radar berhasil dimuat ulang.');
  } catch (err) {
    console.error(err);
    const haveData = dataStatus === 'ready' || dataStatus === 'stale';
    /* whatever is on screen is never older than the cache, so a failed refresh only falls back to it
       when there is nothing to show at all */
    if (!haveData && loadCachedData()) showStale();
    else updateLinkStatus(haveData ? dataStatus : 'error');
    showToast(haveData ? 'Gagal memperbarui. Masih memakai data terakhir.' : 'Gagal memperbarui data radar.', false);
  } finally {
    if (icon) icon.classList.remove('animate-spin');
    _isRefreshingTopics = false;
  }
}

/* the tunnel coming back is exactly when the stale banner should clear itself */
window.addEventListener('online', function () { if (dataStatus === 'stale') refreshLiveTopics(); });
