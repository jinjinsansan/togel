begin;

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete cascade,
  line_user_id text unique not null,
  gender text not null check (gender in ('male', 'female')),
  nickname varchar(20) not null,
  birth_date date not null check (birth_date <= (current_date - interval '18 years')),
  age integer generated always as (date_part('year', age(current_date, birth_date))) stored,
  avatar_url text,
  bio text not null,
  job varchar(50) not null,
  favorite_things text not null,
  hobbies text not null,
  special_skills text not null,
  annual_income varchar(50),
  height integer,
  weight integer,
  twitter_url text,
  instagram_url text,
  income_visible boolean not null default true,
  is_mock_data boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.diagnosis_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  diagnosis_type text not null check (diagnosis_type in ('light', 'full')),
  animal_type varchar(50) not null,
  answers jsonb not null,
  completed_at timestamptz default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  diagnosis_type text not null check (diagnosis_type in ('light', 'full')),
  question_number integer not null,
  question_text text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array'),
  created_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists questions_diagnosis_type_number_idx
  on public.questions (diagnosis_type, question_number);

create table if not exists public.invite_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  link_code varchar(20) not null unique,
  is_prank_mode boolean not null default false,
  used_count integer not null default 0 check (used_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz
);

create table if not exists public.invite_registrations (
  id uuid primary key default gen_random_uuid(),
  invite_link_id uuid not null references public.invite_links (id) on delete cascade,
  invited_user_id uuid not null references public.users (id) on delete cascade,
  inviter_user_id uuid not null references public.users (id) on delete cascade,
  registered_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.matching_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  diagnosis_result_id uuid not null references public.diagnosis_results (id) on delete cascade,
  matched_users jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_users_gender on public.users (gender);
create index if not exists idx_users_is_mock on public.users (is_mock_data);
create index if not exists idx_diagnosis_user on public.diagnosis_results (user_id);
create index if not exists idx_invite_links_code on public.invite_links (link_code);
create index if not exists idx_invite_registrations_invited on public.invite_registrations (invited_user_id);
create index if not exists idx_matching_cache_user on public.matching_cache (user_id);

create trigger set_updated_at_users
  before update on public.users
  for each row execute function public.set_updated_at();

create trigger set_updated_at_diagnosis_results
  before update on public.diagnosis_results
  for each row execute function public.set_updated_at();

create trigger set_updated_at_invite_links
  before update on public.invite_links
  for each row execute function public.set_updated_at();

create trigger set_updated_at_matching_cache
  before update on public.matching_cache
  for each row execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.diagnosis_results enable row level security;
alter table public.questions enable row level security;
alter table public.invite_links enable row level security;
alter table public.invite_registrations enable row level security;
alter table public.matching_cache enable row level security;

create policy users_select_self on public.users
  for select using (auth.uid() is not null and auth.uid() = auth_user_id);

create policy users_insert_self on public.users
  for insert with check (auth.uid() = auth_user_id and is_mock_data = false);

create policy users_update_self on public.users
  for update using (auth.uid() = auth_user_id) with check (auth.uid() = auth_user_id);

create policy users_delete_self on public.users
  for delete using (auth.uid() = auth_user_id);

create policy diagnosis_results_select_own on public.diagnosis_results
  for select using (
    auth.uid() = (select auth_user_id from public.users where public.users.id = public.diagnosis_results.user_id)
  );

create policy diagnosis_results_mutate_own on public.diagnosis_results
  for all using (
    auth.uid() = (select auth_user_id from public.users where public.users.id = public.diagnosis_results.user_id)
  ) with check (
    auth.uid() = (select auth_user_id from public.users where public.users.id = public.diagnosis_results.user_id)
  );

create policy questions_read_all on public.questions
  for select using (true);

create policy questions_write_service_role on public.questions
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy invite_links_owner_access on public.invite_links
  for all using (
    auth.uid() = (select auth_user_id from public.users where public.users.id = public.invite_links.user_id)
  ) with check (
    auth.uid() = (select auth_user_id from public.users where public.users.id = public.invite_links.user_id)
  );

create policy invite_registrations_owner_view on public.invite_registrations
  for select using (
    auth.uid() = (select auth_user_id from public.users where public.users.id = public.invite_registrations.inviter_user_id)
    or auth.uid() = (select auth_user_id from public.users where public.users.id = public.invite_registrations.invited_user_id)
  );

create policy invite_registrations_owner_manage on public.invite_registrations
  for insert with check (
    auth.uid() = (select auth_user_id from public.users where public.users.id = public.invite_registrations.inviter_user_id)
  );

create policy matching_cache_select_own on public.matching_cache
  for select using (
    auth.uid() = (select auth_user_id from public.users where public.users.id = public.matching_cache.user_id)
  );

create policy matching_cache_mutate_own on public.matching_cache
  for all using (
    auth.uid() = (select auth_user_id from public.users where public.users.id = public.matching_cache.user_id)
  ) with check (
    auth.uid() = (select auth_user_id from public.users where public.users.id = public.matching_cache.user_id)
  );

commit;
