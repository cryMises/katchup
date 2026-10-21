'use strict';

/* Analytics view: the KPI ledger, the Reels-vs-Foto compare and the shared LED renderer.
   Sound playback and the TOP 5 cards are a later slice, so this file renders numbers only. */

let _currentGraphMode = 'posts';
let _lastStats = null;

/* id-ID formatting for shares: "45,6%", never "45.6%" */
function pct1(n) { return (Number(n) || 0).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
function pct0(n) { return (Number(n) || 0).toLocaleString('id-ID', { maximumFractionDigits: 0 }); }

/* the top-5 view of /music by likes — the later sound list and this KPI card read the same order */
function topMusicTracks() {
  return [].concat(API_DATA.music).sort(function (a, b) { return b.likeAmount - a.likeAmount; }).slice(0, 5);
}

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

/* journal-ledger rows — flat, ruled, no card-in-card */
function renderKpis(stats, topMusic) {
  const topTrack = topMusic[0] || { name: 'Belum ada data', likeAmount: 0 };
  const topName = String(topTrack.name || 'Belum ada data');
  const row = document.getElementById('kpiRow');
  row.innerHTML =
    '<div class="ledger pop-in" style="--i:0">' +
      '<div class="ledger-label">' + doodle('heart', 'w-5 h-5 text-pop-red') + ' Total likes</div>' +
      '<div class="ledger-value" data-count="' + Math.round(stats.totalLikes) + '">0</div>' +
      '<div class="ledger-note">Rata-rata ' + fmt(stats.avgLikePerPost) + ' likes per postingan</div>' +
      '<div class="ledger-split"><span>Reels: ' + fmt(stats.v.likes) + '</span><span>Foto: ' + fmt(stats.i.likes) + '</span></div>' +
    '</div>' +
    '<div class="ledger pop-in" style="--i:1">' +
      '<div class="ledger-label">' + doodle('stack', 'w-5 h-5 text-pop-blue') + ' Total postingan</div>' +
      '<div class="ledger-value" data-count="' + Math.round(stats.totalPosts) + '">0</div>' +
      '<div class="ledger-note">Semua konten yang masuk sampel</div>' +
      '<div class="ledger-split"><span>Reels: ' + fmt(stats.v.count) + '</span><span>Foto: ' + fmt(stats.i.count) + '</span></div>' +
    '</div>' +
    '<div class="ledger pop-in" style="--i:2">' +
      '<div class="ledger-label">' + doodle('chat', 'w-5 h-5 text-pop-mint') + ' Total komentar</div>' +
      '<div class="ledger-value" data-count="' + Math.round(stats.totalComments) + '">0</div>' +
      '<div class="ledger-note">Rata-rata ' + fmt(stats.avgCommentPerPost) + ' komentar per postingan</div>' +
      '<div class="ledger-split"><span>Reels: ' + fmt(stats.v.comments) + '</span><span>Foto: ' + fmt(stats.i.comments) + '</span></div>' +
    '</div>' +
    '<div class="ledger pop-in" style="--i:3">' +
      '<div class="ledger-label">' + doodle('spark', 'w-5 h-5 text-pop-red') + ' Sound paling ramai</div>' +
      '<div class="font-headline text-lg font-extrabold truncate mt-1" title="' + escapeHtml(topName) + '">' + escapeHtml(topName) + '</div>' +
      '<div class="ledger-note">' + fmt(topTrack.likeAmount) + ' total likes</div>' +
    '</div>';
  countUpAll(row);
}

function setGraphMetric(mode) {
  _currentGraphMode = mode;
  if (_lastStats) renderFormatCompare(_lastStats);
}

function renderFormatCompare(stats) {
  _lastStats = stats;
  const videoPostPct = stats.videoPostPct, imgPostPct = stats.imgPostPct;
  const videoLikesPct = stats.videoLikesPct, imgLikesPct = stats.imgLikesPct;

  let tapeVPct = videoPostPct, tapeIPct = imgPostPct;
  let tapeVVal = fmt(stats.v.count) + ' postingan', tapeIVal = fmt(stats.i.count) + ' postingan';
  let tapeInsight = 'Reels menguasai ' + pct1(videoPostPct) + '% dari semua postingan yang masuk sampel.';

  if (_currentGraphMode === 'likes') {
    tapeVPct = videoLikesPct; tapeIPct = imgLikesPct;
    tapeVVal = fmt(stats.v.likes) + ' likes'; tapeIVal = fmt(stats.i.likes) + ' likes';
    tapeInsight = 'Reels menyumbang ' + pct1(videoLikesPct) + '% dari semua likes di sampel ini.';
  } else if (_currentGraphMode === 'comments') {
    tapeVPct = stats.videoCommentsPct; tapeIPct = stats.imgCommentsPct;
    tapeVVal = fmt(stats.v.comments) + ' komentar'; tapeIVal = fmt(stats.i.comments) + ' komentar';
    tapeInsight = pct1(stats.videoCommentsPct) + '% komentar audiens terkumpul di format Reels.';
  } else if (_currentGraphMode === 'avg') {
    tapeVPct = stats.videoAvgPct; tapeIPct = stats.imgAvgPct;
    tapeVVal = fmt(stats.avgLikeVideo) + ' likes/post'; tapeIVal = fmt(stats.avgLikeImg) + ' likes/post';
    tapeInsight = 'Rata-rata per postingan: Reels (' + fmt(stats.avgLikeVideo) + ' likes/post) vs Foto (' + fmt(stats.avgLikeImg) + ' likes/post).';
  }

  /* keep a sliver visible for a tiny share, but never let the two floors sum past the tape's 100% width (and
     split a no-data row straight down the middle instead of faking an 88/12 split) */
  const tapeWidth = function (vp, ip) {
    if (!(vp + ip)) return [50, 50];
    if (Math.max(12, vp) + Math.max(12, ip) <= 100) return [Math.max(12, vp), Math.max(12, ip)];
    return vp <= ip ? [12, 88] : [88, 12];
  };
  const tapeW = tapeWidth(tapeVPct, tapeIPct);

  const modeBtn = function (m, label) {
    const active = _currentGraphMode === m;
    return '<button type="button" aria-pressed="' + active + '" onclick="setGraphMetric(\'' + m + '\')" class="px-2.5 py-1 rounded-full font-headline text-[0.65625rem] font-extrabold uppercase border-2 border-cocoa transition-all btn-keycap-sm ' +
      (active ? 'bg-cocoa text-pop-yellow shadow-[0_2px_0_#2E1E14]' : 'bg-cream text-cocoa hover:bg-white') + '">' + label + '</button>';
  };

  const makeDualBar = function (title, vVal, vPct, iVal, iPct, unit, vWinner) {
    /* crown only when the winner actually has data; a 0-0 row must not read "REELS UNGGUL", and an unbeatable
       winner reads as "tanpa lawan" instead of a fake ratio */
    const winPct = vWinner ? vPct : iPct, losePct = vWinner ? iPct : vPct;
    const winnerBadge = winPct <= 0 ? '' :
      '<span class="text-[0.59375rem] font-headline font-extrabold px-2 py-0.5 rounded-full border border-cocoa ' + (vWinner ? 'bg-pop-red' : 'bg-pop-blue') + ' text-cocoa">★ ' + (vWinner ? 'REELS' : 'FOTO') + ' UNGGUL ' + (losePct > 0 ? pct1(winPct / losePct) + 'x' : 'tanpa lawan') + '</span>';

    return '<div class="graph-metric-row">' +
      '<div class="flex items-center justify-between font-headline text-[0.6875rem] font-extrabold uppercase flex-wrap gap-1">' +
        '<span>' + title + '</span>' +
        winnerBadge +
      '</div>' +
      '<div class="flex flex-col gap-1.5 mt-1">' +
        '<div class="graph-bar-row">' +
          '<span class="font-headline text-[0.65625rem] font-extrabold w-16 shrink-0 text-red-ink flex items-center gap-1">' +
            doodle('play', 'w-3 h-3 text-red-ink') + ' Reels' +
          '</span>' +
          '<div class="graph-bar-slot">' +
            '<div class="graph-bar-fill bg-pop-red" style="width:0" data-w="' + Math.max(10, vPct).toFixed(1) + '">' +
              pct0(vPct) + '%' +
            '</div>' +
          '</div>' +
          '<span class="font-headline text-[0.65625rem] font-extrabold w-24 text-right shrink-0 ml-auto break-words" title="' + escapeHtml(vVal + ' ' + unit) + '">' + vVal + ' ' + unit + '</span>' +
        '</div>' +
        '<div class="graph-bar-row">' +
          '<span class="font-headline text-[0.65625rem] font-extrabold w-16 shrink-0 text-blue-ink flex items-center gap-1">' +
            doodle('stack', 'w-3 h-3 text-blue-ink') + ' Foto' +
          '</span>' +
          '<div class="graph-bar-slot">' +
            '<div class="graph-bar-fill bg-pop-blue" style="width:0" data-w="' + Math.max(10, iPct).toFixed(1) + '">' +
              pct0(iPct) + '%' +
            '</div>' +
          '</div>' +
          '<span class="font-headline text-[0.65625rem] font-extrabold w-24 text-right shrink-0 ml-auto break-words" title="' + escapeHtml(iVal + ' ' + unit) + '">' + iVal + ' ' + unit + '</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  };

  const wrap = document.getElementById('formatCompare');
  wrap.innerHTML =
    '<div class="fmt-graph-card">' +
      '<div class="flex items-center justify-between gap-2 flex-wrap mb-3">' +
        '<div class="flex items-center gap-2">' +
          '<span class="w-3.5 h-3.5 bg-pop-red rounded-full border-2 border-cocoa shrink-0"></span>' +
          '<span class="font-headline text-xs font-extrabold uppercase">DIAGRAM PERBANDINGAN REELS VS FOTO</span>' +
        '</div>' +
        '<div class="flex items-center gap-1.5 flex-wrap">' +
          modeBtn('posts', 'Konten') +
          modeBtn('likes', 'Likes') +
          modeBtn('comments', 'Komentar') +
          modeBtn('avg', 'Efisiensi') +
        '</div>' +
      '</div>' +

      '<div class="fmt-segmented-tape mb-2">' +
        '<div class="fmt-segment-v" style="width:0" data-w="' + tapeW[0].toFixed(1) + '">' +
          '<span><span class="seg-word">REELS </span>' + pct1(tapeVPct) + '%</span>' +
        '</div>' +
        '<div class="fmt-segment-i" style="width:0" data-w="' + tapeW[1].toFixed(1) + '">' +
          '<span><span class="seg-word">FOTO </span>' + pct1(tapeIPct) + '%</span>' +
        '</div>' +
      '</div>' +

      '<div class="flex items-center justify-between flex-wrap gap-x-3 gap-y-1 font-headline text-[0.6875rem] font-extrabold mb-3 text-on-surface-variant">' +
        '<span class="text-red-ink flex items-center gap-1">' + doodle('play', 'w-3 h-3 text-red-ink') + ' Reels: ' + tapeVVal + '</span>' +
        '<span class="text-blue-ink flex items-center gap-1">' + doodle('stack', 'w-3 h-3 text-blue-ink') + ' Foto: ' + tapeIVal + '</span>' +
      '</div>' +

      '<p class="note text-xs font-bold p-2.5 bg-cream border-2 border-dashed border-cocoa/30 rounded-xl mb-4">' +
        tapeInsight +
      '</p>' +

      '<div class="flex flex-col gap-2">' +
        makeDualBar('1. Jumlah Postingan', fmt(stats.v.count), videoPostPct, fmt(stats.i.count), imgPostPct, 'post', stats.v.count >= stats.i.count) +
        makeDualBar('2. Total Likes yang Terkumpul', fmt(stats.v.likes), videoLikesPct, fmt(stats.i.likes), imgLikesPct, 'likes', stats.v.likes >= stats.i.likes) +
        makeDualBar('3. Total Komentar', fmt(stats.v.comments), stats.videoCommentsPct, fmt(stats.i.comments), stats.imgCommentsPct, 'kom', stats.v.comments >= stats.i.comments) +
        makeDualBar('4. Rata-rata Likes per Postingan', fmt(stats.avgLikeVideo), stats.videoAvgPct, fmt(stats.avgLikeImg), stats.imgAvgPct, 'likes/p', stats.avgLikeVideo >= stats.avgLikeImg) +
      '</div>' +
    '</div>';
  wrap.querySelectorAll('.graph-metric-row').forEach(function (el, i) { el.classList.add('pop-in'); el.style.setProperty('--i', i); });
  growBars(wrap);
}

/* Discrete jelly-bean LED meter (dark groove). Without an activeClass the lit segments run mint->yellow->red, so
   a longer bar (a hotter sound) also reads hotter; activeClass stays for callers that need one flat tint. */
function renderLedMeter(pct, activeClass, totalBars) {
  const total = totalBars || 20;
  const activeCount = Math.round((Math.max(0, Math.min(100, pct)) / 100) * total);
  let bars = '';
  for (let i = 0; i < total; i++) {
    let color = 'led-off';
    if (i < activeCount) color = activeClass || ((i >= total - 3) ? 'bg-pop-red' : (i >= total - 7 ? 'bg-pop-yellow' : 'bg-pop-mint'));
    bars += '<span class="flex-1 h-full ' + color + ' rounded-full" style="--i:' + i + '"></span>';
  }
  return '<div class="flex items-center gap-[3px] w-full h-3.5 vu-scale p-[2px] deck-groove" role="img" aria-label="' + pct1(pct) + ' persen" title="' + pct1(pct) + '%">' + bars + '</div>';
}

function renderAnalytics() {
  const stats = computeTypeStats();
  const topMusic = topMusicTracks();
  renderKpis(stats, topMusic);
  renderFormatCompare(stats);
  triggerReveal();
}
