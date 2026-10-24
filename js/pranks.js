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
