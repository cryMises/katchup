'use strict';

/* the whole deck reads one reduced-motion switch: boot loader, mascot flipbook and every stamp/entrance */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* write only real changes: a live region re-announces identical innerText, so a view switch to the same
   title (a re-render) must not speak twice */
function setText(id, text) {
  const el = document.getElementById(id);
  if (el && el.innerText !== text) el.innerText = text;
}

/* The visible panels appear/disappear without changing the view title, so loading/ready/error report here instead.
   Paths that already raise a toast (refresh, cached fallback) stay silent on purpose — two announcements of the
   same event read as chatter. */
function setA11yStatus(text) {
  const el = document.getElementById('a11yStatus');
  if (el) el.innerText = text;
}

/* ================= BOOT LOADER: K-A-T-C-H-U-P lalu splat ================= */
function dismissBootLoader() {
  const boot = document.getElementById('bootLoader');
  const cover = document.querySelector('#heroPeel .peel-cover');   // the hero cover lands with the same squash
  const delay = prefersReducedMotion ? 0 : 2100;   // matches .boot's bootOut delay (1.65s) + duration (.45s)
  setTimeout(function () {
    if (boot && boot.parentNode) boot.parentNode.removeChild(boot);
    if (cover && !prefersReducedMotion) cover.classList.add('splat-in');
  }, delay);
}

/* ================= TOAST ================= */
let toastTimeout;
/* `invisible` (not just opacity-0) is what keeps the hidden toast — and its undo button — out of the tab order */
function hideToast() {
  const toast = document.getElementById('toastNotification');
  if (!toast) return;
  toast.classList.remove('translate-y-0', 'opacity-100', 'stamped');
  toast.classList.add('-translate-y-24', 'opacity-0', 'invisible');
}
/* action: optional { label, onClick } rendered as a button in the toast (undo, retry, ...) — the toast then
   stays up longer, since 2.4s is not enough time to notice and reach for it. Failures get the same longer
   window: an error the user never saw is an error they can't act on. */
function showToast(message, isSuccess, action) {
  const ok = isSuccess !== false;
  const toast = document.getElementById('toastNotification');
  if (!toast) return;
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
  /* `stamped` replays the rubber-stamp entrance (css/motion.css stampIn); the animationend handler drops the
     class again so a later toast stamps fresh instead of sitting on a spent fill */
  toast.classList.add('translate-y-0', 'opacity-100', 'stamped');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(hideToast, (action || !ok) ? 6000 : 2400);
}

/* ================= MOTION PLUMBING ================= */
/* entrance fills are dropped once they have played, so :hover/:active transforms on the same element work again */
document.addEventListener('animationend', function (e) {
  if (e.animationName === 'popIn') e.target.classList.remove('pop-in');
  else if (e.animationName === 'stampIn') e.target.classList.remove('stamped');   // a later toast can stamp again
});

/* Sections and rendered lists wait at opacity 0 until they are actually on screen. Re-observed on every data
   render and view switch; already revealed sections are left alone. */
let _revealObserver = null;
function initScrollReveal() {
  if (_revealObserver) _revealObserver.disconnect();
  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
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
/* double rAF: the nodes have to be laid out (and the panel displayed) before the observer can see them */
function triggerReveal() {
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { initScrollReveal(); initScrollPranks(); });
  });
}

/* ================= INSTALL AFFORDANCE (PWA) ================= */
/* Chrome/Edge/Android fire beforeinstallprompt; iOS Safari never does, so it gets instructions instead.
   Rendered twice because the sidebar CTA hides behind a drawer on phones. */
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
