/* ================= REFRESH & CAROUSEL ================= */
let _isRefreshingTopics = false;
/* one rebuild path, shared by a fresh fetch and a cache fallback */
function renderAll(keepCategory) {
  stopMusicPlayback();   // a refetched top-5 must not keep an old track playing under the new list
  renderAnalytics();
  buildCategoryCards();
  if (keepCategory && currentCategory && CATEGORY_LIST.includes(currentCategory)) selectCategory(currentCategory);
  else if (CATEGORY_LIST.length) selectCategory(CATEGORY_LIST[0]);
}

async function refreshLiveTopics() {
  if (_isRefreshingTopics) return;
  _isRefreshingTopics = true;
  const icon = document.getElementById('syncIcon');
  icon.classList.add('animate-spin');
  updateLinkStatus('loading');
  try {
    await loadApiData();
    renderAll(true);
    showApp();
    showToast('Data radar sudah ditarik ulang.');
  } catch (err) {
    console.error(err);
    const haveData = dataStatus === 'ready' || dataStatus === 'stale';
    // whatever is on screen is never older than the cache, so a failed refresh only falls back to it
    // when there is nothing to show at all
    if (!haveData && loadCachedData()) { renderAll(false); showStale(); }
    else updateLinkStatus(haveData ? dataStatus : 'error');
    showToast(haveData ? 'Gagal memperbarui. Masih pakai data terakhir.' : 'Gagal memperbarui data radar.', false);
  } finally {
    icon.classList.remove('animate-spin');
    _isRefreshingTopics = false;
  }
}

function scrollCarousel(direction) {
  const container = document.getElementById('topicGridContainer');
  const step = container.offsetWidth * 0.75;
  container.scrollBy({ left: direction === 'left' ? -step : step, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
}
/* ================= APP STATES & SCROLL REVEAL ================= */
let _staleTimer = null;
function stopStaleClock() { if (_staleTimer) { clearInterval(_staleTimer); _staleTimer = null; } }
function showLoading() { stopStaleClock(); dataStatus = 'loading'; setA11yStatus('Lagi memuat data tren.'); updateLinkStatus('loading'); switchView(currentView); }
function showError(message) { stopStaleClock(); dataStatus = 'error'; dataErrorMessage = message || 'Gagal nyambung ke server data. Cek koneksi, terus coba lagi ya.'; setA11yStatus('Gagal memuat data tren.'); updateLinkStatus('error'); switchView(currentView); }
function showApp() { dataStatus = 'ready'; stopStaleClock(); if (!_isRefreshingTopics) setA11yStatus('Data tren siap dipakai.'); updateLinkStatus('ready'); switchView(currentView); }
/* same as showApp(), except the payload came from the local cache and the fetch genuinely failed */
function showStale() {
  dataStatus = 'stale';
  /* keeps "12 menit lalu" honest while the banner is up; paintFreshness() is cheap and idempotent */
  if (!_staleTimer) _staleTimer = setInterval(paintFreshness, 60000);
  updateLinkStatus('stale');
  switchView(currentView);
}

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let _revealObserver = null;
function initScrollReveal() {
  if (_revealObserver) _revealObserver.disconnect();
  if (prefersReducedMotion) {
    document.querySelectorAll('[data-reveal]').forEach(function (el) { el.classList.add('revealed'); });
    return;
  }
  _revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) { entry.target.classList.add('revealed'); _revealObserver.unobserve(entry.target); }
    });
  }, { threshold: 0.05 });
  document.querySelectorAll('[data-reveal]:not(.revealed)').forEach(function (el) { _revealObserver.observe(el); });
}
function triggerReveal() {
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { initScrollReveal(); initScrollPranks(); });
  });
}

