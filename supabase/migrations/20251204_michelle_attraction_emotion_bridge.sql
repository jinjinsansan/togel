begin;

alter table public.michelle_attraction_progress
  add column if not exists emotional_state text not null default 'stable' check (emotional_state in ('stable', 'concern', 'critical')),
  add column if not exists emotional_score integer not null default 0,
  add column if not exists psychology_recommendation text not null default 'none' check (
    psychology_recommendation in ('none', 'suggested', 'acknowledged', 'dismissed', 'resolved')
  ),
  add column if not exists psychology_recommendation_reason text,
  add column if not exists psychology_prompted_at timestamptz,
  add column if not exists psychology_opt_out_until timestamptz;

create index if not exists michelle_attraction_progress_psychology_idx
  on public.michelle_attraction_progress (psychology_recommendation, updated_at desc);

commit;
