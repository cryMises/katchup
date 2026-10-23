'use strict';

/* Fixed configuration — the one place a value is allowed to be hard-coded.
   No build step, so this file is edited by hand when the tunnel URL changes. */

/* ngrok webhook that serves the weekly scrape. Both hosts `ngrok-free.dev` and any `/api/v1/` path are what the
   production service worker classifies as API; that worker does not exist at this level, but the URL shape is
   the same on purpose so a later slice needs no change here. Requesting another host would make the payload
   look like a static asset to it. */
const API_BASE = 'https://erma-pseudosyphilitic-unwonderfully.ngrok-free.dev/webhook/9b0c38c4-a3e7-4000-8a3b-985071c2de60/api/v1/';

/* the four endpoints the radar reads, fetched in parallel */
const API_ENDPOINTS = ['music', 'topic', 'idea', 'type'];

/* localStorage: the last good payload. The saved-ideas key and the sound-FX mute key (`katchup_audio_mute`,
   owned by js/audio.js) arrive with their own slices. */
const CACHE_KEY = 'katchup_data_cache';
/* a week is as long as a week-old trend list stays quotable; the backend scrapes weekly, on Mondays */
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

/* Category identity. The payload names its own categories through idea[].contentType, so CATEGORY_LIST is
   replaced by the live list on every applyApiData(); the keys below are the fallback before the first payload
   lands. One hue per category, reused everywhere that category shows up: education=blue, lifestyle=mint,
   news=ketchup red, politics=yellow, humor=pink, culture=orange, food=cocoa-brown. */
let CATEGORY_LIST = ['education', 'lifestyle', 'news', 'politics', 'humor', 'culture', 'food'];
const CATEGORY_LOGOS = {
  education: { icon: 'school', name: 'Edukasi', badgeText: 'EDUKASI', accent: '#5B8CFF', desc: 'Tutorial & wawasan' },
  lifestyle: { icon: 'spa', name: 'Gaya Hidup', badgeText: 'GAYA HIDUP', accent: '#2FE0A8', desc: 'Keseharian & hobi' },
  news: { icon: 'newspaper', name: 'Berita', badgeText: 'BERITA', accent: '#FF4949', desc: 'Isu & tren' },
  politics: { icon: 'how_to_vote', name: 'Politik', badgeText: 'POLITIK', accent: '#FFCE00', desc: 'Opini & kebijakan' },
  humor: { icon: 'sentiment_very_satisfied', name: 'Humor', badgeText: 'HUMOR', accent: '#FF7BB8', desc: 'Meme & komedi' },
  culture: { icon: 'palette', name: 'Budaya', badgeText: 'BUDAYA', accent: '#FF8A3D', desc: 'Seni & budaya pop' },
  food: { icon: 'restaurant', name: 'Kuliner', badgeText: 'KULINER', accent: '#A9603A', desc: 'Review & resep' }
};
/* the human label of every known category, derived from the one logo table so the two can't drift */
const CATEGORY_LABELS = Object.fromEntries(Object.keys(CATEGORY_LOGOS).map(function (k) { return [k, CATEGORY_LOGOS[k].name]; }));

function categoryInfo(key) {
  /* unknown keys come straight from the API, so the fallback name is scrubbed of markup characters; the
     fallback accent is cocoa, which is why its ink has to come from inkOn() and not a fixed class */
  const safeKey = typeof key === 'string' ? key.replace(/[<>&"'`]/g, '') : '';
  return CATEGORY_LOGOS[safeKey] || { icon: 'spark', name: safeKey ? safeKey.charAt(0).toUpperCase() + safeKey.slice(1) : 'Kategori', badgeText: 'KATEGORI', accent: '#2E1E14', desc: 'Kategori konten' };
}

/* an unreachable tunnel must not hang the load forever, or the cached-payload fallback never fires */
const API_TIMEOUT_MS = 8000;

let API_DATA = { music: [], topic: [], idea: [], type: [] };
