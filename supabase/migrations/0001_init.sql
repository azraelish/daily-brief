-- Daily Brief schema

create extension if not exists "pgcrypto";

create table if not exists public.salads (
  id          int primary key,
  name        text not null,
  ingredients text[] not null,
  description text not null
);

create table if not exists public.brief_snapshots (
  id              uuid primary key default gen_random_uuid(),
  brief_date      date unique not null,
  btc_price       numeric not null,
  btc_change_24h  numeric not null,
  headlines       jsonb not null,
  salad_ids       int[] not null,
  created_at      timestamptz not null default now()
);

create index if not exists brief_snapshots_brief_date_desc
  on public.brief_snapshots (brief_date desc);

alter table public.salads          enable row level security;
alter table public.brief_snapshots enable row level security;

drop policy if exists "salads public read"          on public.salads;
drop policy if exists "brief_snapshots public read" on public.brief_snapshots;

create policy "salads public read"
  on public.salads for select
  to anon, authenticated
  using (true);

create policy "brief_snapshots public read"
  on public.brief_snapshots for select
  to anon, authenticated
  using (true);

-- Seed 9 salads
insert into public.salads (id, name, ingredients, description) values
  (1, 'Classic Caesar',
    array['romaine','parmesan','croutons','anchovy','lemon','garlic','olive oil'],
    'The original — crisp romaine under a sharp anchovy-lemon dressing, snowed with parmesan.'),
  (2, 'Greek Village',
    array['tomato','cucumber','red onion','green pepper','kalamata olives','feta','oregano','olive oil'],
    'No lettuce, all sun. Tomatoes and cucumber piled under a slab of feta and oregano.'),
  (3, 'Caprese',
    array['heirloom tomato','fresh mozzarella','basil','balsamic glaze','olive oil','sea salt'],
    'Italy on a plate. Three ingredients, perfect ratios, nothing to hide behind.'),
  (4, 'Niçoise',
    array['seared tuna','green beans','new potatoes','egg','olives','tomato','anchovy','dijon vinaigrette'],
    'A composed Provençal classic — protein-forward, bright, and built for a glass of rosé.'),
  (5, 'Cobb',
    array['romaine','blue cheese','bacon','egg','avocado','tomato','grilled chicken','red wine vinaigrette'],
    'Hollywood diner energy. Striped rows of every good thing under a tart vinaigrette.'),
  (6, 'Waldorf',
    array['apple','celery','grapes','walnuts','mayonnaise','lemon','butter lettuce'],
    'Crunchy, sweet, creamy — the original hotel-lobby salad, still oddly perfect.'),
  (7, 'Fattoush',
    array['toasted pita','cucumber','tomato','radish','mint','parsley','sumac','pomegranate molasses'],
    'A Levantine clean-out-the-fridge masterpiece, lifted by sumac and crackling pita.'),
  (8, 'Som Tam',
    array['green papaya','lime','fish sauce','peanuts','chili','cherry tomato','long bean','garlic'],
    'Thai green papaya, pounded in a mortar — sour, salty, sweet, and aggressively spicy.'),
  (9, 'Tabbouleh',
    array['parsley','bulgur','tomato','mint','lemon','olive oil','spring onion'],
    'Mostly herbs, a little grain. Bright, green, and the cure for a heavy week.')
on conflict (id) do update set
  name        = excluded.name,
  ingredients = excluded.ingredients,
  description = excluded.description;
