'use strict';

/* ================= IDE KONTEN ================= */
/* The ranked idea tickets, the topic chips and the one filter they share. The category itself is picked on the
   home page (js/home.js owns currentCategory + selectCategory()); this file renders whatever that state says.
   Every ticket also carries the SIMPAN toggle and registers itself in _ticketIndex — js/saved.js snapshots the
   item from there and never rebuilds it. */

let activeTopicFilter = null;

/* key -> { item, catKey } as filled by ideaTicket(); toggleSave() (js/saved.js) reads the key off data-idea.
   A cache, not a log: pruneTicketIndex() drops entries whose ticket is no longer rendered after every list
   render, and it is never cleared wholesale — the hidden view's still-rendered buttons resolve through it. */
let _ticketIndex = {};
function pruneTicketIndex() {
  const live = {};
  document.querySelectorAll('[data-idea]').forEach(function (el) {
    const k = el.getAttribute('data-idea');
    if (_ticketIndex[k]) live[k] = _ticketIndex[k];
  });
  _ticketIndex = live;
}

/* the payload names its own categories; fall back to the first live one when the current key is gone */
function activeIdeaCategory() {
  if (!CATEGORY_LIST.includes(currentCategory)) currentCategory = CATEGORY_LIST[0] || '';
  return currentCategory;
}
/* unknown keys come straight from the API, so the label is read from the table and marked up only after escaping */
function ideaCategoryLabel(key) {
  return CATEGORY_LABELS[key] || String(key || '');
}
function ideasForCategory(key) {
  const cat = API_DATA.idea.find(function (c) { return c.contentType === key; });
  return cat && Array.isArray(cat.posts) ? cat.posts : [];
}

/* ================= TOPIC CHIPS (shared activeTopicFilter) ================= */
function renderCategoryQuickTags() {
  const container = document.getElementById('quickFilterChips');
  const resetBtn = document.getElementById('resetTagBtn');
  if (!container) return;
  const count = {};
  ideasForCategory(activeIdeaCategory()).forEach(function (item) {
    String(item.topics || '').split(',').map(function (t) { return t.trim().toLowerCase(); }).filter(Boolean).forEach(function (t) { count[t] = (count[t] || 0) + 1; });
  });
  const topTopics = Object.keys(count).sort(function (a, b) { return count[b] - count[a]; }).slice(0, 6);
  if (resetBtn) {
    resetBtn.classList.toggle('hidden', !activeTopicFilter);
    resetBtn.classList.toggle('flex', !!activeTopicFilter);
  }
  container.innerHTML = '<span class="eyebrow mr-1">Topik:</span>' +
    topTopics.map(function (topic) {
      const on = activeTopicFilter === topic;
      return '<button type="button" class="chip-topic' + (on ? ' on' : '') + '" aria-pressed="' + (on ? 'true' : 'false') + '" onclick="filterByTopic(\'' + escapeJsArg(topic) + '\')">#' + escapeHtml(topic) + '</button>';
    }).join('');
}

function filterByTopic(topic) {
  playPatchCordSnap();
  if (activeTopicFilter === topic) { activeTopicFilter = null; }
  else { activeTopicFilter = topic; showToast('Filter topik #' + topic.toUpperCase() + ' aktif.'); }
  renderIdeas();
  /* the same chips sit on saved tickets, and the saved list shares this one filter */
  if (currentView === 'saved') renderSaved();
}
function resetTopicFilter() {
  playPatchCordSnap();
  activeTopicFilter = null;
  renderIdeas();
  if (currentView === 'saved') renderSaved();
  showToast('Filter topik dihapus.');
}

/* ================= IDEA TICKETS (one column) ================= */
/* One verdict per ticket. The top-ranked idea (the list is sorted by estimatedLike, so idx 0) wears the
   holo seal; every other ticket draws from a shuffled deck, so no two tickets in view repeat a stamp.
   ponytail: 14 verdicts — a category shipping more than 14 ideas recycles the deck; extend the list then. */
const BEST_STAMP = '<span class="rubber-stamp sticker-holo">PALING VIRAL</span>';
const IDEA_STAMPS = [
  ['SIAP CONTEK', 'bg-pop-mint'],
  ['COCOK BUAT FYP', 'bg-pop-yellow'],
  ['POTENSI RAMAI', 'bg-pop-pink'],
  ['BANYAK DICARI', 'bg-pop-blue'],
  ['JUDUL JITU', 'bg-pop-orange'],
  ['GAMPANG DIBUAT', 'bg-pop-mint'],
  ['IDE SEGAR', 'bg-pop-yellow'],
  ['AUDIENS BETAH', 'bg-pop-pink'],
  ['MOMEN PAS', 'bg-pop-blue'],
  ['LAYAK DICOBA', 'bg-pop-orange'],
  ['PAS BUAT PEMULA', 'bg-pop-mint'],
  ['BISA MELEDAK', 'bg-pop-yellow'],
  ['COCOK BUAT BRAND', 'bg-pop-pink'],
  ['BETAH DITONTON', 'bg-pop-blue']
];
function shuffleStamps() {
  const deck = IDEA_STAMPS.slice();
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = deck[i]; deck[i] = deck[j]; deck[j] = tmp;
  }
  return deck;
}
/* the deck is re-rolled only when the visible set changes, so stamps hold still while you filter */
let _stampDeck = null, _stampDeckKey = '';
function stampDeckFor(key) {
  if (key !== _stampDeckKey) { _stampDeckKey = key; _stampDeck = shuffleStamps(); }
  return _stampDeck;
}

