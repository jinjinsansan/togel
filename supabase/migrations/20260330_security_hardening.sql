-- =============================================================================
-- セキュリティ・データ整合性ハードニング（リリース前監査対応）
--
-- 本マイグレーションは全て冪等。既存の本番DBにも安全に再適用できる。
-- 対象:
--   1. LINE Bot テーブルの RLS 有効化（PII 全件流出の防止）
--   2. michelle_knowledge_backup の RLS 有効化
--   3. notifications / notification_reads の RLS を auth_user_id 経由に修正
--   4. profiles テーブルの再現可能化（CREATE IF NOT EXISTS）＋ RLS
--   5. ポイント台帳の二重付与防止（部分ユニークインデックス）＋ 残高 CHECK
-- =============================================================================

-- 1. LINE Bot テーブル: RLS 有効化（アクセスはサーバーの service_role のみ） -------
alter table if exists public.line_users enable row level security;
alter table if exists public.line_conversations enable row level security;

do $$
begin
  if to_regclass('public.line_users') is not null then
    drop policy if exists line_users_service_role on public.line_users;
    create policy line_users_service_role on public.line_users
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;
  if to_regclass('public.line_conversations') is not null then
    drop policy if exists line_conversations_service_role on public.line_conversations;
    create policy line_conversations_service_role on public.line_conversations
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;
end$$;

-- 2. michelle_knowledge_backup: RLS 有効化 -----------------------------------
do $$
begin
  if to_regclass('public.michelle_knowledge_backup') is not null then
    execute 'alter table public.michelle_knowledge_backup enable row level security';
    drop policy if exists michelle_knowledge_backup_service_role on public.michelle_knowledge_backup;
    create policy michelle_knowledge_backup_service_role on public.michelle_knowledge_backup
      for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
  end if;
end$$;

-- 3. notifications RLS 修正: user_id は public.users.id（auth.uid() とは別空間）---
--    旧ポリシー `auth.uid() = user_id` は永久に一致せず、本人の通知が読めなかった。
drop policy if exists "Users can view own notifications" on public.notifications;
create policy "Users can view own notifications" on public.notifications
  for select using (
    user_id is null
    or user_id in (select id from public.users where auth_user_id = auth.uid())
  );

drop policy if exists "Users can manage own read status" on public.notification_reads;
create policy "Users can manage own read status" on public.notification_reads
  for all using (
    user_id in (select id from public.users where auth_user_id = auth.uid())
  ) with check (
    user_id in (select id from public.users where auth_user_id = auth.uid())
  );

-- 4. profiles テーブル: 再現可能化 ＋ RLS ------------------------------------
--    profiles.id == auth.users.id（本人）。ブラウザから直接読み書きされる。
create table if not exists public.profiles (
  id uuid primary key,
  full_name text,
  bio text,
  gender text,
  age integer,
  job text,
  city text,
  is_public boolean default true,
  avatar_url text,
  social_links jsonb,
  details jsonb,
  diagnosis_type_id text,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

-- 既存インストールにも欠損カラムを補完（冪等）
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists gender text;
alter table public.profiles add column if not exists age integer;
alter table public.profiles add column if not exists job text;
alter table public.profiles add column if not exists city text;
alter table public.profiles add column if not exists is_public boolean default true;
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists social_links jsonb;
alter table public.profiles add column if not exists details jsonb;
alter table public.profiles add column if not exists diagnosis_type_id text;
alter table public.profiles add column if not exists created_at timestamptz default timezone('utc', now());
alter table public.profiles add column if not exists updated_at timestamptz default timezone('utc', now());

alter table public.profiles enable row level security;

-- 本人は自分の行を読み書き可。公開プロフィール(is_public)は誰でも閲覧可。
drop policy if exists profiles_select_public_or_own on public.profiles;
create policy profiles_select_public_or_own on public.profiles
  for select using (is_public is true or auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists profiles_service_role on public.profiles;
create policy profiles_service_role on public.profiles
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- 5. ポイント台帳: 二重付与防止 ＋ 残高 CHECK -------------------------------
--    同一注文に対する購入クレジット/返金デビットは各1件まで（Webhook再送対策）。
create unique index if not exists uniq_point_tx_per_order_reason_type
  on public.point_transactions (order_id, transaction_type, reason)
  where order_id is not null;

-- 残高は負にならない（debit 時のアプリ側ガードに加えた DB レベルの不変条件）
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'point_wallets_balance_nonneg'
  ) then
    alter table public.point_wallets
      add constraint point_wallets_balance_nonneg check (balance >= 0) not valid;
    alter table public.point_wallets validate constraint point_wallets_balance_nonneg;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'point_wallets_pending_nonneg'
  ) then
    alter table public.point_wallets
      add constraint point_wallets_pending_nonneg check (pending_balance >= 0) not valid;
    alter table public.point_wallets validate constraint point_wallets_pending_nonneg;
  end if;
end$$;
