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

If Supabase variables are omitted the app runs fully offline using built-in defaults.

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
