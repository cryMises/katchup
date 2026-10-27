/* ================= SAVED IDEAS (localStorage; survives data refreshes) ================= */
const SAVED_STAMP = '<span class="rubber-stamp bg-pop-mint">DISIMPAN</span>';
/* legacy snapshots predate status; unknown values must fall back, never strand an idea outside every filter */
const SAVED_STATUS_LABELS = { belum: 'BELUM DIBUAT', dibuat: 'LAGI DIBUAT', tayang: 'SUDAH TAYANG' };
const SAVED_STATUS_ORDER = ['belum', 'dibuat', 'tayang'];
function savedStatus(snap) {
  const s = snap && snap.status;
  return typeof s === 'string' && Object.prototype.hasOwnProperty.call(SAVED_STATUS_LABELS, s) ? s : 'belum';
}

/* snapshot keeps the fields ideaTicket() renders; status is device-local, not part of the API shape */
function ideaSnapshot(item, catKey) {
  return {
    key: ideaKey(catKey, item.contentIdea),
    contentType: catKey,
    contentIdea: String(item.contentIdea || ''),
    estimatedLike: Number(item.estimatedLike) || 0,
    topics: String(item.topics || ''),
    status: 'belum',   // a fresh save is never already produced, whatever the API payload carries
    savedAt: Date.now()
  };
}

function updateSavedCounts() {
  const hasAny = savedIdeas.length > 0;
  const badge = document.getElementById('navSavedCount');
  if (badge) { badge.classList.toggle('hidden', !hasAny); badge.innerText = savedIdeas.length; }
  const pill = document.getElementById('savedCount');
  if (pill) pill.innerText = savedIdeas.length;
  const shareBtn = document.getElementById('exportSavedBtn');
  if (shareBtn) { shareBtn.classList.toggle('hidden', !hasAny); shareBtn.classList.toggle('flex', hasAny); }
}

function paintSaveButton(btn, saved) {
  if (!btn) return;
  btn.classList.toggle('bg-pop-yellow', !saved);
  btn.classList.toggle('bg-pop-mint', saved);
  btn.setAttribute('aria-pressed', String(saved));
  btn.title = saved ? 'Hapus dari simpanan' : 'Simpan ide ini';
  btn.innerHTML = doodle('save', 'w-3.5 h-3.5') + (saved ? 'TERSIMPAN' : 'SIMPAN');
}

/* three-state production chip row; only the saved list passes this HTML into ideaTicket() */
function statusRowHtml(key, status) {
  return '<div class="flex flex-wrap items-center gap-1.5 mt-3" role="group" aria-label="Status produksi ide">' +
    '<span class="eyebrow mr-0.5">Status:</span>' +
    SAVED_STATUS_ORDER.map(function (s) {
      const on = s === status;
      return '<button class="chip-topic' + (on ? ' on' : '') + '" data-status-key="' + escapeHtml(key) + '" data-status="' + s + '" aria-pressed="' + on + '" onclick="setIdeaStatus(this)">' + SAVED_STATUS_LABELS[s] + '</button>';
    }).join('') +
    '</div>';
}

function setIdeaStatus(btn) {
  const key = btn && btn.getAttribute ? btn.getAttribute('data-status-key') : '';
  const next = btn && btn.getAttribute ? btn.getAttribute('data-status') : '';
  if (!Object.prototype.hasOwnProperty.call(SAVED_STATUS_LABELS, next)) return;
  const at = savedIdeas.findIndex(function (s) { return s.key === key; });
  if (at < 0 || savedStatus(savedIdeas[at]) === next) return;
  const updated = savedIdeas.slice();
  updated[at] = Object.assign({}, updated[at], { status: next });
  if (!writeJson(SAVED_KEY, updated)) { showToast('Gagal menyimpan status. Coba lagi ya.', false); return; }
  savedIdeas = updated;
  playMechanicalClick();
  renderSaved();
  focusStatusButton(key, next);   // the list re-render replaces the button, so put focus back on it
}

