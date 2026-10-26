/* ================= ANALYTICS ================= */
/* /type ships one row per (format, scrape bucket) — in practice 5 video + 5 imageAndSidecar weekly rows — so
   these sums are the cumulative sample the KPI copy claims, not one week. Both bars read the same rows, so the
   Reels/Foto ratio stays honest either way. */
function computeTypeStats() {
  const rows = API_DATA.type || [];
  const sum = function (arr, key) { return arr.reduce(function (a, b) { return a + (Number(b[key]) || 0); }, 0); };
  const video = rows.filter(function (r) { return r.type === 'video'; });
  const img = rows.filter(function (r) { return r.type === 'imageAndSidecar'; });
  const v = { count: sum(video, 'count'), likes: sum(video, 'likeAmount'), comments: sum(video, 'commentAmount') };
  const i = { count: sum(img, 'count'), likes: sum(img, 'likeAmount'), comments: sum(img, 'commentAmount') };
  const totalPosts = sum(rows, 'count'), totalLikes = sum(rows, 'likeAmount'), totalComments = sum(rows, 'commentAmount');
  return {
    v: v, i: i, totalPosts: totalPosts, totalLikes: totalLikes, totalComments: totalComments,
    avgLikePerPost: totalPosts ? totalLikes / totalPosts : 0,
    avgCommentPerPost: totalPosts ? totalComments / totalPosts : 0,
    avgLikeVideo: v.count ? v.likes / v.count : 0, avgLikeImg: i.count ? i.likes / i.count : 0,
    avgCommentVideo: v.count ? v.comments / v.count : 0, avgCommentImg: i.count ? i.comments / i.count : 0
  };
}

/* The one "best category" pick behind the FAKTA RADAR payoff: the largest avgLikeDelta in topic[0], returned
   regardless of sign — the fact layer decides whether a positive move is required before it speaks. */
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

/* journal-ledger rows — flat, ruled, no card-in-card */
function renderKpis(stats, topMusic) {
  const topTrack = topMusic[0] || { name: 'Belum ada data', likeAmount: 0 };
  const topName = String(topTrack.name || 'Belum ada data');
  const row = document.getElementById('kpiRow');
  row.innerHTML =
    '<div class="ledger" data-bump>' +
      '<div class="ledger-label">' + doodle('heart', 'w-5 h-5 text-pop-red') + ' Total likes</div>' +
      '<div class="ledger-value" data-count="' + Math.round(stats.totalLikes) + '">0</div>' +
      '<div class="ledger-note">Rata-rata ' + fmt(stats.avgLikePerPost) + ' likes per postingan</div>' +
      '<div class="ledger-split"><span>Reels: ' + (stats.v.likes / 1e6).toFixed(2) + 'jt</span><span>Foto: ' + (stats.i.likes / 1e6).toFixed(2) + 'jt</span></div>' +
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
      '<div class="ledger-label">' + doodle('note', 'w-5 h-5 text-pop-red') + ' Sound paling rame</div>' +
      '<div class="font-headline text-lg font-extrabold truncate mt-1" title="' + escapeHtml(topName) + '">' + escapeHtml(topName) + '</div>' +
      '<div class="ledger-note">' + fmt(topTrack.likeAmount) + ' total likes</div>' +
    '</div>';
  countUpAll(row);
}

let _currentGraphMode = 'posts';
let _lastStats = null;

function setGraphMetric(mode) {
  _currentGraphMode = mode;
  playMechanicalClick();
  if (_lastStats) renderFormatCompare(_lastStats);
}

