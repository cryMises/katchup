/* ================= SCROLL BUMP (delete to remove) ================= */
let _bumpObserver = null;
function bumpCard(el) {
  if (prefersReducedMotion) return;
  if (el.dataset.bumped) return;   // once per element: re-observing on a view switch must not replay the sound
  el.dataset.bumped = '1';
  el.classList.add('bumped');
  playStampThud();
  setTimeout(function () { el.classList.remove('bumped'); }, 900);
}
function initScrollPranks() {
  if (prefersReducedMotion) return;
  if (_bumpObserver) _bumpObserver.disconnect();
  _bumpObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      _bumpObserver.unobserve(entry.target);
      bumpCard(entry.target);
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('[data-bump]:not([data-bumped])').forEach(function (el) { _bumpObserver.observe(el); });
}

/* ================= PRANK 2: KETCHUP RAIN + BERSIHKAN (delete to remove) ================= */
let _ketchupPile = 0;
let _ketchupGen = 0;
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
   button, BERSIHKAN pill, peeker) on the y axis, and stays fully on screen on the x axis after its drift. */
function ketchupLandingTopPx() {
  const box = 66;   // the 46px bottle plus the bbox its rotate() adds
  let reserve = 0;
  try { reserve = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--rain-floor')) || 0; } catch (e) {}
  ['mobileBottomNav', 'prankBtn', 'cleanBtn', 'edgeTomatoPeeker'].forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.height) reserve = Math.max(reserve, window.innerHeight - r.top + 6);   // hidden controls report 0 and are skipped
  });
  return Math.max(box + 8, window.innerHeight - reserve - box);
}
function rainKetchup() {
  const layer = document.getElementById('ketchupLayer');
  const gen = ++_ketchupGen;
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
  setTimeout(function () {
    if (gen !== _ketchupGen || layer.classList.contains('sweeping')) return;
    playStampThud();
    if (_ketchupPile > 0) showCleanButton();
  }, 1400);
}
function pluckKetchup(bottle) {
  if (!bottle || !bottle.isConnected || bottle.classList.contains('plucked')) return;
  const layer = document.getElementById('ketchupLayer');
  if (!layer || layer.classList.contains('sweeping')) return;
  bottle.classList.add('plucked');
  const svg = bottle.querySelector('svg');
  if (svg) svg.style.transform = 'scale(1.5) rotate(16deg)';
  playCueTone(PLUCK_NOTES[_pluckStep++ % PLUCK_NOTES.length]);   // the pile plays a tune as it empties
  leaveSplat(bottle);
  _ketchupPile = Math.max(0, _ketchupPile - 1);
  setTimeout(function () {
    if (!bottle.isConnected || layer.classList.contains('sweeping')) return;   // a new rain or BERSIHKAN owns the layer now
    bottle.remove();
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
    setTimeout(function () { cloud.remove(); }, 900 + i * 80);   // dustBlow is .8s; drop the node after it
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
    setTimeout(function () { s.remove(); }, 520 + i * 18);   // sweepOut is .5s; don't strand invisible splats
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
    const music = [].concat(API_DATA.music).filter(function (t) { return t && typeof t === 'object'; });
    const top = music.sort(function (a, b) { return trackLikes(b) - trackLikes(a); })[0];
    if (!top || !trackLikes(top)) return null;
    return { text: 'Audio paling rame: "' + top.name + '" — ' + fmt(trackLikes(top)) + ' likes.', source: 'Dari ' + music.length + ' audio yang dilacak' };
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
  const gen = ++_ketchupGen;   // cancels a pending rain reveal, and makes an old sweep yield to a new rain
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
    if (gen !== _ketchupGen) return;   // a new rain owns the layer: leave it be
    layer.innerHTML = '';
    layer.classList.remove('sweeping');
    _ketchupPile = 0;
    // no reward here: the fact only pays out for clearing the pile by hand (pluckKetchup)
  }, Math.max(580 + debris.length * 22, 1300));   // the floor covers the dust clouds, which outlast a short pile
  showToast('Beres! Tomatnya udah disapu bersih.');
}

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
function peelHero() {
  const peel = document.getElementById('heroPeel');
  const hint = document.getElementById('peelHint');
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

/* ================= PRANK 1: TOMATO PEEKER & OPT-IN CURSOR (edge tomato peeks & falls on click) — delete to remove ================= */
let _peekerTimer = null;
let _peekerRetreatTimer = null;
let _isPeekerActive = false;
let _isPeekerFalling = false;
try { localStorage.removeItem('katchup_tomato_cursor_reverted'); } catch (e) {}
let isTomatoCursorOn = false;
try { isTomatoCursorOn = localStorage.getItem('katchup_tomato_cursor_on') === 'true'; } catch (e) {}

const PEEKER_QUIPS = [
  'Pstt! 👀',
  'Halo! 🍅',
  'Lihat apa tuh?',
  'Ketchy di sini!',
  'Klik aku dong~',
  'Cilukba! 🍅'
];

function applyTomatoCursorState() {
  if (isTomatoCursorOn) {
    document.body.classList.add('tomato-cursor');
  } else {
    document.body.classList.remove('tomato-cursor');
  }
}

function toggleTomatoCursor(forceState) {
  if (typeof forceState === 'boolean') {
    isTomatoCursorOn = forceState;
  } else {
    isTomatoCursorOn = !isTomatoCursorOn;
  }
  try { localStorage.setItem('katchup_tomato_cursor_on', String(isTomatoCursorOn)); } catch (e) {}
  applyTomatoCursorState();
  if (isTomatoCursorOn) {
    showToast('Kursor tomat Ketchy aktif 🍅');
  } else {
    showToast('Kursor tomat dimatikan.');
  }
}

function triggerTomatoPeek() {
  if (prefersReducedMotion || _isPeekerActive || _isPeekerFalling) return;
  const peeker = document.getElementById('edgeTomatoPeeker');
  if (!peeker) return;

  _isPeekerActive = true;
  const bubble = peeker.querySelector('.peeker-bubble');
  if (bubble) {
    bubble.innerText = PEEKER_QUIPS[Math.floor(Math.random() * PEEKER_QUIPS.length)];
  }

  // Organic placement along bottom edge (between 60px and 220px from right)
  const randomRight = Math.floor(60 + Math.random() * 160);
  peeker.style.right = randomRight + 'px';
  peeker.classList.remove('falling');
  peeker.classList.add('peeking');
  playCueTone(840);

  clearTimeout(_peekerRetreatTimer);
  _peekerRetreatTimer = setTimeout(function () {
    retreatEdgeTomato();
  }, 4200);
}

function retreatEdgeTomato() {
  const peeker = document.getElementById('edgeTomatoPeeker');
  if (!peeker || _isPeekerFalling) return;
  peeker.classList.remove('peeking');
  _isPeekerActive = false;
  scheduleNextPeek();
}

function bonkEdgeTomato() {
  const peeker = document.getElementById('edgeTomatoPeeker');
  if (!peeker || _isPeekerFalling) return;

  clearTimeout(_peekerRetreatTimer);
  _isPeekerFalling = true;
  _isPeekerActive = false;

  playStampThud();

  peeker.classList.remove('peeking');
  peeker.classList.add('falling');

  // Clicking the tomato makes it fall AND turns the Ketchy cursor on (click again to turn it off)
  toggleTomatoCursor();

  showToast('Plop! Ketchy kepleset 🍅');

  setTimeout(function () {
    peeker.classList.remove('falling');
    _isPeekerFalling = false;
    scheduleNextPeek(7500 + Math.random() * 6000);
  }, 950);
}

function scheduleNextPeek(delay) {
  clearTimeout(_peekerTimer);
  const nextDelay = typeof delay === 'number' ? delay : (7500 + Math.random() * 7000);
  _peekerTimer = setTimeout(triggerTomatoPeek, nextDelay);
}

function initEdgeTomatoPeeker() {
  applyTomatoCursorState();
  scheduleNextPeek(3500);
  /* A hidden tab shouldn't keep waking Ketchy up: the peek loop would otherwise reschedule itself forever
     in the background, which phones pay for in battery. Resume only if he isn't mid-peek already. */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) clearTimeout(_peekerTimer);
    else if (!_isPeekerActive && !_isPeekerFalling) scheduleNextPeek();
  });
}

