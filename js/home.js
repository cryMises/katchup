/* ================= CATEGORY CARTRIDGES ================= */
function buildCategoryCards() {
  const topicRow = API_DATA.topic && API_DATA.topic[0] ? API_DATA.topic[0] : {};
  const container = document.getElementById('topicGridContainer');
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
          '<div class="cart-delta"><span class="text-on-surface-variant">Perubahan views</span>' + d(t.avgViewDelta) + '</div>' +
          '<div class="cart-delta"><span class="text-on-surface-variant">Perubahan komentar</span>' + d(t.avgCommentDelta) + '</div>' +
        '</div>' +
      '</article>';
  }).join('');
  triggerReveal();
}

function ideasForCategory(key) {
  const cat = API_DATA.idea.find(function (c) { return c.contentType === key; });
  return cat && Array.isArray(cat.posts) ? cat.posts : [];
}

function selectCategory(key) {
  if (!CATEGORY_LIST.includes(key)) return;
  const changed = key !== currentCategory;
  currentCategory = key;
  if (changed) activeTopicFilter = null;   // picking a new category clears the filter; a refresh of the same one keeps it
  /* is-picked drives the pressed-down look AND shows the card's check (.cart-check in CSS), so the icon moves
     without re-rendering the carousel */
  document.querySelectorAll('#topicGridContainer [data-cat]').forEach(function (el) {
    const on = el.getAttribute('data-cat') === key;
    el.classList.toggle('is-picked', on);
    el.setAttribute('aria-pressed', String(on));
  });
  const info = categoryInfo(key);
  document.documentElement.style.setProperty('--cat', info.accent);
  const iconEl = document.getElementById('activeCategoryIcon');
  if (iconEl) {
    iconEl.style.backgroundColor = info.accent;
    iconEl.innerHTML = '<span class="material-symbols-outlined text-2xl" style="color:' + inkOn(info.accent) + '">' + info.icon + '</span>';
  }
  document.getElementById('activeCategoryTitle').innerText = info.name.toUpperCase() + ' · DAFTAR IDE';
  const badge = document.getElementById('activeCategoryBadge');
  badge.style.backgroundColor = info.accent;
  badge.style.color = inkOn(info.accent);   // the Kuliner brown and the cocoa fallback need white ink
  badge.innerHTML = '<span class="material-symbols-outlined text-xs mr-1">' + info.icon + '</span>' + info.badgeText;
  renderCategoryQuickTags();
  renderIdeas();
}

function renderCategoryQuickTags() {
  const container = document.getElementById('quickFilterChips');
  const resetBtn = document.getElementById('resetTagBtn');
  const items = ideasForCategory(currentCategory);
  const count = {};
  items.forEach(function (item) {
    String(item.topics || '').split(',').map(function (t) { return t.trim().toLowerCase(); }).filter(Boolean).forEach(function (t) { count[t] = (count[t] || 0) + 1; });
  });
  const topTopics = Object.keys(count).sort(function (a, b) { return count[b] - count[a]; }).slice(0, 6);
  resetBtn.classList.toggle('hidden', !activeTopicFilter);
  resetBtn.classList.toggle('flex', !!activeTopicFilter);
  container.innerHTML = '<span class="eyebrow mr-1">Topik:</span>' +
    topTopics.map(function (topic) {
      const on = activeTopicFilter === topic;
      return '<button class="chip-topic' + (on ? ' on' : '') + '" aria-pressed="' + (on ? 'true' : 'false') + '" onclick="filterByTopic(\'' + escapeJsArg(topic) + '\')">#' + escapeHtml(topic) + '</button>';
    }).join('');
}

function filterByTopic(topic) {
  playPatchCordSnap();
  if (activeTopicFilter === topic) { activeTopicFilter = null; }
  else { activeTopicFilter = topic; showToast('Filter topik #' + topic.toUpperCase() + ' dipasang.'); }
  renderCategoryQuickTags();
  renderIdeas();
  if (currentView === 'saved') renderSaved();   // the same chips live on saved tickets, so filter that list too
}
function resetTopicFilter() {
  playPatchCordSnap();
  activeTopicFilter = null;
  renderCategoryQuickTags();
  renderIdeas();
  if (currentView === 'saved') renderSaved();
  showToast('Filter topik dihapus.');
}

function escapeJsString(str) { return String(str == null ? '' : str).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'); }
/* the one HTML escaper: text nodes and plain attribute values (title/id/aria-label/data-*) */
function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
/* A JS single-quoted string living inside a double-quoted HTML attribute ("onclick=\"f('x')\""): HTML-escape
   first so the attribute can't be closed, then backslash the quote that would end the JS string. */
function escapeJsArg(str) {
  return escapeJsString(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, "\\'");
}
