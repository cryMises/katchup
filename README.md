# Katchup

**Radar ide konten untuk kreator Indonesia.** Katchup turns a weekly Instagram trend scrape into readable numbers, format comparisons, viral sounds, and ready-to-use content ideas. No feed scrolling, no spreadsheet, no build step.

Live site: **https://katchup.pages.dev/**

n8n backend: **127-node workflow** — see [`n8n/README.md`](n8n/README.md) for the automation map, public API, and import notes.

The interface is entirely in Bahasa Indonesia and lives inside a scrapbook-style PWA: cream paper, cocoa ink, sticker cards, rubber stamps, washi tape, and Ketchy the tomato mascot.

---

## Contents

- [What it does](#what-it-does)
- [Feature tour](#feature-tour)
  - [Home — Ringkasan Tren](#home--ringkasan-tren)
  - [Analytics — Analisis Konten](#analytics--analisis-konten)
  - [Ideas — Rekomendasi Ide Konten](#ideas--rekomendasi-ide-konten)
  - [Saved — Ide Tersimpan](#saved--ide-tersimpan)
  - [Ketchy — WhatsApp assistant](#ketchy--whatsapp-assistant)
  - [PWA and offline mode](#pwa-and-offline-mode)
  - [Accessibility and keyboard](#accessibility-and-keyboard)
  - [Design, sound, and motion](#design-sound-and-motion)
  - [Easter eggs](#easter-eggs)
- [Data, caching, and honesty](#data-caching-and-honesty)
- [Architecture](#architecture)
- [Data contract](#data-contract)
- [Project layout](#project-layout)
- [Run locally](#run-locally)
- [Tests and verification](#tests-and-verification)
- [Deploy](#deploy)
- [Known limitations](#known-limitations)
- [Stack](#stack)

---

## What it does

- Shows **total likes, posts, comments, and the top sound** from the current weekly scrape sample.
- Compares **Reels vs photo** across four metrics, with percentages, animated bars, and a winner badge.
- Lists the **top five viral sounds** with a playable preview when Instagram's CDN URL is still valid.
- Organises ideas into **seven categories** with engagement deltas, topic filters, and potential-like estimates.
- Gives every idea a **copyable hook**, a **save** button, and a **KONSULTASI** handoff to Ketchy on WhatsApp.
- Keeps a **device-local saved list** with production statuses, topic/status filters, share export, and clipboard import.
- Works **offline after the first visit** through a service worker, with a visible stale-data banner instead of silently pretending the data is fresh.
- Ships a **WhatsApp assistant** that answers from Katchup's post dataset, searches the live web when needed, cites its sources, and generates three ideas on demand.

No account, no sign-up, no server-side user profile. Saved ideas stay in the browser.

---

## Feature tour

### Home — Ringkasan Tren

The landing view is the weekly edition cover.

- **Scrapbook hero** with the headline **RADAR KONTEN VIRAL BUAT KREATOR INDONESIA**, an **EDISI MINGGU INI** label, and a three-step strip: **Ambil tren → Bandingkan format → Contek idenya**.
- **PANTAU TREN [2]** jumps to analytics; **CARI IDE [3]** jumps to the idea list.
- **Peel-open sticker:** click the hero card (or the keyboard-accessible **Klik buat intip** control) to peel it back and reveal **CATATAN LENGKET**, a tip pulled from the current payload. When the payload has no usable fact, a static creator tip is shown instead.
- **MULAI DARI MANA?** offers three shortcut cards, each keyboard-operable with Enter or Space:
  - **JALUR 01 — Perbandingan Reels vs Foto** → analytics.
  - **JALUR 02 — Tren 7 Kategori** → category list.
  - **JALUR 03 — Rekomendasi Ide Konten** → idea list.
- **Status line** confirms the radar is connected and states the cadence: **4 sumber data · update tiap Senin**.

A boot overlay spells **K-A-T-C-H-U-P** with a falling-letter animation and the line **“Ketchy lagi ngecek data tren dulu ya...”**. It is removed after 2.1 seconds, or immediately when reduced motion is requested.

### Analytics — Analisis Konten

#### ANGKA UTAMA

Four ledger-style KPI rows with count-up numbers:

1. **Total likes** — average likes per post, plus the Reels/photo split in millions (`jt`).
2. **Total postingan** — all sampled posts, plus the Reels/photo counts.
3. **Total komentar** — average comments per post, plus the split.
4. **Sound paling rame** — the top track name and its total likes.

> The `/type` endpoint ships one row per format per weekly scrape bucket, so these totals are **cumulative over the sampled weeks**, not a single week. The Reels/photo comparison stays honest because both sides are summed from the same rows. The UI and this README deliberately do not call the KPI totals “this week”.

#### PERBANDINGAN REELS VS FOTO

- A segmented paper tape shows the Reels and photo shares of the recorded sample.
- Four graph modes, each with `aria-pressed` state: **Konten**, **Likes**, **Komentar**, **Efisiensi** (average likes per post). **Konten** is the default.
- Four dual-bar rows: **Jumlah Postingan**, **Total Likes**, **Total Komentar**, **Rata-rata Likes per Postingan**.
- Bars animate on change and values use Indonesian formatting (`1.234.567`).
- The leader gets a **★ REELS/FOTO UNGGUL Nx** badge. With a zero on one side the copy becomes “tanpa lawan”; a 0–0 comparison shows no badge.
- The tape keeps 12% floors so a small side stays visible, splits 50/50 when both sides are empty, and goes 12/88 when one side dominates.

#### TOP 5 SOUND VIRAL

- Tracks are sorted by finite, positive `likeAmount`, de-duplicated by case-insensitive name (the highest-liked copy wins), and capped at five.
- Each card shows rank `#1`–`#5`, the sound name, a **DENGAR** / **JEDA** button with `aria-pressed`, an LED meter, total likes, and “N% dari puncak”.
- A **single shared `<audio>` element** is reused for every preview. Opening a new preview stops the previous one. This is deliberate: detached `new Audio()` objects are unreliable on iOS.
- If the API sends a missing or invalid URL, Katchup does not fake a player. It plays a short synthesised cue tone and says **“Nada cue sound #N: <name> (preview).”**
- If a real URL fails, the toast says **“Preview sound-nya nggak bisa diputar.”** and the card returns to DENGAR.
- Cached payloads blank `musicUrl` on hydrate, because Instagram CDN links carry an `oe=` expiry of roughly four days — shorter than the seven-day cache.

### Ideas — Rekomendasi Ide Konten

#### Seven categories

The category carousel is built from the payload but always uses this identity set:

| Key | Label | Tagline | Accent |
|---|---|---|---|
| `education` | Edukasi | Tutorial & wawasan | blue `#5B8CFF` |
| `lifestyle` | Gaya Hidup | Keseharian & hobi | mint `#2FE0A8` |
| `news` | Berita | Isu & trending | red `#FF4949` |
| `politics` | Politik | Opini & kebijakan | yellow `#FFCE00` |
| `humor` | Humor | Meme & komedi | pink `#FF7BB8` |
| `culture` | Budaya | Seni & budaya pop | orange `#FF8A3D` |
| `food` | Kuliner | Review & resep | brown `#A9603A` |

Each cartridge card shows **Perubahan likes / views / komentar** with signed percentages and ▲/▼ arrows. Missing values become `0`, not `NaN`. Selecting a card sets the category accent, icon, and title; **the card check mark is always in the DOM**, only revealed by CSS, so it cannot get stuck after the first pick. Unknown category keys fall back to a safe “Kategori” label and cocoa accent.

The header reads **“<KATEGORI> · DAFTAR IDE”**, with the note **“Urut dari potensi likes”**.

#### Finding an idea

- **Quick topic chips** show the six most frequent topics in the active category. Tap one to filter, tap it again to clear. Chips are `aria-pressed`, at least 24px tall, and long tokens wrap instead of stretching the layout.
- The active-filter button **HAPUS FILTER** appears only when a topic is selected.
- The status line reads **“TERSEDIA: N IDE · <KATEGORI>”**.
- Tickets are sorted by estimated likes, highest first, and numbered `#01`, `#02`, …
- Rank 1 gets the holo **PALING VIRAL** seal. The rest draw from a shuffled 14-stamp deck: SIAP CONTEK, COCOK BUAT FYP, POTENSI RAME, BANYAK DICARI, JUDUL JITU, GAMPANG DIBIKIN, IDE SEGAR, AUDIENS NYANGKUT, TIMING PAS, WORTH DICOBA, PAS BUAT PEMULA, BISA MELEDAK, COCOK BUAT BRAND, BETAH DITONTON. Stamps do not repeat inside one view; the deck only reshuffles when the visible set changes.
- Every ticket shows the quoted hook, **POTENSI LIKES**, up to four topic chips, the category, and three actions:
  - **SIMPAN / TERSIMPAN** — toggles the local saved list and announces state with `aria-pressed`.
  - **KONSULTASI** — opens `wa.me/6281317778242` with `/hi Halo Ketchy, mau bahas ide konten ini: <hook>` prefilled.
  - **SALIN HOOK** — copies the hook with the Clipboard API and a legacy `textarea` fallback. The label flips to **TERSALIN** for 1.6 seconds, then restores from its snapshotted idle label (never from the temporary text). Success toast: **“Hook-nya udah nyangkut di clipboard.”**
- If a topic filter has no matches, the empty state names the topic and offers HAPUS FILTER.
- If no categories loaded at all, the carousel says to press **PERBARUI** to retry.

### Saved — Ide Tersimpan

The saved view is **device-local**. There is no account, sync, or backend write. It lives under the `katchup_saved` localStorage key and is capped at **100 ideas**; saving past the cap drops the oldest and says so.

Each saved snapshot stores the category, idea text, estimated likes, topics, saved timestamp, and a production status. The key is `contentType|lowercased-hook`, so a duplicate idea cannot be saved twice.

#### Production status

| Status | Label | Active chip |
|---|---|---|
| `belum` | BELUM DIBUAT | yellow |
| `dibuat` | LAGI DIBUAT | blue |
| `tayang` | SUDAH TAYANG | mint |

- Status is a three-button **labelled toggle group**; the active status cannot be toggled off, only changed.
- A legacy, unknown, or prototype-key status normalises to `belum`.
- Changing a status persists it in localStorage and returns focus to the matching chip after the re-render.
- Status is device-local, so BAGIKAN/TEMPEL never include it.

#### Filters and empty states

- The status filter row is a labelled group with **SEMUA · n** plus the three status counts. It hides when the list is empty.
- Counts follow the **topic** filter, not the status filter, so switching status does not change the numbers.
- The topic filter is shared with the Ideas view. The saved list applies topic first, then status.
- First-use empty state: Ketchy, **“Belum ada ide tersimpan”**, and a **CARI IDE [3]** button.
- Filtered-empty state names the active filters and offers **HAPUS FILTER**, which resets both filters and returns focus to the status row.
- When every saved idea is `tayang` and no filter is active, a **“Semua ide sudah tayang”** banner appears **above** the cards, with **CARI IDE [3]**.

Each saved card shows a **DISIMPAN** stamp, how long ago it was saved, its status chips, and the same copy/consult/save actions. Unsaving from this view offers an **URUNGKAN** toast action that restores the idea at its original index, still respecting the 100 cap.

#### BAGIKAN and TEMPEL

**BAGIKAN** exports plain text so it can be pasted into WhatsApp or Notes:

```text
Ide konten dari Katchup:

1. "hook" — 1.234 potensi likes (Humor)
2. "hook lain" — 5.678 potensi likes (Kuliner)
```

- It prefers `navigator.share`. Closing the share sheet (`AbortError`) stays silent; any other share failure falls back to the clipboard.
- Success toast: **“Semua ide tersalin ke clipboard.”**
- Header and blank lines are not part of the import format.

**TEMPEL** reads the clipboard and accepts that same format:

- Rejects the header and blank lines.
- Strips numbering, understands em/en/hyphen dashes, optional “potensi likes”, quoted or unquoted hooks, and a category label (mapped back to its key).
- De-duplicates against existing rows and within the pasted batch.
- Imported ideas start as `belum`, get `topics: ''`, and are prepended so the first pasted line stays on top.
- Both filters are cleared after import, so the new ideas are visible.
- The 100-item cap announces how many oldest ideas were dropped.
- Empty clipboard: **“Nggak ada ide baru di clipboard.”** Clipboard permission denied: **“Izinkan akses clipboard dulu ya.”**

### Ketchy — WhatsApp assistant

Ketchy is the creator-facing assistant reachable from every **KONSULTASI** button. The assistant is functional, but public WhatsApp availability is still limited; the app handoff is the intended entry point.

| Command | What it does |
|---|---|
| `/hi` | Starts a chat session and resets conversation memory. |
| `/stop` | Ends the session. |
| `/help` | Lists every command and the credit rules. |
| `/status` | Shows the current session number, status, and remaining chat credits. |
| `/idea <topik>` | Generates three content ideas for a topic and saves them to Ketchy's idea history. |

Anything that is not a slash command is normal chat. Sending chat text without an active session returns **“Sesi belum aktif. Kirim /hi untuk mulai chat, /help untuk lihat perintah.”** Unknown slash commands return **“Perintah tidak dikenal. Ketik /help untuk lihat daftar perintah.”**

**Credits**

- Each session starts with **10 chat credits**, refilled every six hours.
- A successful chat turn or `/idea` costs one credit.
- Failures do not charge: the assistant's error branch replies that the credit was not deducted, and the credit update only decrements when the assistant produced a response.
- An `/idea` request with no topic costs nothing and returns **“Tulis topiknya ya. Contoh: /idea kuliner rumahan”**.

**`/idea`**

- Builds three ideas from the weekly trend data, using per-category medians and maxima.
- Estimates are clamped to `min(1.5 × category max, 5 × category median)` so a single outlier cannot produce a fantasy like 15 million likes.
- Each idea includes a hook, category, topic tags, and an estimated like count.
- The reply is numbered, uses Indonesian number formatting, and ends with **“Ide disimpan di riwayat Ketchy kamu.”** — not “dashboard”, because Ketchy writes to its own n8n `chatIdeas` table while the site dashboard still reads `contentIdeas`.

**Chat**

- Answers from an internal dataset of 114 real post examples, with category, sentiment, topics, and engagement.
- Also has live web search (**Tavily**) for current news, trends, formats, and fact-checking.
- Routes between the two: internal data for Katchup performance questions, live search for recency.
- When web search is used, the prompt requires a **`Sumber:`** list with 1–3 real URLs from the search results. It must never invent or alter a URL.
- If web search fails or returns nothing useful, Ketchy says it could not verify live and answers from internal data or general knowledge instead.
- The system prompt includes the runtime date, so “this week” means the actual current week.
- All replies are in the user's language and tone, defaulting to Indonesian WhatsApp style.

Backend webhook: `POST https://katchup.app.n8n.cloud/webhook/api/v1/chat` with `{from, text}` → `{reply}`.

### PWA and offline mode

- **Installable**: manifest name **Katchup — Radar Ide Konten Kreator Indonesia**, standalone display, cream theme, 192/512 icons (including maskable), and an Apple touch icon.
- **Install CTAs** appear in the sidebar and the mobile bottom nav only when installation is possible. On iOS, where `beforeinstallprompt` does not exist, the button relabels to **CARA PASANG** and shows the Share → **Tambah ke Layar Utama** instructions.
- **Service worker** (`sw.js`):
  - App shell uses stale-while-revalidate: the cached page loads immediately, then refreshes in the background.
  - API requests are network-only. Offline API calls return a synthetic JSON 503 (`{error: 'offline', message: 'Tidak ada koneksi internet.'}`), matching the app's offline copy.
  - `Range` requests and non-allowlisted cross-origin requests bypass the worker, which keeps iOS Safari audio playback working.
  - Runtime caching only stores successful, non-opaque, non-redirected responses.
  - Navigation requests fall back to the cached app root.
  - Install adds each shell URL individually with `add().catch()`, never `addAll`, so one blocked CDN cannot abort the entire installation.
  - Activation prunes only caches whose names start with `katchup-`.
  - Tailwind, the three font families, and the subset Material Symbols stylesheet are cached as exact external URLs. New icons must be added to both `index.html` and `sw.js`.
- **Offline behaviour**: if the network fails but a cached payload exists, the app renders it and shows **“Data tersimpan · <time>”** with a **COBA LAGI** button. The timestamp ticks forward each minute. A successful refresh clears the banner.
- Saved ideas remain reachable while offline because they never depend on the API.

### Accessibility and keyboard

- One `<main>` landmark contains four `<section>` view panels; no nested mains.
- A **skip link** jumps to the content area.
- The closed mobile drawer uses `inert`, so its links cannot be tabbed into.
- Live regions announce loading, ready, error, filter results, the current view title, and toasts. Failure toasts switch to `aria-live="assertive"`.
- Category cards and the three JALUR shortcuts are real keyboard targets (`role="button"`, `tabindex="0"`, Enter/Space) with `aria-pressed` where selection applies. Chips, graph modes, DENGAR, and SIMPAN expose `aria-pressed` too.
- Focus returns to the relevant status chip after a status change, and to the status filter row after a filtered-empty reset.
- Tap targets are at least 24px; the mobile menu button is 44px.
- Colour is never the only signal: deltas use ▲/▼, statuses use text labels, and active states use fills plus text.
- Text on accent fills uses `inkOn()` to pick white or cocoa. Accent-coloured text always uses a darker `*-ink` variant for AA contrast.
- Long unbroken API tokens wrap instead of forcing horizontal scroll.
- `prefers-reduced-motion` removes reveals, boot animation, carousel smoothing, dust, and other non-essential motion.

**Keyboard shortcuts** (ignored inside inputs, textareas, selects, contenteditable, or with Ctrl/Cmd/Alt):

| Key | Action |
|---|---|
| `1` | Home |
| `2` | Analytics |
| `3` | Ideas |
| `4` | Saved |
| `R` | Refresh data |
| `M` | Mute/unmute interface sounds |
| `Esc` | Close the mobile drawer and return focus to the menu button |

### Design, sound, and motion

The visual system is a physical scrapbook, not a dashboard template:

- Cream paper, cocoa ink, red/yellow/mint/blue/pink/orange “pop” accents.
- **Baloo 2** for headlines, **Nunito** for body copy, **Permanent Marker** for marker-style section titles.
- Dot-grid paper, torn edges, sticker cards, washi tape, rubber stamps, keycap buttons, ledger rows, and hand-drawn inline-SVG doodles.
- **Ketchy** is a four-frame tomato flipbook. Every Ketchy instance needs all four flip frames, and the test-pinned `.ketchy.slow` alias must stay.
- A four-frame flipbook, a scanner bar, and staggered letter drops cover loading and boot states only; nothing loops forever except the opt-in easter eggs. The loading scanner runs three passes, then rests.
- List items cascade with `.pop-in` and an `--i` index inside a `[data-reveal]` section. The CSS animation fill is removed on `animationend`, so hover and press transforms still work afterwards.
- Sounds are synthesised with the Web Audio API — no audio files. Mechanical clicks, cue tones, patch-cord snaps, and stamp thuds are generated on demand. Audio is muted by preference (`katchup_audio_mute`) and the context resumes only after a user gesture.
- The LED meter is shared between analytics and sound cards. Passing `null` as the active class lets unlit segments run mint → yellow → red by position; the music list must not hardcode a per-position tint.

### Easter eggs

There are three, all marked `PRANK` in the source and safe to delete:

1. **Tomato peeker** — Ketchy peeks over the bottom edge every 7.5–13.5 seconds with a random quip. Clicking (or pressing Enter/Space on) him makes him fall, plays a thud, says **“Plop! Ketchy kepleset 🍅”**, and toggles an **opt-in tomato cursor** stored under `katchup_tomato_cursor_on`. The peeker pauses in hidden tabs and is disabled under reduced motion.
2. **Ketchup rain** — the **!!** button rains 16 tomato bottles. Clicking every bottle plucks it, plays an ascending note, and leaves a splat. Clearing all 16 manually reveals a **FAKTA RADAR** card computed from the loaded payload: Reels share, average likes per post, top sound, biggest rising category, or likes per comment. **BERSIHKAN** sweeps the mess but deliberately skips the fact. This prank is pointer-only by design, and the fact is never hardcoded.
3. **Peel-open hero sticker** — the home hero cover described above. Its keyboard control is the **Klik buat intip** button; the wrapper itself is pointer-only because it contains real buttons.

---

## Data, caching, and honesty

Katchup's data arrives from a weekly Instagram scrape that runs **Mondays**. It is not a real-time feed.

- The app shows **fetch time**, labelled **“ditarik”**, never “diperbarui”. The scrape payload has no reliable scrape timestamp, so claiming a scrape time would be dishonest.
- Copy states the cadence (**“update tiap Senin”**) rather than a fabricated “today” date.
- The hero says **EDISI MINGGU INI**, not “24 jam” or “baru diperbarui”.
- Four endpoints (`/topic`, `/idea`, `/music`, `/type`) are fetched **in parallel** with an **8-second** timeout and the `ngrok-skip-browser-warning` header.
- A response must be both `res.ok` **and** `application/json`. Malformed JSON enters the same error/cache path as a network failure.
- An empty success is rejected. If no post has a non-empty `contentIdea` and no `/type` row is `video` or `imageAndSidecar`, the app throws **“Server datanya balas kosong. Coba lagi sebentar ya.”** instead of showing “TERHUBUNG” over empty views.
- Successful payloads are cached in `katchup_data_cache` as `{v: 1, fetchedAt, data}` with a **seven-day TTL**.
- Cached data is only used from the two failure paths: initial load with nothing on screen, and refresh when nothing is already showing. A cache hit never overwrites fresher on-screen data.
- The cache hydrates as **stale** and shows the banner. It blanks `musicUrl` because Instagram's signed CDN links expire before the cache does.
- Failed refreshes keep the last good data and toast **“Gagal memperbarui. Masih pakai data terakhir.”**
- KPI totals are cumulative over the sampled scrape buckets, as explained above. Both format bars use the same rows, so the ratio is honest even though the totals are not weekly.
- Numbers are formatted with `Intl.NumberFormat('id-ID')`: `1.234.567`, with one decimal where needed.
- The app has **no account system, no user tracking, and no analytics dashboard**. No user counts, growth numbers, testimonials, or press claims are fabricated anywhere.

---

## Architecture

Katchup is a static PWA with **no build step, no bundler, no package manager, and no framework**. Everything is plain HTML, CSS, and JavaScript loaded as globals in dependency order.

- `index.html` contains all markup, one guarded Tailwind CDN config (`if (window.tailwind)`), one inline SVG sprite, and the script/style includes.
- **Tailwind CDN** provides utilities at runtime. Local CSS owns the design system: tokens, components, views, analytics, motion, and two prank stylesheets.
- Fifteen JavaScript files share the global scope: config, utils, audio, data, nav, ui, analytics, music, home, ideas, saved, share, viewstate, pranks, app.
- The fetch layer runs the four endpoints in parallel and normalises the payload before any view renders.
- A single `<audio>` element is attached to the document and reused for all track previews.
- The service worker precaches the shell and handles offline API responses.
- `verify.js` parses every script and checks referenced assets, duplicate IDs, inline handlers, and `getElementById` targets before a commit.
- The backend is an n8n workflow that serves the four data endpoints and the Ketchy chat webhook. There is no application server in this repository.

### Rendering and state

- `renderAll()` is the single payload-swap render path; it stops music before replacing data.
- View state remembers scroll position per view, but only jumps when the view actually changes.
- `_ticketIndex` maps a composite ticket key to its item/category so buttons in hidden views can still resolve. It is pruned after every list render and never cleared wholesale.
- Inline handlers prefer `data-*` attributes plus `this` over embedding API strings in JavaScript literals.
- Escaping is layered: `escapeHtml` for markup/text, `escapeJsArg` for values inside an inline handler, and `escapeJsString` for line terminators inside generated strings.

---

## Data contract

The frontend expects four endpoints under `API_BASE`:

| Endpoint | Shape |
|---|---|
| `/idea` | `{ idea: [{ contentType, posts: [{ contentIdea, estimatedLike, topics, ... }] }] }` |
| `/type` | `{ type: [{ type: "video" / "imageAndSidecar", count, likeAmount, commentAmount }] }` |
| `/music` | `{ music: [{ id, name, likeAmount, musicUrl? }] }` |
| `/topic` | `{ topic: [{ ...engagement deltas }] }` — only `topic[0]` is read |

`API_BASE` is hardcoded at the top of `js/config.js` and points at the n8n Cloud webhook. There is no environment-file loader.

`baseTimeStamp` and `comparedTo` are intentionally unused: no trustworthy scrape timestamp exists, so freshness is the fetch time.

The four data endpoints and the chat endpoint are separate webhooks on the same n8n instance.

---

## Project layout

```text
katchup/
├─ index.html            # all markup, one inline Tailwind config, SVG sprite
├─ css/
│  ├─ tokens.css         # colours, type, shadows, motion easings
│  ├─ components.css     # stickers, stamps, keycaps, tape, ledger, toast, boot
│  ├─ views.css          # page and card layout
│  ├─ motion.css         # reveals, cascades, pop-in
│  ├─ analytics.css      # KPI ledgers, comparison bars, sound cards
│  ├─ pranks.css         # ketchup rain
│  └─ pranks-peeker.css  # edge tomato peeker
├─ js/
│  ├─ config.js          # API base, category logos, inkOn
│  ├─ utils.js           # formatting, escaping, helpers
│  ├─ audio.js           # Web Audio cues and LED meter
│  ├─ data.js            # parallel fetch, validation, cache
│  ├─ nav.js             # views, drawer, shortcuts
│  ├─ ui.js              # toast, boot, live regions
│  ├─ analytics.js       # KPIs, format comparison
│  ├─ music.js           # top sounds and previews
│  ├─ home.js            # hero, JALUR cards, tip engine
│  ├─ ideas.js           # categories, topics, tickets
│  ├─ saved.js           # local saved list, statuses, import/export
│  ├─ share.js           # clipboard and share fallbacks
│  ├─ viewstate.js       # scroll and view state
│  ├─ pranks.js          # tomato peeker, ketchup rain, facts
│  └─ app.js             # boot and orchestration
├─ icons/                # app icons and 1200×1200 OG cover
├─ manifest.json
├─ sw.js
├─ vercel.json           # static security headers only
├─ robots.txt
├─ sitemap.xml
├─ 404.html
├─ verify.js
└─ README.md
```

---

## Run locally

There is nothing to install. From the workspace root that contains `katchup/`:

```bash
python -m http.server 8080 -d katchup
```

Then open `http://localhost:8080`.

Use an HTTP origin, not `file://`. The service worker and cross-origin fetch both need a real origin. Any static server works; Python is just the shortest path.

No environment variables, build command, or config file are required.

---

## Tests and verification

The test suite lives next to the app repo, in the development workspace's `tests/` directory. It is not part of the deployed app.

```bash
# From the workspace root
node tests/check_katchup.js   # static invariants, copy, IDs, service worker, manifest, headers
node tests/smoke.js           # Playwright smoke test; skips if Playwright is unavailable
```

`tests/check_katchup.js` concatenates `index.html` plus every CSS/JS file and asserts the project's invariants: required symbols, IDs, exact Indonesian copy, service-worker behaviour, cache rules, and deploy metadata. It also executes several pure helpers in isolation: `fmtAgo`, `inkOn`, `escapeJsString`, the category/cartridge parsers, `savedStatus`, and `bestTopicDelta`.

Before committing, verify the working tree:

```bash
cd katchup
node verify.js .
```

`verify.js` checks that every referenced CSS/JS file exists, every script parses, IDs are unique, inline handlers resolve, and every `getElementById` target exists. It also requires exactly one inline script and no `<style>` block in `index.html`.

A bare `node verify.js` without `.` validates every commit reachable from `HEAD` instead, which is much slower.

---

## Deploy

Deploy the **`katchup/` directory**, not the workspace root. The workspace root contains tests, tooling, and agent instructions that must not be published.

- Vercel preset: **Other**
- Build command: **none**
- Output directory: **`.`**
- Static headers: `vercel.json`
- Production: **https://katchup.pages.dev/**

`vercel.json` sets `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`, and a restrictive `Permissions-Policy` (camera, microphone, and geolocation disabled).

The production URL is intentionally hardcoded in `index.html` (canonical, Open Graph, Twitter), `robots.txt`, and `sitemap.xml`. Change them together if the domain changes.

---

## Known limitations

- **Ketchy is not publicly launched.** The WhatsApp endpoint works and the app can hand off an idea, but the number is not broadly announced yet.
- **Ketchy's `/idea` history is separate from the site dashboard.** Ideas go to the n8n `chatIdeas` table; the dashboard still reads `contentIdeas`. Until those are connected, Ketchy says “riwayat Ketchy”, not “dashboard”.
- **Saved ideas are per-device.** No account, no sync; clearing browser storage clears the list. The 100-item cap is enforced silently apart from the toast.
- **Data is weekly, not live.** The scrape runs on Mondays. The UI reports fetch time and never claims real-time freshness.
- **KPI totals span the sampled weeks.** They are not a single-week sum, and the copy is careful about that.
- **Sound previews expire.** Instagram CDN URLs stop working after roughly four days; cached payloads deliberately drop them rather than serve dead links.
- **Chat has a hard credit budget.** Ten credits per session, refilled every six hours. Successful chat turns and `/idea` calls cost one; failures do not.
- **A hung model call can time out.** The chat and `/idea` pipelines depend on a hosted model; a stalled call can exceed the webhook timeout. Retrying is the only client-side remedy.
- **No analytics or user accounts.** There is no backend profile, no cross-device history, and no usage tracking.

---

## Stack

- **HTML/CSS/JavaScript** — no framework, no bundler, no npm, no build.
- **Tailwind CSS** via CDN, plus a hand-written local design system.
- **n8n** for the weekly scrape pipeline, the four data endpoints, and the Ketchy chat workflow.
- **Google Gemini** for Ketchy's chat and structured idea generation.
- **Tavily** for live web search and source citations.
- **WhatsApp** as the assistant's delivery channel.
- **Service worker + Web App Manifest** for installability and offline support.
- **Vercel** for static hosting.

---

Made for Indonesian creators who would rather post than scroll.
