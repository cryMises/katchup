# Katchup

Katchup is a content-idea radar for Indonesian creators. It turns a weekly Instagram trend scrape into
something you can act on: which format is winning, which sounds are climbing, and what to post next in each
of the seven content categories (Edukasi, Gaya Hidup, Berita, Politik, Humor, Budaya, Kuliner).

**Status:** Saved ideas are live; PWA packaging is in progress.

## What works today

- Branded boot sequence (K-A-T-C-H-U-P) that hands off after 2.1s, dot-paper shell, and the four view
  containers: Ringkasan Tren, Analisis Konten, Rekomendasi Ide, Ide Tersimpan.
- Toast notifications with an optional undo action, a screen-reader status region, and reduced-motion-aware
  entrances.
- Desktop sidebar, phone drawer, four-way view switching with 1–4 keyboard shortcuts, and per-view scroll
  memory.
- Shared helpers for `id-ID` numbers and HTML/JS escaping, so API text is never trusted as markup.
- Live payload from four endpoints fetched in parallel, status and content type checked, the last good
  payload cached for seven days, and stale data labelled as such.
- KPI strip, Reels-vs-photo split, and per-format totals from the sampled weekly scrapes.
- Synthesised UI sounds — no audio assets — with a mute switch that survives reloads.
- Top-5 sounds by likes with an inline preview player; tracks without a playable URL fall back to an
  honest cue tone instead of pretending.
- Ranked idea tickets per category, topic chips that filter the list, and one-tap copy of the hook.
- Home: hero, the category picker that drives the idea list, and JALUR shortcuts into the other views.
- A weekly category fact computed from the payload, not hardcoded.
- On-device saved ideas with an undoable unstar and a 100-hook cap that says what it dropped.
- Ide Tersimpan view, sharing the same topic filter as the idea list.
- BAGIKAN exports the saved list as plain text and TEMPEL reads it back, so the list survives a new phone.

## How it works

The frontend is a vanilla HTML/JS dashboard that reads JSON from a weekly Instagram scrape exposed by an
n8n webhook (tunnelled with ngrok). No framework, no bundler: the browser gets the files as they are.

Requests run in parallel with an 8-second deadline and validate both status and content type. The last
good payload is kept in localStorage for seven days, so a failed fetch renders known data behind a
"data tersimpan" banner instead of an error screen. The scrape runs weekly (Mondays), so the UI reports the
fetch time as *ditarik* and states the cadence; it never implies the numbers are hours old.

| Endpoint | Purpose |
|---|---|
| `/topic` | Engagement deltas per category between weekly scrapes |
| `/idea` | Content ideas grouped by category |
| `/music` | Top tracks by total likes |
| `/type` | Video vs. image/carousel aggregates |

## Run it

No build step, no install. Serve the folder root:

```sh
python -m http.server 8080
```

Then open <http://localhost:8080>. Serving matters: the data fetch needs an http origin, `file://` will not do.

## Stack

- Vanilla HTML, CSS and JS; Tailwind CDN runtime plus a custom stylesheet.
- No npm, no bundler, no framework.
- Web Audio for the UI sounds — synthesised at runtime, no audio files.
- localStorage for the payload cache and the saved-ideas list.
