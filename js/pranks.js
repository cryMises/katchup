'use strict';

/* The removable easter eggs. Each block below is self-contained: delete its markup from index.html, its
   section in css/pranks.css and its functions here, and the app still loads. None of them is on the load path. */

/* ================= PRANK 3: PEEL-OPEN HERO WINDOW (delete to remove) ================= */
const CREATOR_TIPS = [
  'Tiga detik pertama nentuin orang lanjut nonton atau langsung scroll.',
  'Reels 15-30 detik paling gampang nyangkut di FYP.',
  'Tulis caption kayak lagi ngobrol, bukan kayak iklan.',
  'Upload jam 6-9 pagi atau 7-10 malam, jam orang buka HP.',
  'Satu video satu pesan. Jangan tumpuk tiga ide sekaligus.',
  'Balas komentar di 30 menit pertama, saat itu paling rame.'
];
let heroPeeled = false;
/* The keyboard control is the real button (#peelHint), so the wrapper is a pointer-only div — no role="button"
   around live buttons. aria-expanded reports that the cover is gone and the note is what you're reading. */
function peelHero() {
  const peel = document.getElementById('heroPeel');
  const hint = document.getElementById('peelHint');
  if (!peel) return;
  heroPeeled = !heroPeeled;
  peel.classList.toggle('peeled', heroPeeled);
  if (hint) hint.setAttribute('aria-expanded', String(heroPeeled));   // the tip replaces the cover, so say so
  if (heroPeeled) {
    playPatchCordSnap();
    document.getElementById('heroTip').innerText = CREATOR_TIPS[Math.floor(Math.random() * CREATOR_TIPS.length)];
    if (hint) hint.innerText = 'Tutup lagi';
  } else {
    playMechanicalClick();
    if (hint) hint.innerText = 'Klik buat intip';
  }
}

/* ================= PRANK 2: KETCHUP RAIN + BERSIHKAN (delete to remove) ================= */
let _ketchupPile = 0;
let _cleanHideTimer = null;
/* the pluck ladder: every tomato you pick plays the next note, so clearing the pile by hand is a little tune */
const PLUCK_NOTES = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];   // C D E G A C D E
let _pluckStep = 0;
let _splatHideTimer = null;
function showCleanButton() {
  const btn = document.getElementById('cleanBtn');
  if (!btn) return;
  clearTimeout(_cleanHideTimer);
  btn.classList.remove('leaving');
  btn.hidden = false;
}
function hideCleanButton() {
  const btn = document.getElementById('cleanBtn');
  if (!btn || btn.hidden) return;
  btn.classList.remove('leaving');
  void btn.offsetWidth; // reflow so the out animation restarts
  btn.classList.add('leaving');
  clearTimeout(_cleanHideTimer);
  _cleanHideTimer = setTimeout(function () { btn.hidden = true; btn.classList.remove('leaving'); }, 220);
}
/* A tomato nobody can reach is a tomato nobody can pluck, and a pile that can't be emptied by hand never pays out
   the FAKTA RADAR fact. So the rain lands inside a band that clears the fixed bottom chrome (bottom nav, prank
   button, BERSIHKAN pill) on the y axis, and stays fully on screen on the x axis after its drift. */
