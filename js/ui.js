/* ================= MOTION HELPERS (entrance/state animation plumbing) ================= */
/* drop entrance fills once they have played, so :hover/:active transforms on the same element work again */
document.addEventListener('animationend', function (e) {
  if (e.animationName === 'popIn') e.target.classList.remove('pop-in');
  else if (e.animationName === 'stampIn') e.target.classList.remove('stamped');
});
/* bars/segments render at 0 width and grow into place (re-grows every time the metric switches) */
function growBars(root) {
  if (!root) return;
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      root.querySelectorAll('[data-w]').forEach(function (el) { el.style.width = el.getAttribute('data-w') + '%'; });
    });
  });
}
/* the ledger numbers tick up to their value instead of just appearing */
function countUpAll(root) {
  if (!root) return;
  root.querySelectorAll('[data-count]').forEach(function (el) {
    const to = Number(el.getAttribute('data-count')) || 0;
    if (prefersReducedMotion || !to) { el.innerText = fmt(to); return; }
    const dur = 700, t0 = performance.now();
    (function step(now) {
      const p = Math.min(1, (now - t0) / dur);
      el.innerText = fmt(to * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  });
}

