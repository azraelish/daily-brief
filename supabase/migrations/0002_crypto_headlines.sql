alter table public.brief_snapshots
  add column if not exists crypto_headlines jsonb not null default '[]'::jsonb;
