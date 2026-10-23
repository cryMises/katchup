'use strict';

/* ================= RINGKASAN TREN (home) ================= */
/* The home view is orientational: what the radar is, the seven category cartridges (the one category picker in
   the app), and the JALUR shortcuts into the other two pages.
   No numbers strip lives here on purpose: the KPI totals belong to ANALISIS KONTEN. */

/* the one selected category, shared with js/topics.js (chips, idea list, status line) */
let currentCategory = 'education';

/* ================= CATEGORY CARTRIDGES ================= */
function buildCategoryCards() {
  const container = document.getElementById('topicGridContainer');
  if (!container) return;
  if (!CATEGORY_LIST.length) {
    container.innerHTML = '<p class="note py-4">Belum ada kategori yang dimuat. Coba tekan PERBARUI di atas untuk menarik ulang data.</p>';
    return;
  }
  container.innerHTML = CATEGORY_LIST.map(function (key, ci) {
    const info = categoryInfo(key);
    const accent = info.accent;
    const picked = key === currentCategory;
    const pick = 'selectCategory(\'' + escapeJsArg(key) + '\'); playMechanicalClick();';
    return '<article data-cat="' + escapeHtml(key) + '" class="cart pop-in' + (picked ? ' is-picked' : '') + '" style="--cart:' + accent + ';--cart-ink:' + inkOn(accent) + ';--i:' + ci + '" role="button" tabindex="0" aria-pressed="' + (picked ? 'true' : 'false') + '" aria-label="Pilih kategori ' + escapeHtml(info.name) + '" onclick="' + pick + '" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();' + pick + '}">' +
        '<span class="cart-spine"></span>' +
        '<div class="flex items-center justify-between gap-2">' +
          '<span class="chip-cat"><span class="material-symbols-outlined text-[0.875rem]">' + info.icon + '</span>' + info.badgeText + '</span>' +
          '<span class="cart-check"><svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#FF4949" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#d-check"></use></svg></span>' +
        '</div>' +
        '<h3 class="font-headline text-base font-extrabold uppercase tracking-wide mt-2.5">' + info.name + '</h3>' +
        '<p class="text-[0.71875rem] font-bold text-on-surface-variant">' + info.desc + '</p>' +
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

/* the home view's one render path: the accent + the shared idea list are set first (selectCategory renders
   both the chips and the tickets), then the cartridges paint their picked state. A payload naming no category
   still paints the empty ideas state. */
function renderHome() {
  const key = CATEGORY_LIST.includes(currentCategory) ? currentCategory : CATEGORY_LIST[0];
  if (key) selectCategory(key);
  else renderIdeas();
  buildCategoryCards();
}