function focusStatusButton(key, status) {
  const buttons = document.querySelectorAll('[data-status-key][data-status]');
  for (let i = 0; i < buttons.length; i++) {
    if (buttons[i].getAttribute('data-status-key') === key && buttons[i].getAttribute('data-status') === status) { buttons[i].focus(); return; }
  }
  focusStatusFilter();   // item left the active filter; land on the filter row instead of dropping focus to body
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
  if (!writeJson(SAVED_KEY, next)) { showToast('Gagal menyimpan ide. Coba lagi ya.', false); return; }   // memory never diverges from storage
  savedIdeas = next;
  savedKeys = new Set(savedIdeas.map(function (s) { return s.key; }));
  updateSavedCounts();
  paintSaveButton(btn, !wasSaved);
  if (wasSaved) {
    playMechanicalClick();
    showToast('Ide dihapus dari simpanan.', true, { label: 'URUNGKAN', onClick: function () { restoreSaved(removed, removedAt); } });
  } else {
    activeStatusFilter = null;   // a new idea defaults to belum; don't let a stale filter hide it next visit
    if (btn) btn.classList.add('stamped');
    playStampThud();
    showToast(full ? 'Tersimpan. Simpanan penuh, ide terlama dilepas.' : 'Ide disimpan ke daftar kamu.');
  }
  if (currentView === 'saved') renderSaved();
}

/* the undo behind URUNGKAN: put the snapshot back where it was */
function restoreSaved(snapshot, index) {
  if (!snapshot || savedKeys.has(snapshot.key)) return;
  const back = savedIdeas.slice();
  back.splice(Math.max(0, index), 0, snapshot);
  if (back.length > SAVED_MAX) back.length = SAVED_MAX;   // undo must not push the list past the cap
  if (!writeJson(SAVED_KEY, back)) { showToast('Gagal mengembalikan ide. Coba lagi ya.', false); return; }
  savedIdeas = back;
  savedKeys = new Set(savedIdeas.map(function (s) { return s.key; }));
  updateSavedCounts();
  playStampThud();
  if (currentView === 'saved') renderSaved();
  else renderIdeas();
}

function renderSavedStatusFilters(topicVisible) {
  const el = document.getElementById('savedStatusFilters');
  if (!el) return;
  const hasAny = savedIdeas.length > 0;
  el.classList.toggle('hidden', !hasAny);
  if (!hasAny) { el.innerHTML = ''; return; }
  /* counts follow the topic scope, but never the status scope: the row must show its own other options */
  const scope = Array.isArray(topicVisible) ? topicVisible : savedIdeas;
  const counts = { belum: 0, dibuat: 0, tayang: 0 };
  scope.forEach(function (s) { counts[savedStatus(s)] += 1; });
  const rows = [['all', 'SEMUA', scope.length]].concat(SAVED_STATUS_ORDER.map(function (s) {
    return [s, SAVED_STATUS_LABELS[s], counts[s]];
  }));
  el.innerHTML = '<span class="eyebrow mr-1">Status:</span>' + rows.map(function (row) {
    const on = (activeStatusFilter || 'all') === row[0];
    return '<button class="chip-topic' + (on ? ' on' : '') + '" data-status-filter="' + row[0] + '" aria-pressed="' + on + '" onclick="setStatusFilter(\'' + row[0] + '\')">' + row[1] + ' · ' + row[2] + '</button>';
  }).join('');
}

function setStatusFilter(value) {
  const next = value === 'all' ? null : value;
  if (next && !Object.prototype.hasOwnProperty.call(SAVED_STATUS_LABELS, next)) return;
  activeStatusFilter = activeStatusFilter === next ? null : next;   // tapping the active chip clears it, like topic chips
  playPatchCordSnap();
  renderSaved();
  focusStatusFilter();
}

function focusStatusFilter() {
  const want = activeStatusFilter || 'all';
  const buttons = document.querySelectorAll('[data-status-filter]');
  for (let i = 0; i < buttons.length; i++) {
    if (buttons[i].getAttribute('data-status-filter') === want) { buttons[i].focus(); return; }
  }
}

function resetSavedFilters() {
  playPatchCordSnap();
  activeTopicFilter = null;
  activeStatusFilter = null;
  renderCategoryQuickTags();
  renderIdeas();
  renderSaved();
  focusStatusFilter();
  showToast('Filter dihapus.');
}

