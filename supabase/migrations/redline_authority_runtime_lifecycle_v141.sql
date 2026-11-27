-- Stage 141: additive, server-only authority session state.
-- Applied to REDLINE Multiplayer Supabase project on 2026-11-27.
-- No browser grant or RLS policies: intentionally service_role-only.
create table if not exists public.redline_authority_runtime_v141 (
  room_code text primary key references public.redline_rooms(code) on delete cascade,
  world_id uuid not null unique,
  course text not null check (course in ('grand','iron')),
  route_revision integer not null check (route_revision > 0),
  state text not null default 'allocated' check (state in ('allocated','lobby','countdown','racing','finished','expired','failed')),
  host_id text not null check (char_length(host_id) between 3 and 128),
  created_at timestamptz not null default now(),
  last_heartbeat_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint authority_runtime_time_order check (expires_at > created_at)
);
create index if not exists redline_authority_runtime_v141_expiry
  on public.redline_authority_runtime_v141(expires_at);
create index if not exists redline_authority_runtime_v141_heartbeat
  on public.redline_authority_runtime_v141(last_heartbeat_at);
alter table public.redline_authority_runtime_v141 enable row level security;
revoke all on table public.redline_authority_runtime_v141 from public,anon,authenticated;
grant select,insert,update,delete on table public.redline_authority_runtime_v141 to service_role;
