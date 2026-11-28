-- REDLINE v150: preserve old client protocol, register Frost Vein as a new casual-only course.
alter table public.redline_rooms drop constraint redline_rooms_protocol_version_check;
alter table public.redline_rooms add constraint redline_rooms_protocol_version_check check (protocol_version in (36,37,137,150));
alter table public.redline_authority_runtime_v141 drop constraint redline_authority_runtime_v141_course_check;
alter table public.redline_authority_runtime_v141 add constraint redline_authority_runtime_v141_course_check check ((course='grand' and route_revision=37) or (course='iron' and route_revision=136) or (course='frost' and route_revision=149));
alter table public.redline_authority_matches_v140 drop constraint redline_authority_matches_v140_course_check;
alter table public.redline_authority_matches_v140 add constraint redline_authority_matches_v140_course_check check ((course='grand' and route_revision=37) or (course='iron' and route_revision=136) or (course='frost' and route_revision=149));
CREATE OR REPLACE FUNCTION public._redline_view(p_code text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
select pg_catalog.jsonb_build_object(
 'code',r.code,'topic',r.topic,'course',case when r.protocol_version=150 then 'frost' when r.protocol_version=137 then 'iron' else 'grand' end,'route_revision',case when r.protocol_version=150 then 149 when r.protocol_version=137 then 136 else 37 end,
 'stage',case when r.stage='countdown' and r.started_at<=now() then 'racing' else r.stage end,
 'started_at',r.started_at,'server_at',now(),
 'host_id',r.host_player_id,'max_players',r.max_players,
 'players',coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
 'id',p.id,'name',p.name,'slot',p.slot,'skin',p.skin,'ready',p.ready,
 'online',p.last_seen>now()-interval '22 seconds','finished_ms',p.finished_ms
 ) order by p.slot) from public.redline_players p where p.room_code=r.code),'[]'::jsonb)
) from public.redline_rooms r where r.code=p_code;
$function$
;
CREATE OR REPLACE FUNCTION public.redline_authority_control_v147(p_token text, p_action text, p_payload jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
       (case when r.protocol_version=150 then 'frost' when r.protocol_version=137 then 'iron' else 'grand' end)
         is distinct from p_payload->>'p_course' or
       (case when r.protocol_version=150 then 149 when r.protocol_version=137 then 136 else 37 end)
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
$function$
;
CREATE OR REPLACE FUNCTION public.redline_authority_claim_v145(p_code text, p_world uuid, p_course text, p_revision integer, p_host text, p_instance uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
 if p_world is null or p_instance is null or p_course is null or p_revision is null or not ((p_course='grand' and p_revision=37) or (p_course='iron' and p_revision=136) or (p_course='frost' and p_revision=149)) or p_host is null then return false; end if;
 insert into public.redline_authority_runtime_v141(room_code,world_id,course,route_revision,state,host_id,owner_instance,expires_at)
 values(p_code,p_world,p_course,p_revision,'allocated',p_host,p_instance,now()+interval '90 seconds')
 on conflict(room_code) do update set world_id=excluded.world_id,course=excluded.course,route_revision=excluded.route_revision,state='allocated',
 host_id=excluded.host_id,owner_instance=excluded.owner_instance,last_heartbeat_at=now(),expires_at=now()+interval '90 seconds'
 where public.redline_authority_runtime_v141.expires_at<now()
 or (public.redline_authority_runtime_v141.owner_instance=p_instance and public.redline_authority_runtime_v141.world_id=p_world);
 return found;
end;$function$
;
CREATE OR REPLACE FUNCTION public.redline_create_room_v150(p_name text, p_skin integer, p_course text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_data jsonb;v_code text;
BEGIN
 if p_course is null or p_course not in ('grand','iron','frost') then raise exception 'Unsupported course'; end if;
 v_data:=public.redline_create_room(p_name,p_skin);
 v_code:=v_data->'room'->>'code';
 UPDATE public.redline_rooms SET protocol_version=case when p_course='frost' then 150 when p_course='iron' then 137 else 37 end WHERE code=v_code;
 RETURN jsonb_set(v_data,'{room}',public._redline_view(v_code));
END;$function$
;
CREATE OR REPLACE FUNCTION public.redline_join_room_v150(p_code text, p_name text, p_skin integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_code text:=upper(regexp_replace(coalesce(p_code,''),'[^A-Fa-f0-9]','','g'));
v_room public.redline_rooms%rowtype;v_id uuid:=pg_catalog.gen_random_uuid();v_slot integer;v_secret text;
begin
 if char_length(v_code)<>10 or char_length(trim(coalesce(p_name,''))) not between 1 and 18 or p_skin not between 0 and 3 then
  raise exception 'Invalid room code, name, or finish';end if;
 select * into v_room from public.redline_rooms where code=v_code and expires_at>now() for update;
 if not found then raise exception 'Room not found or expired';end if;
 if v_room.protocol_version not in (37,137,150) or exists(select 1 from redline_rank.rooms where code=v_code) then raise exception 'This room cannot be joined by code';end if;
 if v_room.stage<>'lobby' then raise exception 'This race has already started';end if;
 delete from public.redline_players where room_code=v_code and last_seen<now()-interval '3 minutes' and id<>v_room.host_player_id;
 if (select count(*) from public.redline_players where room_code=v_code)>=v_room.max_players then
  raise exception 'Room is full';end if;
 select gs.slot into v_slot from pg_catalog.generate_series(1,v_room.max_players) as gs(slot)
 where not exists(select 1 from public.redline_players p where p.room_code=v_code and p.slot=gs.slot)
 order by gs.slot limit 1;
 v_secret:=pg_catalog.encode(extensions.gen_random_bytes(24),'hex');
 insert into public.redline_players(id,room_code,secret_hash,name,slot,skin)
 values(v_id,v_code,pg_catalog.sha256(pg_catalog.convert_to(v_secret,'UTF8')),trim(p_name),v_slot,p_skin);
 return pg_catalog.jsonb_build_object('secret',v_secret,'id',v_id,'room',public._redline_view(v_code));
end;$function$
;
revoke all on function public.redline_create_room_v150(text,integer,text),public.redline_join_room_v150(text,text,integer) from public;
grant execute on function public.redline_create_room_v150(text,integer,text),public.redline_join_room_v150(text,text,integer) to anon,authenticated;
