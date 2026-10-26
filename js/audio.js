/* ================= WEB AUDIO API (contract: playMechanicalClick / playPatchCordSnap / playStampThud / playCueTone) ================= */
let _audioCtx = null;
let isAudioMuted = localStorage.getItem('katchup_audio_mute') === 'true';

function getAudioCtx() {
  if (isAudioMuted) return null;
  if (!_audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) _audioCtx = new AC();
  }
  if (_audioCtx && _audioCtx.state === 'suspended') _audioCtx.resume();
  return _audioCtx;
}
function playMechanicalClick() {
  if (isAudioMuted) return;
  try {
    const ctx = getAudioCtx(); if (!ctx) return;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.03);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.03);
  } catch (e) {}
}
function playCueTone(freq) {
  if (isAudioMuted) return;
  try {
    const ctx = getAudioCtx(); if (!ctx) return;
    const f = freq || 520;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(f, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(f * 1.5, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.2);
  } catch (e) {}
}
function playPatchCordSnap() {
  if (isAudioMuted) return;
  try {
    const ctx = getAudioCtx(); if (!ctx) return;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.04);
  } catch (e) {}
}
function playStampThud() {
  if (isAudioMuted) return;
  try {
    const ctx = getAudioCtx(); if (!ctx) return;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.06);
  } catch (e) {}
}
function updateAudioFxButtonState() {
  const el = document.getElementById('audioFxStatus');
  if (!el) return;
  if (isAudioMuted) {
    el.innerText = 'MUTE';
    el.className = 'px-2 py-0.5 bg-pop-red text-cocoa rounded-full border-2 border-cocoa text-[0.625rem]';
  } else {
    el.innerText = 'ON';
    el.className = 'px-2 py-0.5 bg-pop-mint rounded-full border-2 border-cocoa text-[0.625rem]';
  }
}
function toggleAudioFx() {
  isAudioMuted = !isAudioMuted;
  localStorage.setItem('katchup_audio_mute', String(isAudioMuted));
  updateAudioFxButtonState();
  if (!isAudioMuted) { playCueTone(640); showToast('Efek suara nyala lagi.'); }
  else { showToast('Efek suara dimatikan.', false); }
}
/* Discrete jelly-bean LED meter (dark groove). Without an activeClass the lit segments run mint->yellow->red, so
   a longer bar (a hotter sound) also reads hotter; the music list uses that scale, and activeClass stays for
   callers that need one flat tint across the lit segments. */
function renderLedMeter(pct, activeClass, totalBars) {
  const total = totalBars || 20;
  const activeCount = Math.round((Math.max(0, Math.min(100, pct)) / 100) * total);
  let bars = '';
  for (let i = 0; i < total; i++) {
    let color = 'led-off';
    if (i < activeCount) color = activeClass || ((i >= total - 3) ? 'bg-pop-red' : (i >= total - 7 ? 'bg-pop-yellow' : 'bg-pop-mint'));
    bars += '<span class="flex-1 h-full ' + color + ' rounded-full" style="--i:' + i + '"></span>';
  }
  return '<div class="flex items-center gap-[3px] w-full h-3.5 vu-scale p-[2px] deck-groove" title="' + pct.toFixed(1) + '%">' + bars + '</div>';
}

