# Katchup

Katchup is a content-idea radar for Indonesian creators. It turns a weekly Instagram trend scrape into
something you can act on: which format is winning, which sounds are climbing, and what to post next in each
of the seven content categories (Edukasi, Gaya Hidup, Berita, Politik, Humor, Budaya, Kuliner).

**Status:** Interface first — the data wiring and the per-view renderers are in progress.

## What works today

- Branded boot sequence (K-A-T-C-H-U-P) that hands off after 2.1s, dot-paper shell, and the four view
  containers: Ringkasan Tren, Analisis Konten, Rekomendasi Ide, Ide Tersimpan.
- Toast notifications with an optional undo action, and a screen-reader status region.
- Desktop sidebar, phone drawer, four-way view switching with 1–4 keyboard shortcuts, and per-view scroll
  memory.

## How it works

Vanilla HTML, CSS and JavaScript with no build step. Tailwind's CDN runtime supplies the utility classes;
the custom stylesheet holds the hand-drawn shell. Everything is served as static files.

The trend data comes from a weekly Instagram scrape exposed as JSON by an n8n webhook (tunnelled with
ngrok). Nothing is wired to it yet — the screen is static.

## Run it

No build step, no install. Serve the folder root:

```sh
python -m http.server 8080
```

Then open <http://localhost:8080>. A plain `file://` open works while the app is static; serving it matches how
it ships.

## Stack

- Vanilla HTML, CSS and JS; Tailwind CDN runtime plus a custom stylesheet.
- No npm, no bundler, no framework.
