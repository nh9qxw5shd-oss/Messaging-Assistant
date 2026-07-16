# Messaging Assistant v5

Operational messaging tool for the East Midlands Control Centre. Builds structured WhatsApp and Teams messages from form inputs across five daily message types.

## Stack

- **Next.js 14** (App Router) — Vercel-hosted
- **TypeScript** (strict)
- **Tailwind CSS** — Insight design system
- **Zustand** — client state + localStorage persistence
- **Supabase** — target periods and seasonal templates (optional; graceful fallback to defaults)

---

## Getting started

### 1. Clone and install

```bash
git clone <repo-url>
cd messaging-assistant
npm install
```

### 2. Environment variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |
| `NEXT_PUBLIC_APP_URL` | Absolute URL of the deployed app (for Teams banner images) |
| `RDM_API_KEY` | Rail Data Marketplace consumer key for the live performance feed (server-side only) |
| `RDM_API_BASE` | Optional override of the RDM data product base URL |

If Supabase variables are omitted the app runs fully offline using built-in defaults. If `RDM_API_KEY` is omitted the live performance feed shows an error and performance values are entered manually, as before.

### 3. Supabase setup

Run the migration against your existing Supabase project. All tables are prefixed `ma_` — no existing data is touched.

In the Supabase dashboard → SQL Editor, paste and run:

```
supabase/migrations/001_messaging_assistant_init.sql
```

Or use the Supabase CLI:

```bash
supabase db push
```

### 4. Add banner images

Drop your banner PNG files into `public/banners/`:

| File | Used for |
|---|---|
| `sos.png` | Start of Service |
| `strategic.png` | Strategic AM and PM |
| `tactical.png` | Tactical (SoTN) |

These are served as static assets. For Teams rich copy to work correctly, set `NEXT_PUBLIC_APP_URL` to your Vercel deployment URL so the `<img src>` is absolute.

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment (Vercel)

1. Push to GitHub
2. Import the repo in Vercel
3. Add environment variables in Vercel project settings
4. Deploy

---

## Live performance data (NWR Rail Data Marketplace)

The tactical Route Performance table is auto-filled from the **NWR Realtime Performance Data Experience API** (RDM product 1033). While the app is open it polls `/api/performance` every 2 minutes and writes the current figures into the matching metrics by name:

| Metric name | Source |
|---|---|
| `Route T3 %` | stop-weighted aggregate of `performanceData/RTOTM/route/East_Midlands` |
| `EMR T3 %`, `EMR Can %` | `performanceData/RTOTM/toc/28` (`punctuality.timeTo3.percent` / `reliability.percent`) |
| `GTR T3 %` | `performanceData/RTOTM/toc/88` (`punctuality.timeTo3.percent`) |
| `XC T3 %` | `performanceData/RTOTM/toc/27` (`punctuality.timeTo3.percent`) |

TOC figures are whole-TOC totals read straight from the TOC endpoints — aggregating them from the route payload instead would only cover each operator's stops on this route, which reads a point or two off the TOC-wide figure on the live performance pages. The route payload has no ready-made total, so `Route T3 %` is computed as a stop-weighted aggregate (`Σ timeTo3.count / Σ totalStops`). Route names use underscores (`East_Midlands` — spaces cause a backend 500), and TOC codes are numeric business codes: `27` = CrossCountry, `28` = East Midlands Railway, `88` = Thameslink/GTR.

Matching is by metric name (case/whitespace-insensitive), so the names in **Targets & Thresholds** (and `ma_targets` in Supabase) must stay aligned with the mapping in `src/lib/rdm/config.ts`.

### How it works

- `src/app/api/performance/route.ts` — server-side proxy. The RDM consumer key never reaches the browser; responses are cached in memory for 60 s so extra tabs/users don't multiply RDM calls. The RDM gateway enforces spike arrest (4 requests/second, smoothed), so sources are fetched sequentially with a 350 ms gap and 429s are retried with backoff.
- `src/lib/rdm/config.ts` — endpoints, operator matching, metric mapping, poll interval. **This is the only file to touch** if a route name, operator, or response field needs correcting.
- `src/lib/rdm/aggregate.ts` — stop-weighted T-3 aggregation over the route payload's stanox/operator breakdown; each value reports its provenance (e.g. `aggregate: 41/52 stops in T3 across 17 stanoxes`).
- `src/lib/rdm/parse.ts` — locates the cancellations figure in a payload by key name, tolerant of schema differences (including `{count, percent}` blocks). Each value reports the field path it was read from.
- `src/lib/rdm/livePerfClient.ts` — 2-minute poller, visibility-aware (hidden tabs skip ticks and refresh when re-focused).
- A status bar above the tactical perf table shows live/paused/error state and last-update time, with **Pause** (stop auto-filling, revert to manual entry) and **Refresh** controls. While the feed is live, fetched values overwrite manual edits on each poll.

### Setup

1. Subscribe to the data product on [raildata.org.uk](https://raildata.org.uk) and copy the **Consumer key** from the API access credentials page.
2. Locally: put it in `.env.local` as `RDM_API_KEY`. Deployed: add `RDM_API_KEY` in Vercel → Project → Settings → Environment Variables and redeploy.

### Verifying / correcting the field mapping

The RDM product's response schema isn't publicly documented, so first time in an environment check what the API actually returns:

- `/api/performance?raw=1` — full raw payloads per source, plus which field path each metric was read from.
- `/api/performance?probe=operators` (or any relative path) — call the product's reference endpoints to list valid TOC codes / route names.

If a value maps to the wrong field, set an explicit `pick` dot-path on that metric in `src/lib/rdm/config.ts` — no other code changes needed.

---

## Architecture

### State split

| Layer | What | Where |
|---|---|---|
| Session state | All form inputs (SoS, Strategic, Tactical, Safety) | `localStorage` (key: `ma-session-v5`) |
| Config — targets | Target periods and per-period metrics | Supabase (`ma_target_periods`, `ma_targets`) |
| Config — templates | Seasonal slot pre-written content | Supabase (`ma_seasonal_templates`) |
| Backups | Rolling 36-snapshot ring buffer @ 5-min | `localStorage` (key: `ma-backups-v5`) |

### Message builders

Pure functions in `src/lib/messageBuilders/`. Each takes state and returns a plain text string. The copy action wraps the text in a Teams-compatible HTML blob (with banner image) alongside the plain text — `ClipboardItem` API handles dual-format copy for Teams vs WhatsApp.

### Supabase — non-destructive

All tables use `CREATE TABLE IF NOT EXISTS` and are prefixed `ma_`. The migration will not affect any existing tables in your project.

---

## Output formats

| Tab | Output |
|---|---|
| Start of Service 05:30 | Full SoS — operational status, overnight safety, performance, TOC/NR status, on-call roster, ESR, weather, engineering |
| Strategic AM 11:00 | Executive summary, performance snapshot, trends, interventions, PM opportunities, forward view |
| Strategic PM 20:00 | Executive summary, performance snapshot, trends, interventions, forward risks (infra/fleet/crew/weather), outlook |
| Tactical 09/15/22 | Greeting, SNDM/RCM, status, safety, performance, incidents, late running (GTR/EMR), seasonal slot |
| Safety Message | Standardised A–D format — type/subtype, location/time, asset/people, what happened, immediate actions, status/owner |
