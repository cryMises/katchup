'use strict';

/* ================= WEB AUDIO API (contract: playMechanicalClick / playPatchCordSnap / playStampThud / playCueTone) ================= */
/* The context is built lazily, on the first FX call. Every caller is a real user gesture (a click, or a keydown
   the browser counts as activation), so no AudioNode exists before the page has been interacted with. */
let _audioCtx = null;
let isAudioMuted = false;
try { isAudioMuted = localStorage.getItem('katchup_audio_mute') === 'true'; } catch (e) {}

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
/* the button is a toggle: aria-pressed tracks the sound being on, the pill tracks the same state in words */
function updateAudioFxButtonState() {
  const btn = document.getElementById('audioFxToggleBtn');
  if (btn) btn.setAttribute('aria-pressed', String(!isAudioMuted));
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
  try { localStorage.setItem('katchup_audio_mute', String(isAudioMuted)); } catch (e) {}
  updateAudioFxButtonState();
  if (!isAudioMuted) { playCueTone(640); showToast('Efek suara nyala lagi.'); }
  else { showToast('Efek suara dimatikan.', false); }
}