function ketchupLandingTopPx() {
  const box = 66;   // the 46px bottle plus the bbox its rotate() adds
  let reserve = 0;
  try { reserve = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rain-floor')) || 0; } catch (e) {}
  ['mobileBottomNav', 'prankBtn', 'cleanBtn'].forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.height) reserve = Math.max(reserve, window.innerHeight - r.top + 6);   // hidden controls report 0 and are skipped
  });
  return Math.max(box + 8, window.innerHeight - reserve - box);
}
function rainKetchup() {
  const layer = document.getElementById('ketchupLayer');
  if (!layer) return;
  layer.classList.remove('sweeping');   // a sweep that lost the layer leaves this behind; a fresh rain must shed it
  playPatchCordSnap();
  hideSplatCard();
  _ketchupPile = 0;
  _pluckStep = 0;
  layer.innerHTML = '';
  const vw = layer.clientWidth || window.innerWidth, box = 46;   // the layer is inset:0, so its own width is the playfield
  const landMax = ketchupLandingTopPx();   // the lowest a landed bottle may sit, clear of the bottom chrome
  const landMin = Math.max(window.innerHeight * 0.16, landMax * 0.45);
  for (let i = 0; i < 16; i++) {
    const bottle = document.createElement('span');
    bottle.className = 'falling-bottle' + (prefersReducedMotion ? ' no-fall' : '');
    const drift = Math.round(Math.random() * 80 - 40);
    const leftMin = Math.max(0, -drift), leftMax = Math.max(leftMin, vw - box - drift);
    bottle.style.left = Math.round(leftMin + Math.random() * (leftMax - leftMin)) + 'px';
    bottle.style.animationDelay = (Math.random() * 0.55).toFixed(2) + 's';
    bottle.style.setProperty('--rest', Math.round(landMin + Math.random() * Math.max(0, landMax - landMin)) + 'px');
    bottle.style.setProperty('--rot', (Math.random() * 70 - 35).toFixed(0) + 'deg');
    bottle.style.setProperty('--drift', drift + 'px');
    bottle.innerHTML = '<svg viewBox="0 0 100 100" width="46" height="46" aria-hidden="true"><use href="#ketchy-' + ((i % 4) + 1) + '"></use></svg>';
    bottle.onclick = function () { pluckKetchup(bottle); };
    layer.appendChild(bottle);
    _ketchupPile++;
  }
  if (prefersReducedMotion) { playStampThud(); if (_ketchupPile > 0) showCleanButton(); return; }
  setTimeout(function () { playStampThud(); if (_ketchupPile > 0) showCleanButton(); }, 1400);
}
function pluckKetchup(bottle) {
  if (!bottle || bottle.classList.contains('plucked')) return;
  bottle.classList.add('plucked');
  const svg = bottle.querySelector('svg');
  if (svg) svg.style.transform = 'scale(1.5) rotate(16deg)';
  playCueTone(PLUCK_NOTES[_pluckStep++ % PLUCK_NOTES.length]);   // the pile plays a tune as it empties
  leaveSplat(bottle);
  _ketchupPile = Math.max(0, _ketchupPile - 1);
  setTimeout(function () {
    if (bottle.parentNode) bottle.parentNode.removeChild(bottle);
    if (_ketchupPile <= 0) {
      hideCleanButton();
      showToast('Rapi! Semua tomat dibersihin satu-satu.');
      splatRandomFact();
    }
  }, 260);
}

/* the splat stays where the tomato was hit, so the mess on screen is the one you made */
function leaveSplat(bottle) {
  const layer = document.getElementById('ketchupLayer');
  if (!layer) return;
  const box = bottle.getBoundingClientRect();   // the layer is inset:0 fixed, so viewport coords map straight onto it
  const splat = document.createElement('span');
  splat.className = 'ketchup-splat';
  splat.style.left = (box.left + box.width / 2 + Math.random() * 30 - 15).toFixed(0) + 'px';
  splat.style.top = (box.top + box.height * 0.55).toFixed(0) + 'px';
  const w = 40 + Math.random() * 16;   // near-square box: the SVG stretches to fit, so a tall box would smear the polygon
  splat.style.setProperty('--sw', w.toFixed(0) + 'px');
  splat.style.setProperty('--sh', (w * (0.86 + Math.random() * 0.14)).toFixed(0) + 'px');
  splat.style.setProperty('--rot', (Math.random() * 90 - 45).toFixed(0) + 'deg');
  splat.innerHTML = splatSvg();
  layer.appendChild(splat);
}

/* The outline both marks share: a round body of radius `base` with `lobes` gaussian bumps sticking out as far as
   `base + bump`. Sampled every 6°, the radius staying single-valued is what guarantees a closed, never-crossing
   polygon, so the round points come out of the maths rather than out of a fat stroke. */
