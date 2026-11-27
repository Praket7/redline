-- REDLINE v145: one active persistent simulation owner per Supabase room.
-- Service-role-only atomic fencing; no public browser grants. Compatible with v139 tables.
alter table public.redline_authority_runtime_v141
    add column if not exists owner_instance uuid;

create or replace function public.redline_authority_claim_v145(
    p_code text, p_world uuid, p_course text, p_revision integer,
    p_host text, p_instance uuid)
returns boolean language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if p_world is null or p_instance is null or p_course not in ('grand','iron')
     or p_revision not in (37,136) or p_host is null then return false; end if;
  insert into public.redline_authority_runtime_v141
    (room_code,world_id,course,route_revision,state,host_id,owner_instance,expires_at)
  values(p_code,p_world,p_course,p_revision,'allocated',p_host,p_instance,now()+interval '90 seconds')
  on conflict(room_code) do update set
    world_id=excluded.world_id,course=excluded.course,
    route_revision=excluded.route_revision,state='allocated',host_id=excluded.host_id,
    owner_instance=excluded.owner_instance,last_heartbeat_at=now(),expires_at=now()+interval '90 seconds'
  where public.redline_authority_runtime_v141.expires_at<now()
      or (public.redline_authority_runtime_v141.owner_instance=p_instance
          and public.redline_authority_runtime_v141.world_id=p_world);
  return found;
end;$$;

create or replace function public.redline_authority_heartbeat_v145(
    p_code text,p_world uuid,p_instance uuid,p_state text)
returns boolean language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  if p_state not in ('allocated','lobby','countdown','racing','finished','expired','failed') then return false; end if;
  update public.redline_authority_runtime_v141
     set last_heartbeat_at=now(),expires_at=now()+interval '90 seconds',state=p_state
   where room_code=p_code and world_id=p_world and owner_instance=p_instance
     and expires_at>now();
  return found;
end;$$;

create or replace function public.redline_authority_release_v145(
    p_code text,p_world uuid,p_instance uuid)
returns boolean language plpgsql security definer
set search_path = public, pg_temp as $$
begin
  delete from public.redline_authority_runtime_v141
   where room_code=p_code and world_id=p_world and owner_instance=p_instance;
  return found;
end;$$;

revoke all on function public.redline_authority_claim_v145(text,uuid,text,integer,text,uuid) from public,anon,authenticated;
revoke all on function public.redline_authority_heartbeat_v145(text,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.redline_authority_release_v145(text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.redline_authority_claim_v145(text,uuid,text,integer,text,uuid) to service_role;
grant execute on function public.redline_authority_heartbeat_v145(text,uuid,uuid,text) to service_role;
grant execute on function public.redline_authority_release_v145(text,uuid,uuid) to service_role;