function renderSaved() {
  const container = document.getElementById('savedListContainer');
  const emptyEl = document.getElementById('savedEmpty');
  const hasAny = savedIdeas.length > 0;
  if (!hasAny) activeStatusFilter = null;   // an empty list has no status to filter; don't strand the next save
  const allTayang = hasAny && savedIdeas.every(function (snap) { return savedStatus(snap) === 'tayang'; });
  /* the topic chips on saved tickets install activeTopicFilter, so the saved list must honour it */
  const topicVisible = activeTopicFilter
    ? savedIdeas.filter(function (snap) {
        return String(snap.topics || '').split(',').map(function (t) { return t.trim().toLowerCase(); }).includes(activeTopicFilter);
      })
    : savedIdeas;
  let visible = topicVisible;
  if (activeStatusFilter) visible = visible.filter(function (snap) { return savedStatus(snap) === activeStatusFilter; });
  renderSavedStatusFilters(topicVisible);
  const wasEmptyHidden = emptyEl.classList.contains('hidden');
  emptyEl.classList.toggle('hidden', hasAny);
  emptyEl.classList.toggle('flex', !hasAny);
  /* the empty card re-materialises from display:none, so it takes its entrance each time it appears */
  if (wasEmptyHidden && !hasAny && !prefersReducedMotion) {
    emptyEl.classList.remove('drop-in');
    void emptyEl.offsetWidth;
    emptyEl.classList.add('drop-in');
  }
  const cards = visible.map(function (snap, idx) {
    return ideaTicket(snap, {
      index: idx, catKey: snap.contentType, stamp: SAVED_STAMP, bump: false,
      meta: 'Disimpan ' + fmtAgo(snap.savedAt, Date.now()),
      statusRow: statusRowHtml(snap.key, savedStatus(snap))
    });
  }).join('');
  if (hasAny && !visible.length) {
    /* filtered-empty is distinct from first-use empty, and names whichever filters are active */
    const statusLabel = activeStatusFilter ? SAVED_STATUS_LABELS[activeStatusFilter] : '';
    let title = 'Nggak ada simpanan dengan topik #' + escapeHtml((activeTopicFilter || '').toUpperCase());
    if (activeStatusFilter && activeTopicFilter) {
      title = 'Nggak ada ide berstatus ' + statusLabel + ' dengan topik #' + escapeHtml(activeTopicFilter.toUpperCase()) + '.';
    } else if (activeStatusFilter) {
      title = 'Nggak ada ide berstatus ' + statusLabel + '.';
    }
    container.innerHTML = '<div class="drop-in py-10 px-6 text-center bg-white border-2 border-dashed border-cocoa rounded-[18px] flex flex-col items-center" role="status">' +
      '<p class="font-headline font-extrabold uppercase">' + title + '</p>' +
      '<p class="note mt-1">Coba pilih filter lain, atau hapus filternya.</p>' +
      '<button onclick="resetSavedFilters(); playMechanicalClick();" class="mt-3 px-4 py-2 bg-pop-red text-cocoa btn-keycap font-headline text-xs font-extrabold uppercase">HAPUS FILTER</button>' +
      '</div>';
  } else if (allTayang && !activeStatusFilter && !activeTopicFilter) {
    /* success banner above the tickets, never instead of them: the user must still be able to correct a status */
    container.innerHTML = '<div class="drop-in py-8 px-6 mb-5 text-center bg-white border-2 border-dashed border-cocoa rounded-[18px] flex flex-col items-center" role="status">' +
      '<p class="font-headline font-extrabold uppercase">Semua ide sudah tayang</p>' +
      '<p class="note mt-1">Waktunya panen ide baru dari radar minggu ini.</p>' +
      '<button onclick="switchView(\'topics\'); playMechanicalClick();" class="mt-3 px-4 py-2 bg-pop-red text-cocoa btn-keycap font-headline text-xs font-extrabold uppercase">CARI IDE [3]</button>' +
      '</div>' + cards;
  } else {
    container.innerHTML = cards;
  }
  pruneTicketIndex();
  updateSavedCounts();
  triggerReveal();
}

