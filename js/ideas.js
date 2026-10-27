/* ================= IDEA TICKETS (one column) ================= */
/* One verdict per ticket. The top-ranked idea (the list is sorted by estimatedLike, so idx 0) wears the
   holo seal; every other ticket draws from a shuffled deck, so no two tickets in view repeat a stamp.
   ponytail: 14 verdicts — a category shipping more than 14 ideas recycles the deck; extend the list then. */
const BEST_STAMP = '<span class="rubber-stamp sticker-holo">PALING VIRAL</span>';
const IDEA_STAMPS = [
  ['SIAP CONTEK', 'bg-pop-mint'],
  ['COCOK BUAT FYP', 'bg-pop-yellow'],
  ['POTENSI RAME', 'bg-pop-pink'],
  ['BANYAK DICARI', 'bg-pop-blue'],
  ['JUDUL JITU', 'bg-pop-orange'],
  ['GAMPANG DIBIKIN', 'bg-pop-mint'],
  ['IDE SEGAR', 'bg-pop-yellow'],
  ['AUDIENS NYANGKUT', 'bg-pop-pink'],
  ['TIMING PAS', 'bg-pop-blue'],
  ['WORTH DICOBA', 'bg-pop-orange'],
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
  const items = ideasForCategory(currentCategory);
  let filtered = [].concat(items).sort(function (a, b) {
    return (Number(b && b.estimatedLike) || 0) - (Number(a && a.estimatedLike) || 0);
  });
  if (activeTopicFilter) {
    filtered = filtered.filter(function (item) {
      return String(item.topics || '').split(',').map(function (t) { return t.trim().toLowerCase(); }).includes(activeTopicFilter);
    });
  }
  /* the live count names the category too: switching category must not announce a bare number */
  document.getElementById('ideasStatusLine').innerHTML = 'TERSEDIA: <strong id="displayedIdeasCount" class="text-red-ink">' + filtered.length + '</strong> IDE · ' + escapeHtml(categoryInfo(currentCategory).name.toUpperCase());
  const container = document.getElementById('ideasListContainer');

  if (!filtered.length) {
    container.innerHTML = '<div class="py-10 px-6 text-center bg-white border-2 border-dashed border-cocoa rounded-[18px] flex flex-col items-center justify-center">' +
      '<div class="ketchy slow mb-3" style="--kw:64px" aria-hidden="true">' +
      '<svg class="flip-frame" viewBox="0 0 100 100"><use href="#ketchy-1"></use></svg>' +
      '<svg class="flip-frame" viewBox="0 0 100 100"><use href="#ketchy-2"></use></svg>' +
      '<svg class="flip-frame" viewBox="0 0 100 100"><use href="#ketchy-3"></use></svg>' +
      '<svg class="flip-frame" viewBox="0 0 100 100"><use href="#ketchy-4"></use></svg>' +
      '</div>' +
      '<p class="font-headline font-extrabold uppercase">Belum ada ide untuk topik #' + escapeHtml((activeTopicFilter || '').toUpperCase()) + '</p>' +
      '<p class="note mt-1">Coba pilih topik lain, atau hapus filternya.</p>' +
      '<button onclick="resetTopicFilter(); playMechanicalClick();" class="mt-4 px-4 py-2 bg-pop-red text-cocoa btn-keycap font-headline text-xs font-extrabold uppercase">HAPUS FILTER</button>' +
      '</div>';
    pruneTicketIndex();
    return;
  }

  const stampDeck = stampDeckFor(currentCategory + '|' + (activeTopicFilter || ''));
  container.innerHTML = filtered.map(function (item, idx) {
    // idx 0 is the best idea (list is sorted by estimatedLike) -> holo seal; everyone else takes the next card off the deck
    const card = stampDeck[(idx + stampDeck.length - 1) % stampDeck.length];
    const stamp = idx === 0 ? BEST_STAMP : '<span class="rubber-stamp ' + card[1] + '">' + card[0] + '</span>';
    return ideaTicket(item, { index: idx, catKey: currentCategory, stamp: stamp, bump: idx === 0 });
  }).join('');
  pruneTicketIndex();
  triggerReveal();
}