function renderIdeas() {
  const container = document.getElementById('ideasListContainer');
  if (!container) return;
  const catKey = activeIdeaCategory();
  const label = ideaCategoryLabel(catKey);
  let filtered = [].concat(ideasForCategory(catKey)).sort(function (a, b) { return b.estimatedLike - a.estimatedLike; });
  if (activeTopicFilter) {
    filtered = filtered.filter(function (item) {
      return String(item.topics || '').split(',').map(function (t) { return t.trim().toLowerCase(); }).includes(activeTopicFilter);
    });
  }

  setText('activeCategoryTitle', (label || 'KATEGORI').toUpperCase() + ' · DAFTAR IDE');
  setText('activeCategoryBadge', (label || 'KATEGORI').toUpperCase());

  /* the live count names the category too: a refresh must not announce a bare number. Written only when the
     sentence really changes — an identical rewrite re-announces inside a live region. */
  const statusEl = document.getElementById('ideasStatusLine');
  if (statusEl) {
    const statusText = 'TERSEDIA: ' + filtered.length + ' IDE · ' + String(label || 'KATEGORI').toUpperCase();
    if (statusEl.dataset.status !== statusText) {
      statusEl.dataset.status = statusText;
      statusEl.innerHTML = 'TERSEDIA: <strong id="displayedIdeasCount" class="text-red-ink">' + fmt(filtered.length) + '</strong> IDE · ' + escapeHtml(String(label || 'KATEGORI').toUpperCase());
    }
  }

  renderCategoryQuickTags();

  if (!filtered.length) {
    const about = activeTopicFilter
      ? 'topik #' + escapeHtml(activeTopicFilter.toUpperCase())
      : 'kategori ' + escapeHtml(String(label || 'ini').toUpperCase());
    container.innerHTML = '<div class="py-10 px-6 text-center bg-white border-2 border-dashed border-cocoa rounded-[18px] flex flex-col items-center justify-center">' +
      '<div class="ketchy slow mb-3" style="--kw:64px" aria-hidden="true">' +
      '<svg class="flip-frame" viewBox="0 0 100 100"><use href="#ketchy-1"></use></svg>' +
      '<svg class="flip-frame" viewBox="0 0 100 100"><use href="#ketchy-2"></use></svg>' +
      '<svg class="flip-frame" viewBox="0 0 100 100"><use href="#ketchy-3"></use></svg>' +
      '<svg class="flip-frame" viewBox="0 0 100 100"><use href="#ketchy-4"></use></svg>' +
      '</div>' +
      '<p class="font-headline font-extrabold uppercase">Belum ada ide untuk ' + about + '</p>' +
      '<p class="note mt-1">' + (activeTopicFilter ? 'Coba pilih topik lain, atau hapus filternya.' : 'Radar belum menemukan ide di kategori ini.') + '</p>' +
      (activeTopicFilter ? '<button type="button" onclick="resetTopicFilter(); playMechanicalClick();" class="mt-4 px-4 py-2 bg-pop-red text-cocoa btn-keycap font-headline text-xs font-extrabold uppercase">HAPUS FILTER</button>' : '') +
      '</div>';
    pruneTicketIndex();
    triggerReveal();
    return;
  }

  const stampDeck = stampDeckFor(catKey + '|' + (activeTopicFilter || ''));
  container.innerHTML = filtered.map(function (item, idx) {
    // idx 0 is the best idea (list is sorted by estimatedLike) -> holo seal; everyone else takes the next card off the deck
    const card = stampDeck[(idx + stampDeck.length - 1) % stampDeck.length];
    const stamp = idx === 0 ? BEST_STAMP : '<span class="rubber-stamp ' + card[1] + '">' + card[0] + '</span>';
    return ideaTicket(item, { index: idx, catKey: catKey, stamp: stamp, bump: idx === 0 });
  }).join('');
  pruneTicketIndex();
  triggerReveal();
}

/* One idea ticket, shared by the category list and the saved list (opts: index, catKey, stamp, bump, meta).
   Fills _ticketIndex so the save toggle can snapshot the item without rebuilding it, and paints the toggle's
   pressed state from the saved store. The spine and the "on" topic chips read --cat / --cart-ink, which
   selectCategory() writes on :root for the picked category. */
