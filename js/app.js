'use strict';

/* v02 app.js is glue only: boot dismissal, the chrome's first paint, sidebar wiring.
   No fetch, no rendering — data arrives in a later slice. */
function initChrome() {
  dismissBootLoader();
  switchView(currentView);       // marks the current page on both nav bars before the first interaction
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