/* One idea ticket, shared by the category list and the saved list (opts: index, catKey, stamp, bump, meta). */
function ideaTicket(item, opts) {
  const o = opts || {};
  const catKey = o.catKey || currentCategory;
  const catInfo = categoryInfo(catKey);
  const idx = o.index || 0;
  const key = ideaKey(catKey, item.contentIdea);
  _ticketIndex[key] = { item: item, catKey: catKey };   // toggleSave() snapshots the item from here
  const saved = savedKeys.has(key);
  const topicList = String(item.topics || '').split(',').map(function (t) { return t.trim(); }).filter(Boolean).slice(0, 4);
  const safeHook = escapeHtml(item.contentIdea);
  return '<article class="teletype-ticket p-5 pl-7"' + (o.bump ? ' data-bump' : '') + ' data-reveal style="--cat:' + catInfo.accent + '">' +
      '<span class="ticket-spine"></span>' +
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
      '<p class="font-body text-[0.84375rem] font-semibold leading-relaxed break-words">"' + safeHook + '"</p>' +
      (o.statusRow || '') +
      '<div class="flex flex-wrap items-center gap-1.5 mt-3.5">' +
        topicList.map(function (tag) {
          const on = activeTopicFilter === tag.toLowerCase();
          return '<button class="chip-topic' + (on ? ' on' : '') + '" aria-pressed="' + (on ? 'true' : 'false') + '" onclick="filterByTopic(\'' + escapeJsArg(tag.toLowerCase()) + '\')">#' + escapeHtml(tag) + '</button>';
        }).join('') +
      '</div>' +
      '<div class="flex items-center justify-between gap-2 pt-3.5 mt-4 ticket-perf-line flex-wrap">' +
        '<span class="flex items-center gap-1.5 font-headline text-[0.6875rem] font-extrabold uppercase truncate">' +
          '<span class="w-3 h-3 rounded-full shrink-0" style="background:' + catInfo.accent + ';border:2px solid #2E1E14"></span>' + catInfo.name.toUpperCase() +
        '</span>' +
        '<span class="flex flex-wrap items-center justify-end gap-2">' +
          '<button data-idea="' + escapeHtml(key) + '" onclick="toggleSave(this)" aria-pressed="' + (saved ? 'true' : 'false') + '" title="' + (saved ? 'Hapus dari simpanan' : 'Simpan ide ini') + '" class="btn-keycap-sm px-3 py-1.5 ' + (saved ? 'bg-pop-mint' : 'bg-pop-yellow') + ' font-headline text-[0.6875rem] font-extrabold uppercase flex items-center gap-1.5">' +
            doodle('save', 'w-3.5 h-3.5') + (saved ? 'TERSIMPAN' : 'SIMPAN') +
          '</button>' +
          '<a href="https://wa.me/628893307263?text=' + encodeURIComponent('/katchup Halo Ketchy, mau bahas ide konten ini: ' + item.contentIdea) + '" target="_blank" rel="noopener noreferrer" class="btn-keycap-sm px-3 py-1.5 bg-white font-headline text-[0.6875rem] font-extrabold uppercase flex items-center gap-1.5">' +
            '<span class="material-symbols-outlined text-[0.9375rem]">chat</span>KONSULTASI' +
          '</a>' +
          '<button data-hook="' + safeHook + '" onclick="copySnippet(this)" title="Salin hook ide ini" class="btn-keycap-sm px-3 py-1.5 bg-pop-yellow font-headline text-[0.6875rem] font-extrabold uppercase flex items-center gap-1.5">' +
            '<span class="material-symbols-outlined text-[0.9375rem]">content_copy</span>SALIN HOOK' +
          '</button>' +
        '</span>' +
      '</div>' +
    '</article>';
}

