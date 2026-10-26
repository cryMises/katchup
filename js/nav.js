/* ================= VIEW SWITCHING ================= */
/* Inactive view panels are display:none, so the browser forgets their scroll offset; remember it per view.
   Only a real view *change* saves and restores — a same-view call (refresh, showApp) must not yank the user
   back to a stale offset. */
const _viewScroll = {};
function saveViewScroll(view) {
  const panel = document.getElementById('view-' + view);
  if (panel && panel.classList.contains('active')) _viewScroll[view] = panel.scrollTop;
}
function restoreViewScroll(view) {
  const panel = document.getElementById('view-' + view);
  if (panel) panel.scrollTop = _viewScroll[view] || 0;
}

function switchView(view) {
  const viewChanged = view !== currentView;
  if (viewChanged) saveViewScroll(currentView);
  currentView = view;
  const needsData = (view === 'analytics' || view === 'topics');
  const showLoadingNow = needsData && dataStatus === 'loading';
  const showErrorNow = needsData && dataStatus === 'error';
  const hasData = dataStatus === 'ready' || dataStatus === 'stale';
  const showContentNow = view === 'home' || view === 'saved' || (needsData && hasData);

  const ls = document.getElementById('loadingState'), es = document.getElementById('errorState');
  ls.classList.toggle('hidden', !showLoadingNow); ls.classList.toggle('flex', showLoadingNow);
  es.classList.toggle('hidden', !showErrorNow); es.classList.toggle('flex', showErrorNow);
  if (showErrorNow) document.getElementById('errorMessage').innerText = dataErrorMessage || 'Gagal nyambung ke server data. Coba lagi ya.';

  ['home', 'analytics', 'topics', 'saved'].forEach(function (v) {
    document.getElementById('view-' + v).classList.toggle('active', showContentNow && view === v);
  });

  const navH = document.getElementById('navHome'), navA = document.getElementById('navAnalytics'), navT = document.getElementById('navTopics'), navS = document.getElementById('navSaved');
  const mNavH = document.getElementById('mobileNavHome'), mNavA = document.getElementById('mobileNavAnalytics'), mNavT = document.getElementById('mobileNavTopics'), mNavS = document.getElementById('mobileNavSaved');
  const base = 'sidebar-nav-item w-full flex items-center justify-between px-4 py-3 font-headline text-xs font-black tracking-wider uppercase text-left cursor-pointer btn-keycap bg-white text-cocoa';
  const mBase = 'flex-1 py-2 px-1 bg-cream text-cocoa font-black uppercase btn-keycap-sm flex flex-col items-center justify-center';
  /* one pass resets every nav item and marks the current page for screen readers */
  [['home', navH, mNavH], ['analytics', navA, mNavA], ['topics', navT, mNavT], ['saved', navS, mNavS]].forEach(function (r) {
    const on = r[0] === view;
    r[1].className = base;
    r[1].setAttribute('aria-current', on ? 'page' : 'false');
    if (r[2]) { r[2].className = mBase; r[2].setAttribute('aria-current', on ? 'page' : 'false'); }
  });

  const activeClass = base + ' bg-pop-yellow active-key';
  const mActiveClass = mBase + ' bg-pop-yellow translate-y-[2px]';

  if (view === 'home') {
    navH.className = activeClass; if (mNavH) mNavH.className = mActiveClass;
    setText('viewTitle', 'RINGKASAN TREN');
    setText('viewSubtitle', 'Yang rame minggu ini di Instagram Indonesia');
  } else if (view === 'analytics') {
    navA.className = activeClass; if (mNavA) mNavA.className = mActiveClass;
    setText('viewTitle', 'ANALISIS KONTEN');
    setText('viewSubtitle', 'Bandingin Reels vs foto, plus sound terpopuler');
  } else if (view === 'topics') {
    navT.className = activeClass; if (mNavT) mNavT.className = mActiveClass;
    setText('viewTitle', 'REKOMENDASI IDE KONTEN');
    setText('viewSubtitle', 'Ide siap pakai per kategori, urut dari potensi likes');
  } else {
    navS.className = activeClass; if (mNavS) mNavS.className = mActiveClass;
    setText('viewTitle', 'IDE TERSIMPAN');
    setText('viewSubtitle', 'Hook yang kamu tandai, siap dipakai kapan aja');
  }
  /* the header titles swap instantly, so a replayed stamp marks the view change without a second observer */
  if (!prefersReducedMotion) ['viewTitle', 'viewSubtitle'].forEach(function (id) {
    const el = document.getElementById(id);
    el.classList.remove('stamped');
    void el.offsetWidth;
    el.classList.add('stamped');
  });
  closeMobileSidebar();

  if (view === 'saved') renderSaved();
  paintFreshness();
  if (showContentNow) {
    const panel = document.getElementById('view-' + view);
    if (panel) {
      panel.querySelectorAll('[data-reveal].revealed').forEach(function (el) { el.classList.remove('revealed'); });
      if (viewChanged) restoreViewScroll(view);
    }
    triggerReveal();
  }
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
  playMechanicalClick();
  if (window.innerWidth < 1024) toggleMobileSidebar(!document.getElementById('mainSidebar').classList.contains('mobile-open'));
  else setSidebarCollapsed(!isSidebarCollapsed);
}

