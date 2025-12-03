begin;

create extension if not exists "vector";

create table if not exists public.michelle_attraction_sessions (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  category michelle_session_category not null,
  title text,
  openai_thread_id text,
  total_tokens integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.michelle_attraction_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.michelle_attraction_sessions (id) on delete cascade,
  role michelle_message_role not null,
  content text not null,
  tokens_used integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.michelle_attraction_knowledge (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  embedding vector(1536),
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists michelle_attraction_sessions_user_idx on public.michelle_attraction_sessions (auth_user_id);
create index if not exists michelle_attraction_messages_session_idx on public.michelle_attraction_messages (session_id);
create index if not exists michelle_attraction_knowledge_embedding_idx
  on public.michelle_attraction_knowledge using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create trigger set_updated_at_michelle_attraction_sessions
  before update on public.michelle_attraction_sessions
  for each row execute function public.set_updated_at();

create trigger set_updated_at_michelle_attraction_messages
  before update on public.michelle_attraction_messages
  for each row execute function public.set_updated_at();

alter table public.michelle_attraction_sessions enable row level security;
alter table public.michelle_attraction_messages enable row level security;
alter table public.michelle_attraction_knowledge enable row level security;

create policy michelle_attraction_sessions_select_own
  on public.michelle_attraction_sessions
  for select using (auth.uid() = auth_user_id);

create policy michelle_attraction_sessions_mutate_own
  on public.michelle_attraction_sessions
  for all using (auth.uid() = auth_user_id) with check (auth.uid() = auth_user_id);

create policy michelle_attraction_messages_select
  on public.michelle_attraction_messages
  for select using (
    exists (
      select 1
      from public.michelle_attraction_sessions mas
      where mas.id = michelle_attraction_messages.session_id
        and mas.auth_user_id = auth.uid()
    )
  );

create policy michelle_attraction_messages_insert
  on public.michelle_attraction_messages
  for insert with check (
    exists (
      select 1
      from public.michelle_attraction_sessions mas
      where mas.id = michelle_attraction_messages.session_id
        and mas.auth_user_id = auth.uid()
    )
  );

create policy michelle_attraction_knowledge_service_role
  on public.michelle_attraction_knowledge
  for all using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create or replace function public.match_michelle_attraction_knowledge(
  query_embedding vector(1536),
  match_count int default 5,
  similarity_threshold double precision default 0.65
)
returns table (
  id uuid,
  content text,
  metadata jsonb,
  similarity double precision
)
language sql
stable
as $$
  select
    mak.id,
    mak.content,
    mak.metadata,
    1 - (mak.embedding <=> query_embedding) as similarity
  from public.michelle_attraction_knowledge mak
  where mak.embedding is not null
    and 1 - (mak.embedding <=> query_embedding) >= similarity_threshold
  order by mak.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

commit;
