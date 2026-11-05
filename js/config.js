const API_BASE = 'https://katchup.app.n8n.cloud/webhook/9b0c38c4-a3e7-4000-8a3b-985071c2de60/api/v1/';

let API_DATA = { music: [], topic: [], idea: [], type: [] };
let CATEGORY_LIST = [];

/* Category identity: one hue per category, reused everywhere that category shows up.
   education=blue, lifestyle=mint, news=ketchup red, politics=yellow, humor=pink, culture=orange, food=cocoa-brown. */
const CATEGORY_LOGOS = {
  education: { icon:'school',   name:'Edukasi',   badgeText:'EDUKASI',   accent:'#5B8CFF', desc:'Tutorial & wawasan' },
  lifestyle: { icon:'spa',      name:'Gaya Hidup', badgeText:'GAYA HIDUP', accent:'#2FE0A8', desc:'Keseharian & hobi' },
  news:      { icon:'newspaper',name:'Berita',    badgeText:'BERITA',    accent:'#FF4949', desc:'Isu & trending' },
  politics:  { icon:'how_to_vote', name:'Politik',badgeText:'POLITIK',   accent:'#FFCE00', desc:'Opini & kebijakan' },
  humor:     { icon:'sentiment_very_satisfied', name:'Humor', badgeText:'HUMOR', accent:'#FF7BB8', desc:'Meme & komedi' },
  culture:   { icon:'palette',  name:'Budaya',    badgeText:'BUDAYA',    accent:'#FF8A3D', desc:'Seni & budaya pop' },
  food:      { icon:'restaurant', name:'Kuliner', badgeText:'KULINER',   accent:'#A9603A', desc:'Review & resep' }
};
function categoryInfo(key) {
  /* unknown keys come straight from the API, so the fallback name is scrubbed of markup characters */
  const safeKey = typeof key === 'string' ? key.replace(/[<>&"'`]/g, '') : '';
  const known = Object.prototype.hasOwnProperty.call(CATEGORY_LOGOS, safeKey) ? CATEGORY_LOGOS[safeKey] : null;
  return known || { icon:'star', name: safeKey ? safeKey.charAt(0).toUpperCase() + safeKey.slice(1) : 'Kategori', badgeText:'KATEGORI', accent:'#2E1E14', desc:'Kategori konten' };
}
/* accents run from pale mint to cocoa itself, so pick the ink that actually reads on the fill */
function inkOn(hex) {
  const lin = [1, 3, 5].map(function (i) { return parseInt(String(hex).slice(i, i + 2), 16) / 255; })
    .map(function (v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  const L = 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  return (1.05 / (L + 0.05)) > (L + 0.05) / 0.065565 ? '#FFFFFF' : '#2E1E14';   // cocoa luminance is 0.015565
}

