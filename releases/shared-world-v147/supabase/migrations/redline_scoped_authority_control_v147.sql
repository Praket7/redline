-- REDLINE v147: a narrowly scoped capability for a single authority service.
-- No general service-role key is required by the game server.
create schema if not exists redline_authority_private;
revoke all on schema redline_authority_private from public, anon, authenticated;
create table if not exists redline_authority_private.server_tokens (
  name text primary key,
  token_hash bytea not null unique check (octet_length(token_hash)=32),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table redline_authority_private.server_tokens enable row level security;
revoke all on redline_authority_private.server_tokens from public, anon, authenticated;

create or replace function public.redline_authority_control_v147(p_token text,p_action text,p_payload jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  c text;
  w uuid;
  i uuid;
  l public.redline_authority_runtime_v141%rowtype;
  r public.redline_rooms%rowtype;
  rs jsonb;
  begin_time timestamptz;
  end_time timestamptz;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' or p_action is null or
     p_payload is null or pg_catalog.jsonb_typeof(p_payload) <> 'object' or
     pg_catalog.octet_length(p_payload::text)>32768 then return false; end if;
  if not exists(select 1 from redline_authority_private.server_tokens t
       where t.active and t.token_hash=extensions.digest(p_token,'sha256')) then return false; end if;
  if p_action='redline_authority_probe_v147' then return true; end if;
  if p_action not in ('redline_authority_claim_v145','redline_authority_heartbeat_v145',
    'redline_authority_release_v145','redline_authority_save_v147') then return false; end if;
  c:=coalesce(p_payload->>'p_code',p_payload->>'room_code');
  w:=coalesce(p_payload->>'p_world',p_payload->>'world_id')::uuid;
  i:=coalesce(p_payload->>'p_instance',p_payload->>'owner_instance')::uuid;
  if c is null or c !~ '^[A-F0-9]{10}$' or w is null or i is null then return false; end if;
  if p_action='redline_authority_claim_v145' then
    select * into r from public.redline_rooms where code=c for update;
    if not found or r.stage <> 'lobby' or r.expires_at<=now() or
       r.host_player_id::text is distinct from p_payload->>'p_host' or
       exists(select 1 from redline_rank.rooms where code=c) or
       (case when r.protocol_version=137 then 'iron' else 'grand' end)
         is distinct from p_payload->>'p_course' or
       (case when r.protocol_version=137 then 136 else 37 end)
         is distinct from (p_payload->>'p_revision')::integer then return false; end if;
    return public.redline_authority_claim_v145(c,w,p_payload->>'p_course',
       (p_payload->>'p_revision')::integer,p_payload->>'p_host',i);
  end if;
  select * into l from public.redline_authority_runtime_v141
     where room_code=c and world_id=w and owner_instance=i and expires_at>now() for update;
  if not found then return false; end if;
  if p_action='redline_authority_heartbeat_v145' then
    if p_payload->>'p_state' not in ('lobby','racing','finished') then return false; end if;
    return public.redline_authority_heartbeat_v145(c,w,i,p_payload->>'p_state');
  elsif p_action='redline_authority_release_v145' then
    return public.redline_authority_release_v145(c,w,i);
  end if;
  -- A result can be written only by the current, unexpired lease owner.
  rs:=p_payload->'results';
  if l.state not in ('racing','finished') or p_payload->>'course' is distinct from l.course or
    (p_payload->>'route_revision')::integer is distinct from l.route_revision or
    pg_catalog.jsonb_typeof(rs) is distinct from 'array' then return false; end if;
  if pg_catalog.jsonb_array_length(rs) not between 2 and 6 then return false; end if;
  if exists(select 1 from pg_catalog.jsonb_array_elements(rs) x
    where pg_catalog.jsonb_typeof(x) is distinct from 'object' or
      pg_catalog.jsonb_typeof(x->'finished_seconds') is distinct from 'number' or
      (x->>'finished_seconds')::numeric not between 0 and 7200 or
      not exists(select 1 from public.redline_players p where p.room_code=c and p.id::text=x->>'id'))
    or (select count(distinct x->>'id') from pg_catalog.jsonb_array_elements(rs) x)
       <> pg_catalog.jsonb_array_length(rs) then return false; end if;
  begin_time:=(p_payload->>'started_at')::timestamptz;
  end_time:=(p_payload->>'completed_at')::timestamptz;
  if begin_time is null or end_time is null or end_time<begin_time or
     end_time>now()+interval '1 minute' or begin_time<now()-interval '3 hours' then return false; end if;
  insert into public.redline_authority_matches_v140
      (world_id,room_code,course,route_revision,started_at,completed_at,results)
      values(w,c,l.course,l.route_revision,begin_time,end_time,rs)
      on conflict(world_id) do nothing;
  return true;
exception when invalid_text_representation or numeric_value_out_of_range or datetime_field_overflow or invalid_datetime_format
  then return false;
end;
$$;
revoke all on function public.redline_authority_control_v147(text,text,jsonb) from public,anon,authenticated;
grant execute on function public.redline_authority_control_v147(text,text,jsonb) to anon,authenticated;
-- Legacy service-role-only lease functions retain their original grants.