function renderFormatCompare(stats) {
  _lastStats = stats;
  const videoPostPct = stats.totalPosts ? (stats.v.count / stats.totalPosts * 100) : 0;
  const imgPostPct = stats.totalPosts ? (stats.i.count / stats.totalPosts * 100) : 0;
  const videoLikesPct = stats.totalLikes ? (stats.v.likes / stats.totalLikes * 100) : 0;
  const imgLikesPct = stats.totalLikes ? (stats.i.likes / stats.totalLikes * 100) : 0;
  const videoCommentsPct = stats.totalComments ? (stats.v.comments / stats.totalComments * 100) : 0;
  const imgCommentsPct = stats.totalComments ? (stats.i.comments / stats.totalComments * 100) : 0;

  const totalAvg = (stats.avgLikeVideo + stats.avgLikeImg) || 1;
  const videoAvgPct = (stats.avgLikeVideo / totalAvg) * 100;
  const imgAvgPct = (stats.avgLikeImg / totalAvg) * 100;

  let tapeVPct = videoPostPct;
  let tapeIPct = imgPostPct;
  let tapeVVal = fmt(stats.v.count) + ' postingan';
  let tapeIVal = fmt(stats.i.count) + ' postingan';
  let tapeInsight = 'Reels nguasain ' + videoPostPct.toFixed(1) + '% dari semua postingan yang kami pantau.';

  if (_currentGraphMode === 'likes') {
    tapeVPct = videoLikesPct; tapeIPct = imgLikesPct;
    tapeVVal = fmt(stats.v.likes) + ' likes'; tapeIVal = fmt(stats.i.likes) + ' likes';
    tapeInsight = 'Reels nyedot ' + videoLikesPct.toFixed(1) + '% dari semua likes di sampel ini.';
  } else if (_currentGraphMode === 'comments') {
    tapeVPct = videoCommentsPct; tapeIPct = imgCommentsPct;
    tapeVVal = fmt(stats.v.comments) + ' komentar'; tapeIVal = fmt(stats.i.comments) + ' komentar';
    tapeInsight = videoCommentsPct.toFixed(1) + '% komentar audiens numpuk di format Reels.';
  } else if (_currentGraphMode === 'avg') {
    tapeVPct = videoAvgPct; tapeIPct = imgAvgPct;
    tapeVVal = fmt(stats.avgLikeVideo) + ' likes/post'; tapeIVal = fmt(stats.avgLikeImg) + ' likes/post';
    tapeInsight = 'Rata-rata tiap postingan: Reels (' + fmt(stats.avgLikeVideo) + ' likes/post) vs Foto (' + fmt(stats.avgLikeImg) + ' likes/post).';
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
    return '<button aria-pressed="' + active + '" onclick="setGraphMetric(\'' + m + '\')" class="px-2.5 py-1 rounded-full font-headline text-[0.65625rem] font-extrabold uppercase border-2 border-cocoa transition-all btn-keycap-sm ' +
      (active ? 'bg-cocoa text-pop-yellow shadow-[0_2px_0_#2E1E14]' : 'bg-cream text-cocoa hover:bg-white') + '">' + label + '</button>';
  };

  const makeDualBar = function (title, vVal, vPct, iVal, iPct, unit, vWinner) {
    /* crown only when the winner actually has data; a 0-0 row (payload with no rows) must not read "REELS UNGGUL",
       and an unbeatable winner reads as "tanpa lawan" instead of a fake "100%" ratio */
    const winPct = vWinner ? vPct : iPct, losePct = vWinner ? iPct : vPct;
    const winnerBadge = winPct <= 0 ? '' :
      '<span class="text-[0.59375rem] font-headline font-extrabold px-2 py-0.5 rounded-full border border-cocoa ' + (vWinner ? 'bg-pop-red' : 'bg-pop-blue') + ' text-cocoa">★ ' + (vWinner ? 'REELS' : 'FOTO') + ' UNGGUL ' + (losePct > 0 ? (winPct / losePct).toFixed(1) + 'x' : 'tanpa lawan') + '</span>';

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
              vPct.toFixed(0) + '%' +
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
              iPct.toFixed(0) + '%' +
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
          '<span><span class="seg-word">REELS </span>' + tapeVPct.toFixed(1) + '%</span>' +
        '</div>' +
        '<div class="fmt-segment-i" style="width:0" data-w="' + tapeW[1].toFixed(1) + '">' +
          '<span><span class="seg-word">FOTO </span>' + tapeIPct.toFixed(1) + '%</span>' +
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
        makeDualBar('3. Total Komentar', fmt(stats.v.comments), videoCommentsPct, fmt(stats.i.comments), imgCommentsPct, 'kom', stats.v.comments >= stats.i.comments) +
        makeDualBar('4. Rata-rata Likes per Postingan', fmt(stats.avgLikeVideo), videoAvgPct, fmt(stats.avgLikeImg), imgAvgPct, 'likes/p', stats.avgLikeVideo >= stats.avgLikeImg) +
      '</div>' +
    '</div>';
  wrap.querySelectorAll('.graph-metric-row').forEach(function (el, i) { el.classList.add('pop-in'); el.style.setProperty('--i', i); });
  growBars(wrap);
}

function renderAnalytics() {
  const stats = computeTypeStats();
  const topMusic = topMusicTracks();
  renderKpis(stats, topMusic);
  renderFormatCompare(stats);
  renderMusicList(topMusic);
}

