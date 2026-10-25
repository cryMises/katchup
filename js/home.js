'use strict';

/* ================= RINGKASAN TREN (home) ================= */
/* The home view is orientational: what the radar is, the seven category cartridges (the one category picker in
   the app), the JALUR shortcuts into the other two pages, and one honest fact line off /topic[0].
   No numbers strip lives here on purpose: the KPI totals belong to ANALISIS KONTEN. */

/* the one selected category, shared with js/topics.js (chips, idea list, status line) */
let currentCategory = 'education';

/* ================= CATEGORY CARTRIDGES ================= */
function buildCategoryCards() {
  const topicRow = API_DATA.topic && API_DATA.topic[0] ? API_DATA.topic[0] : {};
  const container = document.getElementById('topicGridContainer');
  if (!container) return;
  if (!CATEGORY_LIST.length) {
    container.innerHTML = '<p class="note py-4">Belum ada kategori yang dimuat. Coba tekan PERBARUI di atas buat narik ulang datanya.</p>';
    return;
  }
  container.innerHTML = CATEGORY_LIST.map(function (key, ci) {
    const t = topicRow[key] || { avgLikeDelta: 0, avgCommentDelta: 0, avgViewDelta: 0 };
    const info = categoryInfo(key);
    const accent = info.accent;
    const picked = key === currentCategory;
    const d = function (val) {
      const v = Number(val) || 0;   // a payload that drops one delta field must not print NaN%
      const up = v >= 0;
      return '<span style="color:' + (up ? 'var(--green-ink)' : 'var(--red-ink)') + '">' + (up ? '▲ ' : '▼ ') + signed(v) + '%</span>';
    };
    const pick = 'selectCategory(\'' + escapeJsArg(key) + '\'); playMechanicalClick();';
    return '<article data-cat="' + escapeHtml(key) + '" class="cart pop-in' + (picked ? ' is-picked' : '') + '" style="--cart:' + accent + ';--cart-ink:' + inkOn(accent) + ';--i:' + ci + '" role="button" tabindex="0" aria-pressed="' + (picked ? 'true' : 'false') + '" aria-label="Pilih kategori ' + escapeHtml(info.name) + '" onclick="' + pick + '" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();' + pick + '}">' +
        '<span class="cart-spine"></span>' +
        '<div class="flex items-center justify-between gap-2">' +
          '<span class="chip-cat"><span class="material-symbols-outlined text-[0.875rem]">' + info.icon + '</span>' + info.badgeText + '</span>' +
          '<span class="cart-check"><svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#FF4949" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#d-check"></use></svg></span>' +
        '</div>' +
        '<h3 class="font-headline text-base font-extrabold uppercase tracking-wide mt-2.5">' + info.name + '</h3>' +
        '<p class="text-[0.71875rem] font-bold text-on-surface-variant">' + info.desc + '</p>' +
        '<div class="mt-3">' +
          '<div class="cart-delta"><span class="text-on-surface-variant">Perubahan likes</span>' + d(t.avgLikeDelta) + '</div>' +
          '<div class="cart-delta"><span class="text-on-surface-variant">Perubahan tayangan</span>' + d(t.avgViewDelta) + '</div>' +
          '<div class="cart-delta"><span class="text-on-surface-variant">Perubahan komentar</span>' + d(t.avgCommentDelta) + '</div>' +
        '</div>' +
      '</article>';
  }).join('');
  triggerReveal();
}

