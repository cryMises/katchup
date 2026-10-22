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
   lands (and the label table that keeps an unknown category readable). Accents/icons arrive with the home slice. */
let CATEGORY_LIST = ['education', 'lifestyle', 'news', 'politics', 'humor', 'culture', 'food'];
const CATEGORY_LABELS = {
  education: 'Edukasi',
  lifestyle: 'Gaya Hidup',
  news: 'Berita',
  politics: 'Politik',
  humor: 'Humor',
  culture: 'Budaya',
  food: 'Kuliner'
};

/* an unreachable tunnel must not hang the load forever, or the cached-payload fallback never fires */
const API_TIMEOUT_MS = 8000;

let API_DATA = { music: [], topic: [], idea: [], type: [] };
