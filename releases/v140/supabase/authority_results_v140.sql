create table if not exists public.redline_authority_results_v140 (
 race_id uuid primary key,
 room_code text not null check (room_code ~ '^[A-F0-9]{10}$'),
 course text not null check (course in ('grand','iron')),
 route_revision integer not null check ((course='grand' and route_revision=37) or (course='iron' and route_revision=136)),
 result jsonb not null check (jsonb_typeof(result)='object'),
 finished_at timestamptz not null
);
alter table public.redline_authority_results_v140 enable row level security;
revoke all on public.redline_authority_results_v140 from public,anon,authenticated;
grant select,insert on public.redline_authority_results_v140 to service_role;
