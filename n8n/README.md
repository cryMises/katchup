# Katchup n8n backend

Katchup is a weekly Instagram trend radar for Indonesian creators. A vanilla PWA shows the trends; this n8n workflow is the backend that scrapes, normalises, embeds, and explains them. There is no sign-up and no server-side user profile.

- PWA: <https://katchup.pages.dev/>
- Live workflow (Azure n8n): <https://crymises.indonesiacentral.cloudapp.azure.com/workflow/0ZNdygLZw2IqStVI>
- Workflow export: [`KATCHUP.json`](./KATCHUP.json)

> The n8n editor link requires an account on this Azure instance. If you don't have one, open the export above and import it into any n8n instance, or use the tables below.

## What the workflow does

1. **Weekly scrape** — every Monday at 11:00 WIB, Apify's Instagram hashtag scraper collects up to 20 posts for each of 20 Indonesian creator hashtags.
2. **Normalise and store** — posts are filtered, mapped, and written to `trendingPostData`; engagement snapshots go to `trendItems`, format stats to `postTypeTrend`, and sounds to `musicTrend`.
3. **Embed for retrieval** — Cohere embeddings and a Supabase pgvector store index the post text. The chat agent and idea generator use this as their knowledge base.
4. **Explain the week** — Gemini agents turn the numbers into `trendData` (sentiment, topics, baseline engagement) and, every day at 13:00 WIB, into `contentIdeas` with predicted likes.
5. **Serve the PWA** — four public GET endpoints return music, ideas, topics, and format comparisons. The PWA reads these directly.
6. **Answer on WhatsApp** — `POST /api/v1/chat` runs Ketchy: user/session lookup, credit handling, Gemini chat with vector context, Tavily web search, and a short reply. Commands include `/hi`, `/katchup`, `/idea`, `/status`, `/help`, and `/stop`.

## Shape of the build

| Item | Count |
| --- | --- |
| Nodes | 127 |
| Connections | 143 |
| Data tables | 8 |
| Schedule triggers | 4 |
| Webhooks | 2 |

The workflow is organised as five lanes: weekly scrape, weekly analysis, daily ideas, public API, and WhatsApp chat. Node groups are kept on the canvas so the lanes are readable.

### Data tables

| Table | Purpose |
| --- | --- |
| `trendingPostData` | Raw scraped posts: type, caption, hashtag, music, likes, comments, views. |
| `trendData` | AI-written trend summaries and engagement baselines. |
| `trendItems` | Weekly engagement snapshots per content type. |
| `musicTrend` | Top sounds, like counts, and Instagram CDN preview URLs. |
| `postTypeTrend` | Reels vs photo stats: likes, comments, averages, counts. |
| `contentIdeas` | Generated content ideas with format, topic, and estimated likes. |
| `katchupUsers` | WhatsApp session, credit, and stop state. |
| `chatIdeas` | Ideas created inside the WhatsApp conversation. |

### Integrations

Apify (Instagram scrape), Supabase (pgvector store), Cohere (embeddings), Google Gemini (chat and generation), Tavily (live web search). All secrets live in n8n credentials, never in this repository.

## Public API

After publishing, the PWA endpoints are:

```text
GET /webhook/206a41d7-4e11-4f83-8450-53e8dd140133/api/v1/music
GET /webhook/206a41d7-4e11-4f83-8450-53e8dd140133/api/v1/idea
GET /webhook/206a41d7-4e11-4f83-8450-53e8dd140133/api/v1/topic
GET /webhook/206a41d7-4e11-4f83-8450-53e8dd140133/api/v1/type
```

Chat:

```text
POST /webhook/api/v1/chat
Content-Type: application/json

{"from":"62812...","text":"/idea","pushName":"Optional"}
```

The four data endpoints read the shared tables. The Azure instance linked above is populated with the source data, so the endpoints return real JSON. A fresh import starts with empty tables and returns HTTP 200 with an empty payload until the first Monday scrape (or until rows are imported manually).

## Import and deploy

1. Import `KATCHUP.json` into n8n.
2. Create the eight data tables above in the target project, then re-point every Data Table node to the new table IDs. The export contains the original instance's IDs.
3. Attach credentials for Apify, Supabase, Cohere, Google Gemini (six accounts are used by the model selector), and Tavily.
4. Set the workflow timezone to `Asia/Jakarta`. The four schedules depend on WIB.
5. Publish the workflow. Production webhook URLs only exist after publishing.
6. Point the PWA at the new backend by changing `API_BASE` in `js/config.js` to the published webhook base.

The Azure instance linked above has already been imported, reconnected, and published. Its webhook IDs differ from the source export because n8n regenerates them on import.

## Verification

- Source workflow: 288 successful production runs before export.
- Azure import: 127 nodes, 143 connections, 8 data tables, 0 new validation warnings, published.
- Azure data: 1,393 real rows imported from the source instance — 381 posts, 837 trend rows, 91 engagement snapshots, 32 sounds, 14 format rows, 35 ideas, and 3 real chat ideas. Twelve `probe:` test rows were excluded.
- Public API: all four GET endpoints returned HTTP 200 with real JSON.
- Chat: `/help` and `/status` returned the expected text; `/hi` completed a full AI turn and returned a Ketchy reply. The test user was removed afterwards.
- Data table audit: all 35 Data Table nodes resolve to the new tables; all 27 credential-bearing nodes have credentials attached.

## Limitations

- The scrape runs **weekly on Monday**, so the data is not real-time. The PWA labels it as a weekly edition.
- Instagram music URLs expire after roughly four days. The UI handles a dead preview; the trend numbers remain valid.
- AI generation and the Apify actor cost money. The scrape actor is capped at **$1.10 per run**.
- The public data endpoints are intentionally unauthenticated. The chat endpoint identifies users by the WhatsApp `from` value; it is not a login system.
- A fresh import starts with empty tables. The live Azure instance is populated from the source, but the row data itself is not committed to this repository.
- The checked-in PWA points at the Azure backend in `js/config.js`; a fresh import must update `API_BASE` to the new webhook base.

## Repository layout

```text
n8n/
  KATCHUP.json   # n8n workflow export
  README.md      # this file
```

The rest of the repository is the static PWA. See the root [`README.md`](../README.md) for the product, design, and frontend details.
