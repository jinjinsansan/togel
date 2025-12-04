begin;

create table if not exists public.michelle_attraction_progress (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references public.michelle_attraction_sessions (id) on delete cascade,
  current_level smallint not null, -- 1-5
  current_section smallint not null, -- 1-20
  progress_status text not null check (progress_status in ('OK', 'IP', 'RV')),
  progress_code text,
  last_check_at timestamptz not null default timezone('utc', now()),
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (auth_user_id, session_id)
);

create table if not exists public.michelle_attraction_progress_notes (
  id uuid primary key default gen_random_uuid(),
  progress_id uuid not null references public.michelle_attraction_progress (id) on delete cascade,
  note_type text not null check (note_type in ('comprehension', 'emotion', 'action', 'success', 'other')),
  related_level smallint,
  related_section smallint,
  content text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists michelle_attraction_progress_user_idx
  on public.michelle_attraction_progress (auth_user_id, updated_at desc);

create index if not exists michelle_attraction_progress_session_idx
  on public.michelle_attraction_progress (session_id);

create index if not exists michelle_attraction_progress_notes_progress_idx
  on public.michelle_attraction_progress_notes (progress_id, created_at desc);

create trigger set_updated_at_michelle_attraction_progress
  before update on public.michelle_attraction_progress
  for each row execute function public.set_updated_at();

alter table public.michelle_attraction_progress enable row level security;
alter table public.michelle_attraction_progress_notes enable row level security;

create policy michelle_attraction_progress_select_own
  on public.michelle_attraction_progress
  for select using (auth.uid() = auth_user_id);

create policy michelle_attraction_progress_mutate_own
  on public.michelle_attraction_progress
  for all using (auth.uid() = auth_user_id) with check (auth.uid() = auth_user_id);

create policy michelle_attraction_progress_notes_select
  on public.michelle_attraction_progress_notes
  for select using (
    exists (
      select 1
      from public.michelle_attraction_progress map
      where map.id = michelle_attraction_progress_notes.progress_id
        and map.auth_user_id = auth.uid()
    )
  );

create policy michelle_attraction_progress_notes_insert
  on public.michelle_attraction_progress_notes
  for insert with check (
    exists (
      select 1
      from public.michelle_attraction_progress map
      where map.id = michelle_attraction_progress_notes.progress_id
        and map.auth_user_id = auth.uid()
    )
  );

create policy michelle_attraction_progress_notes_delete
  on public.michelle_attraction_progress_notes
  for delete using (
    exists (
      select 1
      from public.michelle_attraction_progress map
      where map.id = michelle_attraction_progress_notes.progress_id
        and map.auth_user_id = auth.uid()
    )
  );

commit;
