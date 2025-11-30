-- Add administrative control fields to users table for block/delete management
alter table public.users
  add column if not exists is_blocked boolean not null default false,
  add column if not exists blocked_reason text,
  add column if not exists blocked_at timestamptz,
  add column if not exists is_deleted boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists admin_notes text;

create index if not exists idx_users_is_blocked on public.users (is_blocked);
create index if not exists idx_users_is_deleted on public.users (is_deleted);

create or replace view public.admin_user_overview as
select
  u.id as user_id,
  u.auth_user_id,
  u.line_user_id,
  u.gender as user_gender,
  u.nickname,
  u.bio as legacy_bio,
  u.favorite_things,
  u.hobbies,
  u.special_skills,
  u.annual_income,
  u.height,
  u.weight,
  u.is_mock_data,
  u.is_blocked,
  u.blocked_reason,
  u.blocked_at,
  u.is_deleted,
  u.deleted_at,
  u.admin_notes,
  u.created_at as user_created_at,
  u.updated_at as user_updated_at,
  p.full_name,
  p.bio,
  p.gender as profile_gender,
  p.age,
  p.job,
  p.city,
  p.is_public,
  p.avatar_url,
  p.social_links,
  p.details,
  p.notification_settings,
  p.diagnosis_type_id,
  p.created_at as profile_created_at,
  p.updated_at as profile_updated_at
from public.users u
left join public.profiles p on p.id = u.id;

grant select on public.admin_user_overview to service_role;
