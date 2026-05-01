# Daily Brief

A small web app that shows, every morning at 7 AM UTC:

1. Current Bitcoin price (USD) + 24h % change.
2. Top 10 world news headlines.
3. Three "salads of the day" rotated from a pool of 9 (no overlap with yesterday's pick).

It's a Next.js 14 (App Router, TypeScript, Tailwind) app on **Vercel**, with **Postgres on Supabase** and **Vercel Cron** doing the daily refresh — so it works even when your laptop is off.

## Architecture

- `GET /api/brief` — returns the latest snapshot from Supabase. Cached `s-maxage=300`.
- `POST /api/refresh` — protected by `Authorization: Bearer ${CRON_SECRET}` or the Vercel cron header. Fetches BTC + headlines, picks salads, upserts a row keyed by `brief_date`. Idempotent.
- `vercel.json` — runs `/api/refresh` at `0 7 * * *` and `30 7 * * *` (the second is a safety net).
- The page is a React Server Component. If Supabase has no row for today (UTC), the server triggers `/api/refresh` before rendering, so a visitor always sees today's brief even if both crons missed.

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev
```

### Required env vars

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEWS_API_KEY=                 # GNews API key; optional (falls back to BBC RSS)
CRON_SECRET=                  # any long random string
```

## Database

Schema and seed live in [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql). Apply via the Supabase CLI:

```bash
supabase login
supabase link --project-ref <your-project-ref>
npm run db:push
```

Or paste the SQL into the Supabase dashboard SQL editor.

## Deploy

```bash
# 1. Source on GitHub
gh repo create daily-brief --public --source=. --remote=origin --push

# 2. Deploy to Vercel
vercel link
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add NEWS_API_KEY production       # optional
vercel env add CRON_SECRET production
vercel --prod

# 3. Seed today's row
curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<your-domain>/api/refresh
```

The Vercel Crons in `vercel.json` are picked up automatically on the first production deploy.

## Notes

- News provider: GNews if `NEWS_API_KEY` is set; otherwise BBC RSS.
- Salad rotation is deterministic per-day (seeded by today's date) and excludes yesterday's three picks, so you'll never see the same trio two days in a row.
- The render-time fallback makes the first hit of the day a little slower if both crons missed — that's the trade for guaranteed freshness.
