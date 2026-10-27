/* ================= AUDIO LIST ================= */
/* One preview player shared by every card: the audio object lives outside the list, because toggling a button
   re-renders the list's innerHTML and would otherwise tear down a playing <audio> element. */
let _musicAudio = null;
/* API numbers are untrusted: keep sort/bar math finite even when a row omits likeAmount */
function trackLikes(track) {
  const n = Number(track && track.likeAmount);
  return Number.isFinite(n) && n > 0 ? n : 0;
}
/* the top-5 view of /music, shared by renderAnalytics, cueTrack and the ended handler */
function topMusicTracks() {
  return [].concat(API_DATA.music)
    .filter(function (t) { return t && typeof t === 'object'; })
    .sort(function (a, b) { return trackLikes(b) - trackLikes(a); })
    .slice(0, 5);
}
/* only http(s)/protocol-relative links are played; anything else (or a payload from before musicUrl existed)
   falls back to the cue tone */
function playableMusicUrl(track) {
  const url = String((track && track.musicUrl) || '');
  return /^(https?:)?\/\//i.test(url) ? url : '';
}
/* stop whatever is playing; refresh calls this before the payload swaps, so the list can re-render clean */
function stopMusicPlayback() {
  if (_musicAudio) { try { _musicAudio.pause(); } catch (e) {} }
  currentlyPlayingTrackIndex = null;
}
/* Track data rides the DOM (data-index/data-name/data-url), never a JS literal — a quote or newline in an API
   field can't break the handler. */
function cueTrack(btn) {
  const index = Number(btn.getAttribute('data-index')) || 0;
  const trackName = btn.getAttribute('data-name') || 'Tanpa judul';
  const url = btn.getAttribute('data-url') || '';
  const wasPlaying = currentlyPlayingTrackIndex === index;
  if (wasPlaying) {
    stopMusicPlayback();
    if (!url) playCueTone(340);
    showToast('Sound #' + (index + 1) + ' dijeda.');
  } else if (url) {
    stopMusicPlayback();
    if (!_musicAudio) {
      _musicAudio = document.getElementById('musicPlayer') || new Audio();
      _musicAudio.onended = function () {
        currentlyPlayingTrackIndex = null;
        renderMusicList(topMusicTracks());   // the card flips back to DENGAR
      };
    }
    _musicAudio.src = url;
    _musicAudio.load();   // a reused element needs an explicit reload before play() on iOS
    currentlyPlayingTrackIndex = index;
    const started = _musicAudio.play();
    if (started && started.catch) started.catch(function () {
      if (currentlyPlayingTrackIndex !== index) return;   // a newer pick already took over (old load aborted)
      currentlyPlayingTrackIndex = null;
      renderMusicList(topMusicTracks());
      showToast('Preview sound-nya nggak bisa diputar.', false);
    });
    showToast('Memutar preview: ' + trackName.slice(0, 22));
  } else {
    stopMusicPlayback();
    currentlyPlayingTrackIndex = index;
    playCueTone(480 + (index * 90));
    showToast('Nada cue sound #' + (index + 1) + ': ' + trackName.slice(0, 22) + ' (preview).');
  }
  renderMusicList(topMusicTracks());
}

function renderMusicList(topMusic) {
  const container = document.getElementById('musicList');
  if (!topMusic.length) {
    container.innerHTML = '<p class="note">Belum ada sound yang terekam.</p>';
    return;
  }
  const maxLikes = topMusic.reduce(function (max, track) { return Math.max(max, trackLikes(track)); }, 0) || 1;
  container.innerHTML = topMusic.map(function (track, idx) {
    const isPlaying = currentlyPlayingTrackIndex === idx;
    const likes = trackLikes(track);
    const pct = (likes / maxLikes) * 100;
    const tname = String(track.name || 'Tanpa judul');
    const url = playableMusicUrl(track);
    return '<div class="music-card pop-in p-4 border-2 border-cocoa rounded-[18px]' + (isPlaying ? ' is-playing' : '') + '" style="--i:' + idx + '">' +
        '<div class="flex items-center gap-2.5">' +
          '<span class="font-headline text-[0.65625rem] font-extrabold bg-cocoa text-pop-yellow rounded-full px-2 py-0.5 shrink-0">#' + (idx + 1) + '</span>' +
          '<span class="font-headline text-[0.8125rem] font-extrabold uppercase truncate flex-1" title="' + escapeHtml(tname) + '">' + escapeHtml(tname) + '</span>' +
          '<button data-index="' + idx + '" data-name="' + escapeHtml(tname) + '" data-url="' + escapeHtml(url) + '" aria-pressed="' + isPlaying + '" onclick="cueTrack(this)" title="' + (url ? 'Putar preview sound di halaman ini' : 'Bunyi cue pendek (bukan pemutar lagu)') + '" class="btn-keycap-sm px-3 py-1 font-headline text-[0.6875rem] font-extrabold uppercase shrink-0 flex items-center gap-1.5 ' + (isPlaying ? 'bg-pop-red text-cocoa' : 'bg-pop-yellow text-cocoa') + '">' +
            doodle(isPlaying ? 'pause' : 'play', 'w-3.5 h-3.5') + (isPlaying ? 'JEDA' : 'DENGAR') +
          '</button>' +
        '</div>' +
        '<div class="mt-2.5">' + renderLedMeter(pct, null, 20) + '</div>' +
        '<div class="flex justify-between mt-1.5 font-headline text-[0.6875rem] font-extrabold"><span class="text-on-surface-variant">' + fmt(likes) + ' likes</span><span>' + pct.toFixed(0) + '% dari puncak</span></div>' +
      '</div>';
  }).join('');
}
