-- Performance & caching improvements

-- 1. diagnosis_results stores derived data to avoid recalculation
alter table public.diagnosis_results
  add column if not exists personality_type_id text,
  add column if not exists big_five_scores jsonb;

create index if not exists idx_diagnosis_results_animal_type
  on public.diagnosis_results (animal_type);

-- 2. matching_cache keeps mismatch/featured payloads + TTL
alter table public.matching_cache
  add column if not exists mismatched_users jsonb,
  add column if not exists featured_user jsonb,
  add column if not exists expires_at timestamptz default (timezone('utc', now()) + interval '30 minutes');

update public.matching_cache
  set expires_at = coalesce(expires_at, timezone('utc', now()) + interval '30 minutes');

-- 3. Aggregated counts view for type distribution
create or replace view public.togel_type_counts as
  select
    coalesce(animal_type, 'Togel Unknown型') as animal_type,
    count(*)::bigint as total
  from public.diagnosis_results
  group by 1;

grant select on public.togel_type_counts to service_role;
