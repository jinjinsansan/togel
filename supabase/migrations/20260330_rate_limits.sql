-- API レート制限（AI チャット等のコスト/濫用対策）
-- サーバーレス複数インスタンス間でも有効なよう DB でアトミックに管理する。

create table if not exists public.api_rate_limits (
  key text primary key,
  window_start timestamptz not null default timezone('utc', now()),
  count integer not null default 0
);

alter table public.api_rate_limits enable row level security;
-- service_role のみ（サーバー経由でのみ更新）
drop policy if exists api_rate_limits_service_role on public.api_rate_limits;
create policy api_rate_limits_service_role on public.api_rate_limits
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- キーごとにスライディングウィンドウでカウントし、上限内かを返す。
-- 戻り値 true = 許可 / false = 上限超過。
create or replace function public.check_and_increment_rate_limit(
  p_key text,
  p_max integer,
  p_window_seconds integer
) returns boolean
language plpgsql
as $$
declare
  v_now timestamptz := timezone('utc', now());
  v_count integer;
  v_start timestamptz;
begin
  insert into public.api_rate_limits as r (key, window_start, count)
  values (p_key, v_now, 1)
  on conflict (key) do update
    set
      count = case
        when r.window_start < v_now - make_interval(secs => p_window_seconds) then 1
        else r.count + 1
      end,
      window_start = case
        when r.window_start < v_now - make_interval(secs => p_window_seconds) then v_now
        else r.window_start
      end
  returning r.count, r.window_start into v_count, v_start;

  return v_count <= p_max;
end;
$$;
