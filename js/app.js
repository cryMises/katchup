'use strict';

/* ================= BOOT LOADER: K-A-T-C-H-U-P lalu splat ================= */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function dismissBootLoader() {
  const boot = document.getElementById('bootLoader');
  const delay = prefersReducedMotion ? 0 : 2100;   // matches .boot's bootOut delay (1.65s) + duration (.45s)
  setTimeout(function () {
    if (boot && boot.parentNode) boot.parentNode.removeChild(boot);
  }, delay);
}

window.addEventListener('DOMContentLoaded', dismissBootLoader);
