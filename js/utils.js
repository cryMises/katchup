'use strict';

/* Formatting, escaping and storage — the layer both the data code and the later render code call.
   Nothing here touches the DOM at render time except setText's cousins in js/ui.js. */

/* ================= NUMBERS & TIME ================= */
/* every count in the UI is id-ID: "1.234.567", comma as the decimal separator */
function fmt(n) { return Math.round(n || 0).toLocaleString('id-ID'); }
function fmt1(n) { return (Number(n) || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

/* the header/footer clock is the *fetch* time, labelled "ditarik": the backend scrapes weekly, the API sends no
   scrape timestamp, so this is not a "last updated" claim */
function fmtClock(ms) {
  if (!ms) return '--';
  try { return new Date(ms).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }); }
  catch (e) { return '--'; }
}
/* pure on purpose (now is an argument) so tests/check_katchup.js can execute it */
function fmtAgo(ts, now) {
  const t = now == null ? Date.now() : now;
  const s = Math.max(0, Math.round((t - ts) / 1000));
  if (s < 60) return 'baru saja';
  const m = Math.floor(s / 60);
  if (m < 60) return m + ' menit lalu';
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' jam lalu';
  const d = Math.floor(h / 24);
  if (d === 1) return 'kemarin ' + fmtClock(ts);
  return d + ' hari lalu';
}

/* ================= ESCAPING (API text is untrusted) ================= */
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

/* accents run from pale mint to cocoa itself, so pick the ink that actually reads on the fill */
function inkOn(hex) {
  const lin = [1, 3, 5].map(function (i) { return parseInt(String(hex).slice(i, i + 2), 16) / 255; })
    .map(function (v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  const L = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  return (1.05 / (L + 0.05)) > (L + 0.05) / 0.065565 ? '#FFFFFF' : '#2E1E14';   // cocoa luminance is 0.015565
}

/* inline hand-drawn doodle -> <svg><use href="#d-name"></svg>; decorative only */
function doodle(name, cls) {
  return '<svg class="' + (cls || 'w-4 h-4') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="#d-' + name + '"></use></svg>';
}

/* ================= STORAGE ================= */
/* JSON in localStorage, never throwing: a corrupt or blocked store reads as "no value" instead of killing the load */
function readJson(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; }
  catch (e) { return fallback; }
}
function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch (e) { console.error('Katchup: gagal nulis ' + key, e); return false; }
}
