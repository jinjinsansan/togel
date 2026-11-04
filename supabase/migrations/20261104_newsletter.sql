-- メルマガ（週1通・全15通）の宛先。LINE週次配信の置き換え。
--
-- 1行 = 1アカウント。宛先は Supabase Auth のユーザーに限る（確認済みのメールアドレスだけに送る）。
-- 送信は Resend（無料枠: 1日100通・月3,000通）。毎日の cron が「前回から7日以上たった人」に
-- 次の1通を送り、1日の上限を超えた分は翌日に回す。
--
-- 特定電子メール法: 同意の時点と経路を残す（consented_at / consent_source）。
-- 解除は unsubscribe_token のリンク1つで完了し、行は消さずに unsubscribed_at を入れる
-- （「いつ同意し、いつ解除したか」を説明できるようにするため）。

create table if not exists public.newsletter_subscribers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  -- 24タイプのID。未診断のあいだは null で、その間は送らない
  type_id text,
  consented_at timestamptz not null default now(),
  consent_source text not null check (consent_source in ('signup', 'result', 'mypage', 'newsletter_page')),
  unsubscribed_at timestamptz,
  unsubscribe_token uuid not null default gen_random_uuid() unique,
  -- 送り終えた通目（0 = まだ1通も送っていない）。全15通で止まる
  last_issue integer not null default 0 check (last_issue between 0 and 15),
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- cron が引く「まだ途中の購読者」
create index if not exists newsletter_subscribers_due_idx
  on public.newsletter_subscribers (last_sent_at nulls first)
  where unsubscribed_at is null and type_id is not null and last_issue < 15;

-- 読み書きはサーバー（service role）だけ。利用者のブラウザからは触らせない
alter table public.newsletter_subscribers enable row level security;

create or replace function public.newsletter_subscribers_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists newsletter_subscribers_touch on public.newsletter_subscribers;
create trigger newsletter_subscribers_touch
  before update on public.newsletter_subscribers
  for each row execute function public.newsletter_subscribers_touch_updated_at();