function ideaTicket(item, opts) {
  const o = opts || {};
  const catKey = o.catKey || activeIdeaCategory();
  const idx = o.index || 0;
  const key = ideaKey(catKey, item.contentIdea);
  _ticketIndex[key] = { item: item, catKey: catKey };   // toggleSave() snapshots the item from here
  const saved = savedKeys.has(key);
  const topicList = String(item.topics || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean).slice(0, 4);
  return '<article class="teletype-ticket pop-in p-5 pl-7"' + (o.bump ? ' data-bump' : '') + ' style="--i:' + idx + '">' +
      '<span class="ticket-spine" aria-hidden="true"></span>' +
      '<div class="flex items-center justify-between flex-wrap gap-2 pb-3 mb-3 border-b-2 border-dashed border-cocoa/20">' +
        '<span class="flex items-center gap-2 flex-wrap">' +
          '<span class="font-headline text-[0.6875rem] font-extrabold bg-cocoa text-pop-yellow rounded-full px-2.5 py-0.5">#' + (idx + 1 < 10 ? '0' : '') + (idx + 1) + '</span>' +
          (o.stamp || '') +
        '</span>' +
        '<span class="flex flex-col items-end gap-0.5 text-right ml-auto">' +
          '<span class="font-headline text-[0.6875rem] font-extrabold text-red-ink whitespace-nowrap">' + fmt(item.estimatedLike) + ' POTENSI LIKES</span>' +
          (o.meta ? '<span class="eyebrow whitespace-nowrap">' + escapeHtml(o.meta) + '</span>' : '') +
        '</span>' +
      '</div>' +
      '<p class="font-body text-[0.84375rem] font-semibold leading-relaxed break-words">"' + escapeHtml(item.contentIdea) + '"</p>' +
      '<div class="flex flex-wrap items-center gap-1.5 mt-3.5">' +
        topicList.map(function (tag) {
          const on = activeTopicFilter === tag.toLowerCase();
          return '<button type="button" class="chip-topic' + (on ? ' on' : '') + '" aria-pressed="' + (on ? 'true' : 'false') + '" onclick="filterByTopic(\'' + escapeJsArg(tag.toLowerCase()) + '\')">#' + escapeHtml(tag) + '</button>';
        }).join('') +
      '</div>' +
      '<div class="flex items-center justify-between gap-2 pt-3.5 mt-4 ticket-perf-line flex-wrap">' +
        '<span class="flex items-center gap-1.5 font-headline text-[0.6875rem] font-extrabold uppercase truncate">' +
          '<span class="w-3 h-3 rounded-full shrink-0 bg-pop-yellow border-2 border-cocoa"></span>' + escapeHtml(ideaCategoryLabel(catKey).toUpperCase()) +
        '</span>' +
        '<span class="flex flex-wrap items-center justify-end gap-2">' +
          '<button type="button" data-idea="' + escapeHtml(key) + '" onclick="toggleSave(this)" aria-pressed="' + (saved ? 'true' : 'false') + '" aria-label="' + (saved ? 'Hapus ide dari simpanan' : 'Simpan ide ini') + '" title="' + (saved ? 'Hapus dari simpanan' : 'Simpan ide ini') + '" class="save-toggle btn-keycap-sm px-3 py-1.5 ' + (saved ? 'bg-pop-mint' : 'bg-pop-yellow') + ' font-headline text-[0.6875rem] font-extrabold uppercase flex items-center gap-1.5">' +
            doodle('save', 'w-3.5 h-3.5') + (saved ? 'TERSIMPAN' : 'SIMPAN') +
          '</button>' +
          '<button type="button" data-hook="' + escapeHtml(item.contentIdea) + '" onclick="copySnippet(this)" title="Salin hook ide ini" class="btn-keycap-sm px-3 py-1.5 bg-pop-yellow font-headline text-[0.6875rem] font-extrabold uppercase flex items-center gap-1.5">' +
            '<span class="material-symbols-outlined text-[0.9375rem]">content_copy</span>SALIN HOOK' +
          '</button>' +
        '</span>' +
      '</div>' +
    '</article>';
}

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
  if (!succeeded) { showToast('Gagal menyalin. Coba lagi.', false); return; }
  playPatchCordSnap();
  /* capture the idle label once: a double click used to snapshot the "TERSALIN" state and stick there */
  if (!btn.dataset.original) btn.dataset.original = btn.innerHTML;
  btn.classList.add('stamped');
  btn.innerHTML = '<span class="material-symbols-outlined text-[0.9375rem]">done_all</span>TERSALIN';
  btn.classList.add('bg-pop-mint');
  btn.classList.remove('bg-pop-yellow');
  showToast('Hook-nya sudah tersalin ke clipboard.');
  clearTimeout(btn._copyTimer);
  btn._copyTimer = setTimeout(function () {
    btn.classList.remove('stamped');
    btn.innerHTML = btn.dataset.original;
    delete btn.dataset.original;
    btn.classList.remove('bg-pop-mint');
    btn.classList.add('bg-pop-yellow');
  }, 1600);
}
