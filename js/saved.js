/* ================= SAVED IDEAS (localStorage; survives data refreshes) ================= */
const SAVED_STAMP = '<span class="rubber-stamp bg-pop-mint">DISIMPAN</span>';

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
  if (!writeJson(SAVED_KEY, back)) { showToast('Gagal mengembalikan ide. Coba lagi ya.', false); return; }
  savedIdeas = back;
  savedKeys = new Set(savedIdeas.map(function (s) { return s.key; }));
  updateSavedCounts();
  playStampThud();
  if (currentView === 'saved') renderSaved();
  else renderIdeas();
}

function renderSaved() {
  const container = document.getElementById('savedListContainer');
  const emptyEl = document.getElementById('savedEmpty');
  const hasAny = savedIdeas.length > 0;
  /* the topic chips on saved tickets install activeTopicFilter, so the saved list must honour it */
  const visible = activeTopicFilter
    ? savedIdeas.filter(function (snap) {
        return String(snap.topics || '').split(',').map(function (t) { return t.trim().toLowerCase(); }).includes(activeTopicFilter);
      })
    : savedIdeas;
  const wasEmptyHidden = emptyEl.classList.contains('hidden');
  emptyEl.classList.toggle('hidden', hasAny);
  emptyEl.classList.toggle('flex', !hasAny);
  /* the empty card re-materialises from display:none, so it takes its entrance each time it appears */
  if (wasEmptyHidden && !hasAny && !prefersReducedMotion) {
    emptyEl.classList.remove('drop-in');
    void emptyEl.offsetWidth;
    emptyEl.classList.add('drop-in');
  }
  if (hasAny && !visible.length) {
    container.innerHTML = '<div class="drop-in py-10 px-6 text-center bg-white border-2 border-dashed border-cocoa rounded-[18px] flex flex-col items-center">' +
      '<p class="font-headline font-extrabold uppercase">Nggak ada simpanan dengan topik #' + escapeHtml(activeTopicFilter.toUpperCase()) + '</p>' +
      '<button onclick="resetTopicFilter(); playMechanicalClick();" class="mt-3 px-4 py-2 bg-pop-red text-cocoa btn-keycap font-headline text-xs font-extrabold uppercase">HAPUS FILTER</button>' +
      '</div>';
  } else {
    container.innerHTML = visible.map(function (snap, idx) {
      return ideaTicket(snap, {
        index: idx, catKey: snap.contentType, stamp: SAVED_STAMP, bump: false,
        meta: 'Disimpan ' + fmtAgo(snap.savedAt, Date.now())
      });
    }).join('');
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
    fresh.push({ key: key, contentType: p.cat, contentIdea: p.hook, estimatedLike: p.likes, topics: '', savedAt: Date.now() });
  });
  if (!fresh.length) { showToast('Nggak ada ide baru di clipboard.'); return; }
  const merged = fresh.concat(savedIdeas);   // line 1 of the pasted text lands on top, matching the export numbering
  const next = merged.slice(0, SAVED_MAX);
  const dropped = merged.length - next.length;
  if (!writeJson(SAVED_KEY, next)) { showToast('Gagal menyimpan ide. Coba lagi ya.', false); return; }
  savedIdeas = next;
  savedKeys = new Set(savedIdeas.map(function (s) { return s.key; }));
  playStampThud();
  updateSavedCounts();
  if (currentView === 'saved') renderSaved();
  /* the cap used to eat the oldest ideas in silence, unlike toggleSave()'s "Simpanan penuh" toast */
  showToast(dropped
    ? fresh.length + ' ide ditempel. Simpanan penuh, ' + dropped + ' ide terlama dilepas.'
    : fresh.length + ' ide ditempel dari clipboard.');
}