/* the list is device-local by design, so give people a way to carry it elsewhere */
function exportSaved() {
  if (!savedIdeas.length) return;
  const text = 'Ide konten dari Katchup:\n\n' + savedIdeas.map(function (s, i) {
    return (i + 1) + '. "' + s.contentIdea + '" — ' + fmt(s.estimatedLike) + ' potensi likes (' + categoryInfo(s.contentType).name + ')';
  }).join('\n');
  /* a rejected share sheet (no targets, permission) used to vanish silently — fall back to the clipboard, but stay
     quiet when the user just closed the sheet themselves */
  if (navigator.share) {
    navigator.share({ title: 'Ide konten Katchup', text: text }).catch(function (err) {
      if (err && err.name === 'AbortError') return;
      if (legacyCopyToClipboard(text)) { playPatchCordSnap(); showToast('Semua ide tersalin ke clipboard.'); }
      else showToast('Gagal membagikan, coba lagi ya.', false);
    });
    return;
  }
  if (legacyCopyToClipboard(text)) { playPatchCordSnap(); showToast('Semua ide tersalin ke clipboard.'); }
  else showToast('Gagal menyalin, coba lagi ya.', false);
}

/* label -> category key, so an exported list can land on another device with its accents intact */
function catKeyFromLabel(label) {
  const want = String(label || '').trim().toLowerCase();
  if (!want) return '';
  const keys = Object.keys(CATEGORY_LOGOS);
  for (let i = 0; i < keys.length; i++) {
    const info = CATEGORY_LOGOS[keys[i]];
    if (info.name.toLowerCase() === want || info.badgeText.toLowerCase() === want) return keys[i];
  }
  return '';   // includes the generic "Kategori" label, which maps back to no category
}
/* one line of exported text -> { hook, cat, likes }; null for anything that isn't an idea line */
function parseImportLine(line) {
  let s = String(line || '').trim();
  if (!s || /^ide konten dari katchup\b/i.test(s)) return null;   // skip the header line BAGIKAN emits
  s = s.replace(/^\d+[.)]\s*/, '');
  const catMatch = s.match(/\(([^()]*)\)\s*$/);
  const cat = catMatch ? catKeyFromLabel(catMatch[1]) : '';
  if (catMatch) s = s.slice(0, catMatch.index).trim();
  const likeMatch = s.match(/[—–-]\s*([\d.,]+)\s*potensi likes\s*$/i);
  const likes = likeMatch ? Number(likeMatch[1].replace(/[.,]/g, '')) || 0 : 0;
  if (likeMatch) s = s.slice(0, likeMatch.index).trim();
  s = s.replace(/^["“']/, '').replace(/["”']$/, '').trim();
  return s ? { hook: s, cat: cat, likes: likes } : null;
}
/* the other half of BAGIKAN: read the clipboard back so a saved list survives a new phone */
async function importSaved() {
  if (!navigator.clipboard || !navigator.clipboard.readText) { showToast('Browser ini nggak bisa baca clipboard. Tempel manual ya.', false); return; }
  let text = '';
  try { text = await navigator.clipboard.readText(); }
  catch (e) { showToast('Izinkan akses clipboard dulu ya.', false); return; }
  const fresh = [];
  text.split(/\r?\n/).map(parseImportLine).filter(Boolean).forEach(function (p) {
    const key = ideaKey(p.cat, p.hook);
    if (savedKeys.has(key) || fresh.some(function (x) { return x.key === key; })) return;
    fresh.push({ key: key, contentType: p.cat, contentIdea: p.hook, estimatedLike: p.likes, topics: '', status: 'belum', savedAt: Date.now() });
  });
  if (!fresh.length) { showToast('Nggak ada ide baru di clipboard.'); return; }
  const merged = fresh.concat(savedIdeas);   // line 1 of the pasted text lands on top, matching the export numbering
  const next = merged.slice(0, SAVED_MAX);
  const dropped = merged.length - next.length;
  if (!writeJson(SAVED_KEY, next)) { showToast('Gagal menyimpan ide. Coba lagi ya.', false); return; }
  savedIdeas = next;
  savedKeys = new Set(savedIdeas.map(function (s) { return s.key; }));
  activeTopicFilter = null;    // imported ideas carry topics:'', so an active topic filter would hide every one
  activeStatusFilter = null;   // and they all land in belum; show the batch the user just pasted
  renderCategoryQuickTags();
  renderIdeas();
  playStampThud();
  updateSavedCounts();
  if (currentView === 'saved') renderSaved();
  /* the cap used to eat the oldest ideas in silence, unlike toggleSave()'s "Simpanan penuh" toast */
  showToast(dropped
    ? fresh.length + ' ide ditempel. Simpanan penuh, ' + dropped + ' ide terlama dilepas.'
    : fresh.length + ' ide ditempel dari clipboard.');
}

