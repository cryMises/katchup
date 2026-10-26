/* ================= BOOT LOADER: K-A-T-C-H-U-P lalu splat ================= */
function dismissBootLoader() {
  const boot = document.getElementById('bootLoader');
  const cover = document.querySelector('#heroPeel .peel-cover');
  const delay = prefersReducedMotion ? 0 : 2100;   // matches .boot's bootOut delay (1.65s) + duration (.45s)
  setTimeout(function () {
    if (boot && boot.parentNode) boot.parentNode.removeChild(boot);
    if (cover && !prefersReducedMotion) cover.classList.add('splat-in');
  }, delay);
}

/* ================= INIT ================= */
async function initApp() {
  updateSavedCounts();
  showLoading();
  try {
    await loadApiData();
    renderAll(false);
    showApp();
    triggerReveal();
  } catch (err) {
    console.error(err);
    if (loadCachedData()) {                       // no fresh data -> last week's payload beats an error screen
      renderAll(false);
      showStale();
      showToast('Server radar nggak kejangkau. Pakai data tersimpan.', false);
      triggerReveal();
    } else {
      showError(err.message || 'Ada yang salah pas narik data. Coba lagi ya.');
    }
  }
}

/* hotkeys: 1 / 2 / 3 / 4 / R / M */
window.addEventListener('keydown', function (e) {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) || e.target.isContentEditable) return;
  if (e.key === '1') { switchView('home'); playMechanicalClick(); }
  else if (e.key === '2') { switchView('analytics'); playMechanicalClick(); }
  else if (e.key === '3') { switchView('topics'); playMechanicalClick(); }
  else if (e.key === '4') { switchView('saved'); playMechanicalClick(); }
  else if (e.key === 'r' || e.key === 'R') { refreshLiveTopics(); playMechanicalClick(); }
  else if (e.key === 'm' || e.key === 'M') { toggleAudioFx(); }
  else if (e.key === 'Escape' && isMobileSidebarOpen) {
    toggleMobileSidebar(false);
    const menuBtn = document.getElementById('mobileMenuBtn');
    if (menuBtn && window.innerWidth < 1024) menuBtn.focus();   // send focus back to the control that opened it
  }
});

/* the tunnel coming back is exactly when the stale banner should clear itself */
window.addEventListener('online', function () { if (dataStatus === 'stale') refreshLiveTopics(); });

/* Install affordance. Chrome/Edge/Android fire beforeinstallprompt; iOS Safari never does, so it gets
   instructions instead. Rendered twice because the sidebar CTA hides behind a drawer on phones. */
let _installEvent = null;
function isIos() { return /iPad|iPhone|iPod/.test(navigator.userAgent || ''); }
function isStandalone() {
  return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
}
function updateInstallCta() {
  const iosHint = !_installEvent && isIos();
  const show = !isStandalone() && (_installEvent || iosHint);
  ['installAppBtn', 'installAppBtnMobile'].forEach(function (id) {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.classList.toggle('hidden', !show);
    btn.classList.toggle('flex', show);
  });
  const sidebarBtn = document.getElementById('installAppBtn');
  if (sidebarBtn && show) sidebarBtn.innerText = iosHint ? 'CARA PASANG' : 'PASANG APLIKASI';
}
window.addEventListener('beforeinstallprompt', function (e) {
  e.preventDefault();
  _installEvent = e;
  updateInstallCta();
});
window.addEventListener('appinstalled', function () { _installEvent = null; updateInstallCta(); });
function installApp() {
  if (_installEvent) {
    _installEvent.prompt();
    _installEvent = null;
    updateInstallCta();
    return;
  }
  if (isIos()) showToast('Buka menu Bagikan, terus pilih "Tambah ke Layar Utama".');
}

window.addEventListener('DOMContentLoaded', function () {
  updateAudioFxButtonState();
  updateInstallCta();
  dismissBootLoader();
  initEdgeTomatoPeeker();
  document.getElementById('brandToggleContainer').addEventListener('click', function (e) { e.stopPropagation(); toggleSidebarState(); });
  document.getElementById('sidebarLogoBtn').addEventListener('click', function (e) { e.stopPropagation(); toggleSidebarState(); });
  window.addEventListener('resize', function () {
    // crossing into desktop hides the drawer; reset its state too or isMobileSidebarOpen/aria-expanded stay stranded
    if (window.innerWidth >= 1024 && isMobileSidebarOpen) toggleMobileSidebar(false);
    syncSidebarInert();
  });
  syncSidebarInert();
  initApp();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function (err) { console.warn('Service worker gagal didaftarkan:', err); });
  });
}