function updateLinkStatus(status) {
  const dot = document.getElementById('telemetryLedDot');
  const label = document.getElementById('telemetryStatusLabel');
  if (status === 'ready') { dot.className = 'w-3 h-3 shrink-0 inline-block bg-pop-mint jewel-led'; label.innerText = 'RADAR: TERHUBUNG'; }
  else if (status === 'loading') { dot.className = 'w-3 h-3 shrink-0 inline-block bg-pop-yellow jewel-led'; label.innerText = 'RADAR: MEMUAT...'; }
  else if (status === 'stale') { dot.className = 'w-3 h-3 shrink-0 inline-block bg-pop-yellow jewel-led'; label.innerText = 'RADAR: DATA TERSIMPAN'; }
  else { dot.className = 'w-3 h-3 shrink-0 inline-block bg-pop-red jewel-led'; label.innerText = 'RADAR: TERPUTUS'; }
}

/* The visible panels appear/disappear without changing the view title, so loading/ready/error report here instead.
   Paths that already raise a toast (refresh, cached fallback) stay silent on purpose — two announcements of the
   same event read as chatter. */
function setA11yStatus(text) {
  const el = document.getElementById('a11yStatus');
  if (el) el.innerText = text;
}
/* write only real changes: a live region re-announces identical innerText, so a view switch to the same
   title (the load's home screen, a re-render) must not speak twice */
function setText(id, text) {
  const el = document.getElementById(id);
  if (el && el.innerText !== text) el.innerText = text;
}

/* One timestamp, three surfaces (header pill / home status line / topics footer) plus the stale banner.
   Re-painted on every view switch, so the relative age stays honest without a timer of its own. */
function paintFreshness() {
  const stale = dataStatus === 'stale';
  const clock = fmtClock(lastFetchedAt);
  const clockEl = document.getElementById('dataClock');
  if (clockEl) clockEl.innerText = '· ditarik ' + clock;
  const statusEl = document.getElementById('statusLine');
  if (statusEl) statusEl.innerText = (stale ? 'Status: data tersimpan' : 'Status: data tren Instagram Indonesia terhubung') + ' · ditarik ' + clock;
  const updatedEl = document.getElementById('topicsUpdated');
  if (updatedEl) updatedEl.innerText = 'Ditarik ' + clock;
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

let toastTimeout;
/* `invisible` (not just opacity-0) is what keeps the hidden toast — and its undo button — out of the tab order */
function hideToast() {
  const toast = document.getElementById('toastNotification');
  toast.classList.remove('translate-y-0', 'opacity-100', 'stamped');
  toast.classList.add('-translate-y-24', 'opacity-0', 'invisible');
}
/* action: optional { label, onClick } rendered as a button in the toast (undo, retry, ...) — the toast then
   stays up longer, since 2.4s is not enough time to notice and reach for it. Failures get the same longer
   window: an error the user never saw is an error they can't act on. */
function showToast(message, isSuccess, action) {
  const ok = isSuccess !== false;
  const toast = document.getElementById('toastNotification');
  /* unhide before writing the text: a live region that is visibility:hidden when it changes announces nothing */
  toast.classList.remove('-translate-y-24', 'opacity-0', 'invisible');
  toast.setAttribute('aria-live', ok ? 'polite' : 'assertive');
  document.getElementById('toastMessage').innerText = message;
  document.getElementById('toastLed').className = ok
    ? 'w-3 h-3 bg-pop-mint shrink-0 jewel-led inline-block'
    : 'w-3 h-3 bg-pop-red shrink-0 jewel-led inline-block';
  const actionBtn = document.getElementById('toastActionBtn');
  if (actionBtn) {
    actionBtn.classList.toggle('hidden', !action);
    if (action) {
      actionBtn.innerText = action.label;
      actionBtn.onclick = function () { hideToast(); action.onClick(); };
      actionBtn.onfocus = function () { clearTimeout(toastTimeout); };              // don't yank undo away mid-interaction
      actionBtn.onblur = function () { toastTimeout = setTimeout(hideToast, 1200); };
    }
  }
  toast.classList.add('translate-y-0', 'opacity-100', 'stamped');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(hideToast, (action || !ok) ? 6000 : 2400);
}