function blobPoints(lobes, base, bump, sigma) {
  const phase = Math.random() * Math.PI * 2;
  const centres = [];
  for (let i = 0; i < lobes; i++) centres.push(phase + (i / lobes) * Math.PI * 2 + (Math.random() - 0.5) * 0.16);
  const pts = [];
  for (let k = 0; k < 60; k++) {
    const th = (k / 60) * Math.PI * 2;
    let r = base;
    centres.forEach(function (c) {
      const d = Math.atan2(Math.sin(th - c), Math.cos(th - c));   // shortest way round, so a lobe past 0 still echoes
      r += bump * Math.exp(-(d * d) / (2 * sigma * sigma));
    });
    pts.push((50 + Math.cos(th) * r).toFixed(1) + ',' + (50 + Math.sin(th) * r).toFixed(1));
  }
  return pts.join(' ');
}
/* Radii top out near 41 and the rim stroke adds 5, keeping the silhouette inside the viewBox: past 50 it would be
   clipped flat. Outer stroke 10 and body stroke 1 leave a 4.5-unit cocoa rim. The body shrinks as points multiply
   and the points grow, because the radius budget is fixed and 4-5 of them have to fit around the same circle. */
function splatSvg() {
  const lobes = 4 + Math.floor(Math.random() * 2);
  const base = 20 - lobes * 1.2 + Math.random() * 3;
  const bump = 16 + lobes * 1.2 + Math.random() * 3;
  const sigma = 0.34 - (lobes - 4) * 0.02 + Math.random() * 0.02;
  const p = blobPoints(lobes, base, bump, sigma);
  return '<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' +
    '<polygon points="' + p + '" fill="#2E1E14" stroke="#2E1E14" stroke-width="10" stroke-linejoin="round"/>' +
    '<polygon points="' + p + '" fill="#FF4949" stroke="#FF4949" stroke-width="1" stroke-linejoin="round"/>' +
  '</svg>';
}
/* Cloudier than a splat: several wide shallow lobes, no rim, so the same maths reads as dust instead of ketchup */
function dustSvg() {
  const p = blobPoints(3 + Math.floor(Math.random() * 3), 29 + Math.random() * 4, 9 + Math.random() * 4, 0.42 + Math.random() * 0.1);
  return '<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon points="' + p + '" fill="#6A5344"/></svg>';
}
/* Both cleanups end the same way: four or five big clouds cross the layer from off-screen and carry the mess out
   with them. Sized in vw, so they stay a wall of dust on a phone and on a desktop alike. */
function blowDustClouds() {
  if (prefersReducedMotion) return;   // CSS hides the clouds, so building them is pure garbage
  const layer = document.getElementById('ketchupLayer');
  if (!layer) return;
  const vw = window.innerWidth / 100;
  const n = 4 + Math.floor(Math.random() * 2);
  for (let i = 0; i < n; i++) {
    const cloud = document.createElement('span');
    cloud.className = 'dust-cloud';
    const w = Math.max(200, (34 + Math.random() * 22) * vw);
    cloud.style.setProperty('--sw', w.toFixed(0) + 'px');
    cloud.style.setProperty('--sh', (w * 0.5).toFixed(0) + 'px');
    cloud.style.top = (8 + Math.random() * 74).toFixed(0) + 'vh';
    cloud.style.animationDelay = (i * 80 + Math.random() * 40).toFixed(0) + 'ms';
    cloud.innerHTML = dustSvg();
    layer.appendChild(cloud);
  }
}

/* the mess leaves with the note: closing the card, or having no fact to show, wipes the splats it came from.
   The class rides each splat, not the layer, so a rain starting mid-wipe keeps its own splats falling. */
function wipeSplats() {
  const layer = document.getElementById('ketchupLayer');
  if (!layer) return;
  layer.querySelectorAll('.ketchup-splat').forEach(function (s, i) {
    s.classList.add('wiped');
    s.style.animationDelay = (i * 18) + 'ms';
  });
  blowDustClouds();   // a splat being wiped gets blown off screen too, so it is dusted the same way
}

/* PRANK 2 payoff: FAKTA RADAR — one real number out of the payload that's already loaded. Deliberately neither a
   content idea nor a creator tip: the reward is the data talking about itself, so it adapts to whichever week's
   scrape is on screen. Manual clear only (pluckKetchup): picking all 16 by hand is the game and BERSIHKAN is the
   shortcut that skips it. Consequence: the pile is a pointer-only game, so this payoff can't be reached by keyboard. */
