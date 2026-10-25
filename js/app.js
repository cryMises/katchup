'use strict';

/* app.js is glue only: the chrome's first paint, and the one load path
   (loading -> fetch -> counts -> ready, or cache -> stale, or error). No features live here. */

async function initApp() {
  showLoading();
  try {
    await loadApiData();
    renderDataSummary();
    showApp();
  } catch (err) {
    console.error(err);
    if (loadCachedData()) {          // no fresh data -> last week's payload beats an error screen
      renderDataSummary();
      showStale();
      showToast('Server radar nggak kejangkau. Pakai data tersimpan.', false);
    } else {
      showError(err.message || 'Ada yang salah pas narik data. Coba lagi ya.');
    }
  }
}

function initChrome() {
  dismissBootLoader();
  updateAudioFxButtonState();     // the persisted mute choice has to show before the first click
  updateInstallCta();             // PWA: only shows when the browser offers an install (or on iOS, as instructions)
  updateSavedCounts();            // the persisted saved list has to show on both nav bars too
  switchView(currentView);       // marks the current page on both nav bars before the first interaction
  initEdgeTomatoPeeker();         // PRANK 1: the peeker schedules itself; deleting it needs this line gone too
  initApp();
  /* the sidebar masthead is the drawer's close affordance on phones and the rail's collapse toggle on desktop */
  document.getElementById('brandToggleContainer').addEventListener('click', function (e) { e.stopPropagation(); toggleSidebarState(); });
  document.getElementById('sidebarLogoBtn').addEventListener('click', function (e) { e.stopPropagation(); toggleSidebarState(); });
}
window.addEventListener('DOMContentLoaded', initChrome);

/* crossing 1024px flips the sidebar between rail and drawer: an open drawer must not survive the layout it
   belongs to, and the closed one has to go back to inert */
window.addEventListener('resize', function () {
  if (window.innerWidth >= 1024 && isMobileSidebarOpen) toggleMobileSidebar(false);
  syncSidebarInert();
});

/* PWA: sw.js precaches the shell (css/, js/, icons/, manifest) and keeps the API network-first, so a reload
   after the first visit comes off the cache while the trend data stays live. */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function (err) { console.warn('Service worker gagal didaftarkan:', err); });
  });
}
