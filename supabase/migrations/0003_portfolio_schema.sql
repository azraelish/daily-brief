-- Portfolio schema: assets registry, user transactions, price cache.

create type public.asset_kind as enum ('crypto', 'etf');
create type public.tx_type as enum ('buy', 'sell');

create table public.assets (
  id            text primary key,
  kind          public.asset_kind not null,
  symbol        text not null,
  name          text not null,
  currency      text not null check (currency in ('USD','EUR','GBP','CHF')),
  yahoo_ticker  text,
  coingecko_id  text,
  pea_eligible  boolean not null default false,
  created_at    timestamptz not null default now()
);

create table public.transactions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  asset_id    text not null references public.assets(id) on delete restrict,
  type        public.tx_type not null,
  quantity    numeric not null check (quantity > 0),
  price       numeric not null check (price >= 0),
  fees        numeric not null default 0 check (fees >= 0),
  occurred_at timestamptz not null,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index transactions_user_occurred on public.transactions (user_id, occurred_at desc);
create index transactions_user_asset on public.transactions (user_id, asset_id);

create table public.asset_prices (
  asset_id        text primary key references public.assets(id) on delete cascade,
  price           numeric not null,
  currency        text not null,
  source          text not null,
  fetched_at      timestamptz not null default now(),
  manual_override boolean not null default false
);

create table public.asset_price_history (
  asset_id   text not null references public.assets(id) on delete cascade,
  date       date not null,
  price      numeric not null,
  currency   text not null,
  primary key (asset_id, date)
);

-- RLS
alter table public.assets               enable row level security;
alter table public.transactions         enable row level security;
alter table public.asset_prices         enable row level security;
alter table public.asset_price_history  enable row level security;

create policy "assets read"
  on public.assets for select
  to authenticated
  using (true);

create policy "asset_prices read"
  on public.asset_prices for select
  to authenticated
  using (true);

create policy "asset_price_history read"
  on public.asset_price_history for select
  to authenticated
  using (true);

create policy "tx select own"
  on public.transactions for select
  to authenticated
  using (user_id = auth.uid());

create policy "tx insert own"
  on public.transactions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "tx update own"
  on public.transactions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "tx delete own"
  on public.transactions for delete
  to authenticated
  using (user_id = auth.uid());

-- updated_at trigger for transactions
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();
