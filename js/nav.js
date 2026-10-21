'use strict';

/* ================= VIEW SWITCHING ================= */
/* Inactive view panels are display:none, so the browser forgets their scroll offset; remember it per view.
   Only a real view *change* saves and restores — a same-view call must not yank the user back to a stale offset. */
const _viewScroll = {};
const VIEW_META = {
  home: { title: 'RINGKASAN TREN', subtitle: 'Yang ramai minggu ini di Instagram Indonesia' },
  analytics: { title: 'ANALISIS KONTEN', subtitle: 'Bandingkan Reels vs foto, plus sound terpopuler' },
  topics: { title: 'REKOMENDASI IDE KONTEN', subtitle: 'Ide siap pakai per kategori, diurutkan dari potensi likes' },
  saved: { title: 'IDE TERSIMPAN', subtitle: 'Hook yang kamu tandai, siap dipakai kapan saja' }
};
/* switchView re-styles the nav items through className, so these strings are the single source of both looks
   (rest and current page) and have to stay identical to the markup's classes in index.html */
const NAV_BASE = 'sidebar-nav-item w-full flex items-center justify-between px-4 py-3 font-headline text-xs font-black tracking-wider uppercase text-left cursor-pointer btn-keycap bg-white text-cocoa';
const NAV_ON = NAV_BASE + ' bg-pop-yellow active-key';
const MNAV_BASE = 'flex-1 py-2 px-1 bg-cream text-cocoa font-black uppercase btn-keycap-sm flex flex-col items-center justify-center';
const MNAV_ON = MNAV_BASE + ' bg-pop-yellow translate-y-[2px]';
const NAV_ITEMS = [['home', 'navHome', 'mobileNavHome'], ['analytics', 'navAnalytics', 'mobileNavAnalytics'], ['topics', 'navTopics', 'mobileNavTopics'], ['saved', 'navSaved', 'mobileNavSaved']];

let currentView = 'home';
let isMobileSidebarOpen = false;
let isSidebarCollapsed = false;

function saveViewScroll(view) {
  const panel = document.getElementById('view-' + view);
  if (panel && panel.classList.contains('active')) _viewScroll[view] = panel.scrollTop;
}
function restoreViewScroll(view) {
  const panel = document.getElementById('view-' + view);
  if (panel) panel.scrollTop = _viewScroll[view] || 0;
}

function switchView(view) {
  if (!VIEW_META[view]) return;
  const viewChanged = view !== currentView;
  if (viewChanged) saveViewScroll(currentView);
  currentView = view;

  /* which panel is allowed to show is the data layer's call: nothing here renders before a payload lands, so
     loading/error take the screen and paintDataState() re-marks the current view (it also repaints the clock) */
  paintDataState();
  /* one pass marks the current page on every nav item, sidebar rail and bottom bar alike */
  NAV_ITEMS.forEach(function (row) {
    const on = row[0] === view;
    const side = document.getElementById(row[1]), mob = document.getElementById(row[2]);
    side.className = on ? NAV_ON : NAV_BASE;
    side.setAttribute('aria-current', on ? 'page' : 'false');
    if (mob) { mob.className = on ? MNAV_ON : MNAV_BASE; mob.setAttribute('aria-current', on ? 'page' : 'false'); }
  });
  setText('viewTitle', VIEW_META[view].title);
  setText('viewSubtitle', VIEW_META[view].subtitle);
  closeMobileSidebar();
  /* a page that becomes visible replays its entrances; a same-view refresh leaves the reader's sections alone */
  if (viewChanged) {
    const panel = document.getElementById('view-' + view);
    if (panel) panel.querySelectorAll('[data-reveal].revealed').forEach(function (el) { el.classList.remove('revealed'); });
    restoreViewScroll(view);
  }
  if (dataStatus === 'ready' || dataStatus === 'stale') triggerReveal();
}

/* ================= SIDEBAR ================= */
function setSidebarCollapsed(collapsed) {
  isSidebarCollapsed = collapsed;
  if (window.innerWidth >= 1024) document.getElementById('mainSidebar').classList.toggle('sidebar-collapsed', collapsed);
}
function toggleMobileSidebar(open) {
  isMobileSidebarOpen = open;
  const sidebar = document.getElementById('mainSidebar');
  sidebar.classList.toggle('mobile-open', open);
  document.getElementById('sidebarBackdrop').classList.toggle('hidden', !open);
  const menuBtn = document.getElementById('mobileMenuBtn');
  if (menuBtn) menuBtn.setAttribute('aria-expanded', String(open));
  syncSidebarInert();
  /* the drawer sits BEFORE #contentArea in the DOM, so tabbing forward from the menu button would skip it */
  if (open && window.innerWidth < 1024) {
    const first = sidebar.querySelector('button');
    if (first) first.focus();
  }
}
/* off-canvas below 1024px: `inert` keeps the closed drawer's controls out of the tab order and the a11y tree */
function syncSidebarInert() {
  const sidebar = document.getElementById('mainSidebar');
  if (sidebar) sidebar.inert = window.innerWidth < 1024 && !sidebar.classList.contains('mobile-open');
}
function closeMobileSidebar() { if (window.innerWidth < 1024) toggleMobileSidebar(false); }
function toggleSidebarState() {
  if (window.innerWidth < 1024) toggleMobileSidebar(!document.getElementById('mainSidebar').classList.contains('mobile-open'));
  else setSidebarCollapsed(!isSidebarCollapsed);
}

/* ================= HOTKEYS ================= */
/* 1 / 2 / 3 / 4 switch pages, R pulls the payload again. M (efek suara) is deliberately absent — that slice
   has not shipped yet, so binding it now would call a function this level does not have. */
const HOTKEY_VIEWS = { '1': 'home', '2': 'analytics', '3': 'topics', '4': 'saved' };
window.addEventListener('keydown', function (e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable) return;
  if (HOTKEY_VIEWS[e.key]) { switchView(HOTKEY_VIEWS[e.key]); return; }
  if (e.key === 'r' || e.key === 'R') { refreshLiveTopics(); return; }
  if (e.key === 'Escape' && isMobileSidebarOpen) {
    toggleMobileSidebar(false);
    const menuBtn = document.getElementById('mobileMenuBtn');
    if (menuBtn && window.innerWidth < 1024) menuBtn.focus();   // send focus back to the control that opened it
  }
});
