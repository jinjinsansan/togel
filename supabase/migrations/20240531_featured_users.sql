create table if not exists public.featured_users (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) not null,
  target_gender text check (target_gender in ('male', 'female', 'all')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  active boolean default true,
  created_at timestamptz default now(),
  
  -- 同一ユーザーが重複して有効にならないようにする制約などが本来は必要だが、
  -- 簡易的にアプリ側で制御するか、indexでカバーする
  constraint valid_period check (end_at > start_at)
);

-- インデックス
create index idx_featured_users_period on public.featured_users(start_at, end_at, active);

-- RLSポリシー (管理者のみ操作可能、読み取りは全員)
alter table public.featured_users enable row level security;

create policy "Public read access for featured users"
  on public.featured_users for select
  using (true);

create policy "Admin full access for featured users"
  on public.featured_users for all
  using (
    -- 簡易的な管理者判定 (auth.usersのemail等で判定するか、service_role使用前提ならtrueでも可)
    -- 今回はAPIルートでservice_roleキーを使って操作するため、クライアント側からの直接操作はブロックしつつ
    -- 読み取りだけ許可する方針でもよいが、管理画面から直接操作するならポリシーが必要。
    -- ここでは一旦、adminユーザーのみ許可する想定のプレースホルダー
    auth.jwt() ->> 'email' in ('goldbenchan@gmail.com', 'kusanokiyoshi1@gmail.com')
  );
