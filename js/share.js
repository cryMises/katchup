/* ================= COPY TO CLIPBOARD ================= */
function legacyCopyToClipboard(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (e) { return false; }
}
async function copySnippet(btn) {
  const text = btn.getAttribute('data-hook') || '';
  let succeeded = false;
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); succeeded = true; }
    else { succeeded = legacyCopyToClipboard(text); }
  } catch (e) { succeeded = legacyCopyToClipboard(text); }
  if (!succeeded) { showToast('Gagal menyalin, coba lagi ya.', false); return; }
  playPatchCordSnap();
  /* capture the idle label once: a double click used to snapshot the "TERSALIN" state and stick there */
  if (!btn.dataset.original) btn.dataset.original = btn.innerHTML;
  btn.classList.add('stamped');
  btn.innerHTML = '<span class="material-symbols-outlined text-[0.9375rem]">done_all</span>TERSALIN';
  btn.classList.add('bg-pop-mint');
  btn.classList.remove('bg-pop-yellow');
  showToast('Hook-nya udah nyangkut di clipboard.');
  clearTimeout(btn._copyTimer);
  btn._copyTimer = setTimeout(function () {
    btn.classList.remove('stamped');
    btn.innerHTML = btn.dataset.original;
    delete btn.dataset.original;
    btn.classList.remove('bg-pop-mint');
    btn.classList.add('bg-pop-yellow');
  }, 1600);
}

