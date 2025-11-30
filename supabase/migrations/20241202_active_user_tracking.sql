-- アクティブユーザー追跡のためのカラム追加
-- 負荷テスト結果を踏まえたマッチング最適化

begin;

-- users テーブルに最終閲覧日時を追加
alter table public.users 
add column if not exists last_viewed_results_at timestamptz;

-- コメント追加
comment on column public.users.last_viewed_results_at is 
  'マッチング結果を最後に閲覧した日時（負荷削減のためのアクティブユーザー判定用）';

-- インデックス追加（アクティブユーザー検索の高速化）
create index if not exists idx_users_last_viewed_results 
  on public.users (last_viewed_results_at desc) 
  where is_mock_data = false and last_viewed_results_at is not null;

-- updated_at のインデックス（プロフィール更新日検索用）
create index if not exists idx_users_updated_at 
  on public.users (updated_at desc) 
  where is_mock_data = false;

commit;
