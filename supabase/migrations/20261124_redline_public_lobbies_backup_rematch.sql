
create table if not exists redline_rank.public_rooms(
 code text primary key references public.redline_rooms(code) on delete cascade,
 created_at timestamptz not null default now()
);
create table if not exists redline_rank.backups(
 pilot_id uuid primary key references redline_rank.pilots(id) on delete cascade,
 revision integer not null check(revision>0), payload jsonb not null,
 updated_at timestamptz not null default now()
);
alter table redline_rank.public_rooms enable row level security;
alter table redline_rank.backups enable row level security;
revoke all on redline_rank.public_rooms,redline_rank.backups from public,anon,authenticated;
create or replace function public.redline_public_rooms_v125() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(q)),'[]'::jsonb) from (
 select r.code,p.name host,r.max_players,(select count(*) from public.redline_players m where m.room_code=r.code) pilots
 from redline_rank.public_rooms x join public.redline_rooms r on r.code=x.code join public.redline_players p on p.id=r.host_player_id
 where r.stage='lobby' and r.expires_at>now() and p.last_seen>now()-interval '22 seconds'
 and (select count(*) from public.redline_players m where m.room_code=r.code)<r.max_players
 order by x.created_at desc limit 40) q
$$;
create or replace function public.redline_publish_room_v125(p_code text,p_id uuid,p_secret text,p_public boolean) returns boolean language plpgsql security definer set search_path='' as $$
declare v_code text:=upper(trim(p_code));r public.redline_rooms%rowtype;
begin
 if not public._redline_check(v_code,p_id,p_secret) then raise exception 'Invalid room credentials';end if;
 select * into r from public.redline_rooms where code=v_code for update;
 if r.host_player_id<>p_id or r.stage<>'lobby' or exists(select 1 from redline_rank.rooms where code=v_code) then raise exception 'Only a casual lobby host may publish a room';end if;
 if p_public is true then insert into redline_rank.public_rooms(code) values(v_code) on conflict do nothing;
 else delete from redline_rank.public_rooms where code=v_code;end if;
 return p_public is true;
end;$$;
create or replace function public.redline_room_public_v125(p_code text,p_id uuid,p_secret text) returns boolean language plpgsql stable security definer set search_path='' as $$
begin
 if not public._redline_check(p_code,p_id,p_secret) then raise exception 'Invalid room credentials';end if;
 return exists(select 1 from redline_rank.public_rooms where code=upper(trim(p_code)));
end;$$;
create or replace function public.redline_rematch_v125(p_code text,p_id uuid,p_secret text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_code text:=upper(trim(p_code));r public.redline_rooms%rowtype;
begin
 if not public._redline_check(v_code,p_id,p_secret) then raise exception 'Invalid room credentials';end if;
 select * into r from public.redline_rooms where code=v_code for update;
 if r.host_player_id<>p_id or r.stage<>'finished' or r.protocol_version<>37 or exists(select 1 from redline_rank.rooms where code=v_code) then raise exception 'Only the host of a completed casual race can rematch';end if;
 -- Scoped transient race state only; never touch pilot identity, career data or ranking ledger.
 delete from public.redline_hits_v37 where room_code=v_code;
 delete from public.redline_race_trace_v37 where room_code=v_code;
 update public.redline_players set ready=false,finished_ms=null where room_code=v_code;
 update public.redline_rooms set stage='lobby',started_at=null where code=v_code;
 return public._redline_view(v_code);
end;$$;
create or replace function public.redline_rank_backup_v125(p_id uuid,p_secret text,p_expected integer,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_backup redline_rank.backups%rowtype;v_key text;v_val jsonb;v_revision integer;
begin
 if not redline_rank.check_pilot(p_id,p_secret) then raise exception 'Invalid pilot credentials';end if;
 perform 1 from redline_rank.pilots where id=p_id for update;
 select * into v_backup from redline_rank.backups where pilot_id=p_id;
 v_revision:=coalesce(v_backup.revision,0);
 if p_data is null then return pg_catalog.jsonb_build_object('revision',v_revision,'data',v_backup.payload,'updated_at',v_backup.updated_at);end if;
 if p_expected is distinct from v_revision then raise exception 'Backup conflict; read current backup before replacing';end if;
 if jsonb_typeof(p_data)<>'object' or octet_length(p_data::text)>262144 then raise exception 'Invalid or oversized backup';end if;
 for v_key,v_val in select * from pg_catalog.jsonb_each(p_data) loop
  if v_key not in ('redline_flight_passport_v25','redline_stage4_v1','redline_v123_history_v1','redline_geologic_v3_records','redline_raven_sprint_v22_records','redline_v16_options') or jsonb_typeof(v_val)<>'string' then raise exception 'Invalid backup field';end if;
 end loop;
 insert into redline_rank.backups(pilot_id,revision,payload) values(p_id,v_revision+1,p_data)
 on conflict(pilot_id) do update set revision=excluded.revision,payload=excluded.payload,updated_at=now();
 return pg_catalog.jsonb_build_object('revision',v_revision+1,'saved',true);
end;$$;
revoke all on function public.redline_public_rooms_v125(),public.redline_publish_room_v125(text,uuid,text,boolean),public.redline_room_public_v125(text,uuid,text),public.redline_rematch_v125(text,uuid,text),public.redline_rank_backup_v125(uuid,text,integer,jsonb) from public;
grant execute on function public.redline_public_rooms_v125(),public.redline_publish_room_v125(text,uuid,text,boolean),public.redline_room_public_v125(text,uuid,text),public.redline_rematch_v125(text,uuid,text),public.redline_rank_backup_v125(uuid,text,integer,jsonb) to anon,authenticated;
