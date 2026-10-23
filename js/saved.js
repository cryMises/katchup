'use strict';

/* ================= IDE TERSIMPAN (local storage) ================= */
/* The saved store and its star toggle. The store keeps full idea snapshots (the API shape), so a saved ticket
   renders unchanged after the payload is refreshed — a week later the hook and its likes still read. User data
   is never dropped in silence: unstarring stays undoable through the toast, and the 100-item cap announces what
   it let go. The saved list itself, BAGIKAN and TEMPEL arrive with their own slices. */

const SAVED_KEY = 'katchup_saved';
const SAVED_MAX = 100;   // oldest first out; the cap path says how many ideas it dropped

/* readJson tolerates corrupt JSON and a blocked store, so a bad payload reads as "nothing saved" instead of
   killing the page */
let savedIdeas = (function () {
  const raw = readJson(SAVED_KEY, []);
  return Array.isArray(raw) ? raw.filter(function (s) { return s && s.key; }) : [];
})();
let savedKeys = new Set(savedIdeas.map(function (s) { return s.key; }));

/* one key per idea: category + normalised hook. Rides the ticket's data-idea attribute into toggleSave(). */
function ideaKey(catKey, hook) {
  return String(catKey || '') + '|' + String(hook || '').trim().toLowerCase();
}
/* snapshot keeps the API idea shape, so ideaTicket() renders it unchanged */
function ideaSnapshot(item, catKey) {
  return {
    key: ideaKey(catKey, item.contentIdea),
    contentType: catKey,
    contentIdea: String(item.contentIdea || ''),
    estimatedLike: Number(item.estimatedLike) || 0,
    topics: String(item.topics || ''),
    savedAt: Date.now()
  };
}

/* the count lives in the sidebar badge. The saved-view pill (#savedCount) and the BAGIKAN button
   (#exportSavedBtn) arrive with the saved list and the share slice, so their lookups land with their markup —
   nothing here may point at an id the tree doesn't ship yet */
function updateSavedCounts() {
  const hasAny = savedIdeas.length > 0;
  const badge = document.getElementById('navSavedCount');
  if (badge) { badge.classList.toggle('hidden', !hasAny); badge.innerText = savedIdeas.length; }
}

function paintSaveButton(btn, saved) {
  if (!btn) return;
  btn.classList.toggle('bg-pop-yellow', !saved);
  btn.classList.toggle('bg-pop-mint', saved);
  btn.setAttribute('aria-pressed', String(saved));
  btn.setAttribute('aria-label', saved ? 'Hapus ide dari simpanan' : 'Simpan ide ini');
  btn.title = saved ? 'Hapus dari simpanan' : 'Simpan ide ini';
  btn.innerHTML = doodle('save', 'w-3.5 h-3.5') + (saved ? 'TERSIMPAN' : 'SIMPAN');
}

function toggleSave(btn) {
  const key = btn && btn.getAttribute ? btn.getAttribute('data-idea') : '';   // the key rides the DOM attribute, so hook text never becomes a JS literal
  const src = _ticketIndex[key];
  if (!src) return;
  const wasSaved = savedKeys.has(key);
  const removedAt = wasSaved ? savedIdeas.findIndex(function (s) { return s.key === key; }) : -1;
  const removed = removedAt >= 0 ? savedIdeas[removedAt] : null;
  const full = !wasSaved && savedIdeas.length >= SAVED_MAX;   // this save is about to push the oldest idea out
  const next = wasSaved
    ? savedIdeas.filter(function (s) { return s.key !== key; })
    : [ideaSnapshot(src.item, src.catKey)].concat(savedIdeas).slice(0, SAVED_MAX);
  /* storage first: if the write fails, the in-memory list must not diverge from what will survive a reload */
  if (!writeJson(SAVED_KEY, next)) { showToast('Gagal menyimpan ide. Coba lagi.', false); return; }
  savedIdeas = next;
  savedKeys = new Set(savedIdeas.map(function (s) { return s.key; }));
  updateSavedCounts();
  paintSaveButton(btn, !wasSaved);
  if (wasSaved) {
    playMechanicalClick();
    showToast('Ide dihapus dari simpanan.', true, { label: 'URUNGKAN', onClick: function () { restoreSaved(removed, removedAt); } });
  } else {
    if (btn) btn.classList.add('stamped');
    playStampThud();
    showToast(full ? 'Tersimpan. Simpanan penuh, ide terlama dilepas.' : 'Ide disimpan ke daftar kamu.');
  }
}

/* the undo behind URUNGKAN: put the snapshot back where it was */
function restoreSaved(snapshot, index) {
  if (!snapshot || savedKeys.has(snapshot.key)) return;
  const back = savedIdeas.slice();
  back.splice(Math.max(0, index), 0, snapshot);
  if (!writeJson(SAVED_KEY, back)) { showToast('Gagal mengembalikan ide. Coba lagi.', false); return; }
  savedIdeas = back;
  savedKeys = new Set(savedIdeas.map(function (s) { return s.key; }));
  updateSavedCounts();
  playStampThud();
  renderIdeas();
}