const RADAR_FACTS = [
  function () {
    const s = computeTypeStats();
    if (!s.totalPosts) return null;
    return { text: 'Reels nyumbang ' + Math.round((s.v.count / s.totalPosts) * 100) + '% dari semua konten yang dipantau.', source: 'Dari ' + fmt(s.totalPosts) + ' postingan' };
  },
  function () {
    const s = computeTypeStats();
    if (!s.avgLikePerPost) return null;
    return { text: 'Rata-rata 1 postingan nyumbang ' + fmt(s.avgLikePerPost) + ' likes.', source: 'Dari ' + fmt(s.totalLikes) + ' likes' };
  },
  function () {
    const top = [].concat(API_DATA.music).sort(function (a, b) { return b.likeAmount - a.likeAmount; })[0];
    if (!top || !top.likeAmount) return null;
    return { text: 'Audio paling rame: "' + top.name + '" — ' + fmt(top.likeAmount) + ' likes.', source: 'Dari ' + API_DATA.music.length + ' audio yang dilacak' };
  },
  function () {
    const best = bestTopicDelta();
    if (!best || best.val <= 0) return null;   // "paling naik" would be a lie if every category fell
    return { text: categoryInfo(best.key).name + ' paling naik: ' + signed(best.val) + '% likes dibanding pengambilan sebelumnya.', source: 'Dari data topik mingguan' };
  },
  function () {
    const s = computeTypeStats();
    if (!s.totalComments) return null;
    return { text: 'Tiap ' + fmt(s.totalLikes / s.totalComments) + ' likes, cuma ada 1 komentar.', source: 'Dari ' + fmt(s.totalComments) + ' komentar' };
  }
];
function splatRandomFact() {
  const card = document.getElementById('splatCard');
  if (!card) return;
  const facts = [];
  RADAR_FACTS.forEach(function (make) { const f = make(); if (f) facts.push(f); });
  if (!facts.length) { wipeSplats(); return; }   // nothing loaded: clear the mess instead of stranding it
  const pick = facts[Math.floor(Math.random() * facts.length)];
  document.getElementById('splatFact').innerText = pick.text;
  document.getElementById('splatSource').innerText = pick.source;
  clearTimeout(_splatHideTimer);
  card.classList.remove('leaving');
  card.hidden = false;
  playStampThud();
  setA11yStatus('Fakta radar muncul di kartu paling bawah.');
}

function hideSplatCard() {
  wipeSplats();   // the note and the mess it came from leave together
  const card = document.getElementById('splatCard');
  if (!card || card.hidden) return;
  clearTimeout(_splatHideTimer);
  card.classList.remove('leaving');
  void card.offsetWidth;   // reflow so the out animation restarts
  card.classList.add('leaving');
  _splatHideTimer = setTimeout(function () { card.hidden = true; card.classList.remove('leaving'); }, 220);
}

function sweepKetchup() {
  const layer = document.getElementById('ketchupLayer');
  if (!layer) return;
  playStampThud();
  const debris = layer.querySelectorAll('.falling-bottle, .ketchup-splat');
  // pin each bottle to where it actually is: mid-fall its position lives in the animation fill, and swapping the
  // animation-name drops that, so an unpinned bottle would jump to the rule's `top` before sweeping. Bottles only:
  // a splat is `translate:-50% -50%`, so its rect is already offset and writing that back as `top` would move it.
  layer.querySelectorAll('.falling-bottle').forEach(function (b) { b.style.top = b.getBoundingClientRect().top + 'px'; });
  layer.classList.add('sweeping');
  // stagger so the pile clears in a wave instead of one block, and blow the dust that carries it off screen
  debris.forEach(function (b, i) { b.style.animationDelay = (i * 22) + 'ms'; });
  blowDustClouds();
  hideCleanButton();
  setTimeout(function () {
    if (debris.length && debris[0].parentNode !== layer) return;   // a new rain already owns the layer: leave it be
    layer.innerHTML = '';
    layer.classList.remove('sweeping');
    _ketchupPile = 0;
    // no reward here: the fact only pays out for clearing the pile by hand (pluckKetchup)
  }, Math.max(580 + debris.length * 22, 1300));   // the floor covers the dust clouds, which outlast a short pile
  showToast('Beres! Tomatnya udah disapu bersih.');
}
