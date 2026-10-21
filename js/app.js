'use strict';

/* v03 app.js is glue only: the chrome's first paint, and the one load path
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
      showToast('Server radar tidak bisa dihubungi. Memakai data tersimpan.', false);
    } else {
      showError(err.message || 'Terjadi kesalahan saat mengambil data. Coba lagi.');
    }
  }
}

function initChrome() {
  dismissBootLoader();
  switchView(currentView);       // marks the current page on both nav bars before the first interaction
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
