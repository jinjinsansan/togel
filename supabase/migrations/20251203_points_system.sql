begin;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'point_order_status') then
    create type point_order_status as enum ('pending', 'opened', 'closed', 'rejected', 'expired', 'refunded', 'canceled');
  end if;

  if not exists (select 1 from pg_type where typname = 'point_transaction_type') then
    create type point_transaction_type as enum ('credit', 'debit');
  end if;

  if not exists (select 1 from pg_type where typname = 'point_transaction_reason') then
    create type point_transaction_reason as enum ('purchase', 'diagnosis', 'bonus', 'admin_adjustment', 'refund', 'other');
  end if;
end$$;

create table if not exists public.point_packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  amount_usd numeric(12,2) not null,
  currency text not null default 'USD',
  points integer not null,
  bonus_points integer not null default 0,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists point_packages_name_key on public.point_packages (name);

create table if not exists public.point_wallets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  balance bigint not null default 0,
  pending_balance bigint not null default 0,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.point_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  package_id uuid references public.point_packages (id),
  amount numeric(12,2) not null,
  currency text not null default 'USD',
  points integer not null,
  status point_order_status not null default 'pending',
  checkout_preference_id text unique,
  payment_order_id text,
  checkout_url text,
  external_id text,
  expires_at timestamptz,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  webhook_synced_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  order_id uuid references public.point_orders (id) on delete set null,
  transaction_type point_transaction_type not null,
  reason point_transaction_reason not null default 'other',
  points integer not null check (points > 0),
  balance_after bigint not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.point_webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text unique,
  event_type text not null,
  entity_type text not null,
  entity_id text not null,
  payload jsonb not null,
  processed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists point_packages_active_idx on public.point_packages (is_active) where is_active = true;
create index if not exists point_wallets_updated_idx on public.point_wallets (updated_at desc);
create index if not exists point_orders_user_idx on public.point_orders (user_id, created_at desc);
create index if not exists point_orders_payment_order_idx on public.point_orders (payment_order_id);
create index if not exists point_transactions_user_idx on public.point_transactions (user_id, created_at desc);
create index if not exists point_transactions_order_idx on public.point_transactions (order_id);

insert into public.point_packages (name, description, amount_usd, currency, points, bonus_points, sort_order)
values
  ('ライトチャージ', 'まずはお試しに最適な少額パック', 15, 'USD', 1500, 0, 1),
  ('スタンダード', '人気No.1の基本チャージ', 50, 'USD', 5200, 200, 2),
  ('プレミアム', 'たっぷり使いたい方向けの大容量', 120, 'USD', 13000, 1000, 3)
on conflict (name) do nothing;

create or replace view public.point_dashboard_metrics as
  select
    coalesce(sum(case when status = 'closed' then amount else 0 end), 0)::numeric(20,2) as total_revenue,
    coalesce(sum(case when status in ('pending', 'opened') then amount else 0 end), 0)::numeric(20,2) as pending_amount,
    coalesce(sum(case when status = 'refunded' then amount else 0 end), 0)::numeric(20,2) as refunded_amount,
    coalesce(sum(case when status = 'closed' then points else 0 end), 0)::bigint as total_points_sold,
    coalesce(sum(case when status in ('pending', 'opened') then 1 else 0 end), 0)::bigint as active_orders
  from public.point_orders;

create or replace view public.point_package_sales as
  select
    pkg.id as package_id,
    pkg.name,
    pkg.description,
    pkg.amount_usd,
    pkg.currency,
    pkg.points,
    pkg.bonus_points,
    coalesce(sum(case when ord.status = 'closed' then ord.amount else 0 end), 0)::numeric(20,2) as total_amount,
    coalesce(sum(case when ord.status = 'closed' then ord.points else 0 end), 0)::bigint as total_points,
    count(ord.*) filter (where ord.status = 'closed') as closed_orders
  from public.point_packages pkg
  left join public.point_orders ord on ord.package_id = pkg.id
  group by pkg.id;

create or replace function public.apply_point_transaction(
  p_user_id uuid,
  p_points integer,
  p_type point_transaction_type,
  p_reason point_transaction_reason default 'other',
  p_order_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.point_transactions
language plpgsql
as $$
declare
  current_balance bigint;
  next_balance bigint;
  inserted public.point_transactions;
begin
  if p_points <= 0 then
    raise exception 'points must be positive';
  end if;

  insert into public.point_wallets (user_id, balance, pending_balance)
  values (p_user_id, 0, 0)
  on conflict (user_id) do nothing;

  select balance into current_balance from public.point_wallets where user_id = p_user_id for update;

  if p_type = 'credit' then
    next_balance := current_balance + p_points;
  else
    next_balance := current_balance - p_points;
    if next_balance < 0 then
      raise exception 'Insufficient points for user %', p_user_id;
    end if;
  end if;

  update public.point_wallets
    set balance = next_balance,
        updated_at = timezone('utc', now())
  where user_id = p_user_id;

  insert into public.point_transactions (
    user_id,
    order_id,
    transaction_type,
    reason,
    points,
    balance_after,
    metadata
  ) values (
    p_user_id,
    p_order_id,
    p_type,
    p_reason,
    p_points,
    next_balance,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into inserted;

  return inserted;
end;
$$;

create trigger set_updated_at_point_packages
  before update on public.point_packages
  for each row execute function public.set_updated_at();

create trigger set_updated_at_point_orders
  before update on public.point_orders
  for each row execute function public.set_updated_at();

alter table public.point_packages enable row level security;
alter table public.point_wallets enable row level security;
alter table public.point_orders enable row level security;
alter table public.point_transactions enable row level security;
alter table public.point_webhook_events enable row level security;

create policy point_packages_public_select
  on public.point_packages
  for select
  using (true);

create policy point_packages_service_role
  on public.point_packages
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy point_wallets_select_own
  on public.point_wallets
  for select
  using (auth.uid() = user_id);

create policy point_wallets_service_role
  on public.point_wallets
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy point_orders_select_own
  on public.point_orders
  for select
  using (auth.uid() = user_id);

create policy point_orders_insert_own
  on public.point_orders
  for insert
  with check (auth.uid() = user_id);

create policy point_orders_service_role
  on public.point_orders
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy point_transactions_select_own
  on public.point_transactions
  for select
  using (auth.uid() = user_id);

create policy point_transactions_service_role
  on public.point_transactions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy point_webhook_events_service_role
  on public.point_webhook_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

commit;
