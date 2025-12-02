-- Recommendation system foundation

-- 1. Service catalog
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  image_url text,
  link_url text not null,
  category text,
  button_text text default '詳しく見る',
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_updated_at_services on public.services;
create trigger set_updated_at_services
  before update on public.services
  for each row execute function public.set_updated_at();

-- 2. Togel-type recommendations
create table if not exists public.togel_recommendations (
  id uuid primary key default gen_random_uuid(),
  togel_type_id text not null,
  service_id uuid not null references public.services(id) on delete cascade,
  display_order integer not null default 0,
  reason text not null,
  match_percentage integer check (match_percentage >= 0 and match_percentage <= 100),
  show_on_result_page boolean not null default true,
  show_on_mypage boolean not null default true,
  is_active boolean not null default true,
  start_date timestamptz,
  end_date timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint valid_date_range check (end_date is null or start_date is null or end_date > start_date)
);

drop trigger if exists set_updated_at_togel_recommendations on public.togel_recommendations;
create trigger set_updated_at_togel_recommendations
  before update on public.togel_recommendations
  for each row execute function public.set_updated_at();

-- 3. Click tracking (future analytics)
create table if not exists public.recommendation_clicks (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references public.togel_recommendations(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  clicked_at timestamptz not null default timezone('utc', now()),
  source text check (source in ('result_page', 'mypage'))
);

-- 4. Indexes for performance
create index if not exists idx_services_active
  on public.services (is_active)
  where is_active = true;

create index if not exists idx_recommendations_togel_type_active
  on public.togel_recommendations (togel_type_id, is_active);

create index if not exists idx_recommendations_dates
  on public.togel_recommendations (start_date, end_date)
  where is_active = true;

create index if not exists idx_recommendation_clicks_source
  on public.recommendation_clicks (source, clicked_at);

-- 5. Row level security policies
alter table public.services enable row level security;
alter table public.togel_recommendations enable row level security;
alter table public.recommendation_clicks enable row level security;

drop policy if exists "services_public_active" on public.services;
create policy "services_public_active"
  on public.services
  for select
  using (is_active = true);

drop policy if exists "services_admin_manage" on public.services;
create policy "services_admin_manage"
  on public.services
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "recommendations_public_active" on public.togel_recommendations;
create policy "recommendations_public_active"
  on public.togel_recommendations
  for select
  using (
    is_active = true
    and (start_date is null or start_date <= timezone('utc', now()))
    and (end_date is null or end_date > timezone('utc', now()))
  );

drop policy if exists "recommendations_admin_manage" on public.togel_recommendations;
create policy "recommendations_admin_manage"
  on public.togel_recommendations
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "recommendation_clicks_admin_manage" on public.recommendation_clicks;
create policy "recommendation_clicks_admin_manage"
  on public.recommendation_clicks
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