/* ================= THE ONE CATEGORY PICK ================= */
function selectCategory(key) {
  if (!CATEGORY_LIST.includes(key)) return;
  const changed = key !== currentCategory;
  currentCategory = key;
  if (changed) activeTopicFilter = null;   // picking a new category clears the filter; a refresh of the same one keeps it
  /* is-picked drives the pressed-down look AND shows the card's check (.cart-check in CSS), so the icon moves
     without re-rendering the carousel. The cards are found through [data-cat], never an id="card-…". */
  document.querySelectorAll('#topicGridContainer [data-cat]').forEach(function (el) {
    const on = el.getAttribute('data-cat') === key;
    el.classList.toggle('is-picked', on);
    el.setAttribute('aria-pressed', String(on));
  });
  const info = categoryInfo(key);
  /* one accent per category, published to the whole page: --cat fills the chips and ticket spines,
     --cart-ink carries the ink InkOn picked for that fill (Kuliner's brown and cocoa need white) */
  document.documentElement.style.setProperty('--cat', info.accent);
  document.documentElement.style.setProperty('--cart-ink', inkOn(info.accent));
  const iconEl = document.getElementById('activeCategoryIcon');
  if (iconEl) {
    iconEl.style.backgroundColor = info.accent;
    iconEl.innerHTML = '<span class="material-symbols-outlined text-2xl" style="color:' + inkOn(info.accent) + '">' + info.icon + '</span>';
  }
  const badge = document.getElementById('activeCategoryBadge');
  if (badge) {
    badge.style.backgroundColor = info.accent;
    badge.style.color = inkOn(info.accent);   // the Kuliner brown and the cocoa fallback need white ink
    badge.innerHTML = '<span class="material-symbols-outlined text-xs mr-1">' + info.icon + '</span>' + info.badgeText;
  }
  renderCategoryQuickTags();
  renderIdeas();
}

/* ================= THE FACT LINE ================= */
/* The one "best category" pick: the largest avgLikeDelta in topic[0], returned regardless of sign — the
   caller decides whether a positive move is required before it speaks. Reads API_DATA + CATEGORY_LOGOS only. */
function bestTopicDelta() {
  const row = API_DATA.topic && API_DATA.topic[0] ? API_DATA.topic[0] : null;
  if (!row) return null;
  let bestKey = '', bestVal = -Infinity;
  Object.keys(row).forEach(function (k) {
    if (!CATEGORY_LOGOS[k]) return;   // the row also carries baseTimeStamp/comparedTo, which aren't categories
    const val = Number(row[k] && row[k].avgLikeDelta) || 0;
    if (val > bestVal) { bestVal = val; bestKey = k; }
  });
  return bestKey ? { key: bestKey, val: bestVal } : null;
}

/* One sentence, written with innerText (an unknown API category key can't inject markup), and it says "turun"
   when the week really fell instead of hiding the sign. The scrape is weekly — no same-day claim anywhere. */
function renderHomeFact() {
  const el = document.getElementById('homeFact');
  if (!el) return;
  const best = bestTopicDelta();
  if (!best) { el.innerText = 'Fakta radar: belum ada data topik yang bisa dibaca minggu ini.'; return; }
  const up = best.val >= 0;
  el.innerText = 'Fakta radar — ' + categoryInfo(best.key).name + ' ' + (up ? 'paling naik' : 'paling turun') +
    ' minggu ini: ' + signed(best.val) + '% likes dibanding pengambilan sebelumnya.';
}

/* the home view's one render path: the accent + the shared idea list are set first (selectCategory renders
   both the chips and the tickets), then the cartridges paint their picked state, then the fact line reads the
   payload that just landed. A payload naming no category still paints the empty ideas state. */
function renderHome() {
  const key = CATEGORY_LIST.includes(currentCategory) ? currentCategory : CATEGORY_LIST[0];
  if (key) selectCategory(key);
  else renderIdeas();
  buildCategoryCards();
  renderHomeFact();
}

/* the chevron buttons beside the cartridges: a horizontal row has no wheel scroll, so mouse and keyboard
   readers need a step of their own (smooth unless the reader asked for reduced motion) */
function scrollCarousel(direction) {
  const container = document.getElementById('topicGridContainer');
  if (!container) return;
  const step = container.offsetWidth * 0.75;
  container.scrollBy({ left: direction === 'left' ? -step : step, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
}
