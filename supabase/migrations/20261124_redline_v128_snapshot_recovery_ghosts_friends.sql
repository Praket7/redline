
create index if not exists rl128_trace_player_idx on public.redline_race_trace_v37(player_id);
create index if not exists rl128_hit_room_idx on public.redline_hits_v37(room_code);
create index if not exists rl128_hit_victim_idx on public.redline_hits_v37(victim_id);
create table if not exists redline_rank.pose_v128(
 room_code text not null, player_id uuid not null, seq bigint not null,
 yaw double precision not null, pitch double precision not null, roll double precision not null,
 primary key(room_code,player_id),
 foreign key(room_code,player_id) references public.redline_race_trace_v37(room_code,player_id) on delete cascade
);
create table if not exists redline_rank.samples_v128(
 room_code text not null, player_id uuid not null, elapsed_ms integer not null check(elapsed_ms between 0 and 1200000),
 x real not null,y real not null,z real not null,yaw real not null,roll real not null,
 primary key(room_code,player_id,elapsed_ms),
 foreign key(room_code,player_id) references public.redline_race_trace_v37(room_code,player_id) on delete cascade
);
create table if not exists redline_rank.ghosts_v128(
 id uuid primary key default gen_random_uuid(), pilot_id uuid not null references redline_rank.pilots(id), room_code text not null,
 model text not null check(model in ('kestrel','blade','copper','spirit')), finish_ms integer not null check(finish_ms between 20000 and 1200000),
 frames jsonb not null check(jsonb_typeof(frames)='array' and jsonb_array_length(frames) between 20 and 4001),
 published_at timestamptz not null default now(), unique(pilot_id,room_code)
);
create index if not exists rl128_ghost_week on redline_rank.ghosts_v128(published_at desc,finish_ms);
create table if not exists redline_rank.friends_v128(
 sender uuid not null references redline_rank.pilots(id) on delete cascade,
 recipient uuid not null references redline_rank.pilots(id) on delete cascade,
 accepted boolean not null default false, created_at timestamptz not null default now(),
 primary key(sender,recipient),check(sender<>recipient)
);
create index if not exists rl128_friends_in_idx on redline_rank.friends_v128(recipient);
create unique index if not exists rl128_friend_pair on redline_rank.friends_v128(least(sender,recipient),greatest(sender,recipient));
alter table redline_rank.pose_v128 enable row level security;
alter table redline_rank.samples_v128 enable row level security;
alter table redline_rank.ghosts_v128 enable row level security;
alter table redline_rank.friends_v128 enable row level security;
revoke all on redline_rank.pose_v128,redline_rank.samples_v128,redline_rank.ghosts_v128,redline_rank.friends_v128 from public,anon,authenticated;
create or replace function redline_rank.snapshots_v128(p_code text) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('id',t.player_id,'seq',t.last_seq,'p',pg_catalog.jsonb_build_array(t.x,t.y,t.z),'at',t.last_at,'yaw',coalesce(o.yaw,0),'pitch',coalesce(o.pitch,0),'roll',coalesce(o.roll,0),'gates',t.validated_gates,'model',coalesce(m.model,l.model,'kestrel'))),'[]'::jsonb)
 from public.redline_race_trace_v37 t left join redline_rank.pose_v128 o on o.room_code=t.room_code and o.player_id=t.player_id and o.seq=t.last_seq
 left join redline_rank.members m on m.code=t.room_code and m.player_id=t.player_id
 left join redline_rank.lobby_models l on l.player_id=t.player_id
 join public.redline_players p on p.id=t.player_id
 where t.room_code=p_code and t.last_at>now()-interval '8 seconds' and p.last_seen>now()-interval '75 seconds'
 and not exists(select 1 from redline_rank.terminal_v127 z where z.code=t.room_code and z.dnf_player=t.player_id)
$$;
create or replace function public.redline_trace_sync_v128(p_code text,p_id uuid,p_secret text,p_seq bigint,p_x double precision,p_y double precision,p_z double precision,p_yaw double precision,p_pitch double precision,p_roll double precision) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_code text:=upper(trim(p_code)); v_result jsonb; v_elapsed integer; v_last integer; v_start timestamptz;
begin
 if not public._redline_check(v_code,p_id,p_secret) then raise exception 'Invalid room credentials';end if;
 if exists(select 1 from redline_rank.terminal_v127 where code=v_code and dnf_player=p_id) then raise exception 'Pilot has forfeited this race';end if;
 if p_yaw is null or p_pitch is null or p_roll is null or abs(p_yaw)>100 or abs(p_pitch)>6.4 or abs(p_roll)>6.4 then raise exception 'Invalid orientation';end if;
 v_result:=public.redline_trace_v37(v_code,p_id,p_secret,p_seq,p_x,p_y,p_z);
 if (v_result->>'accepted')::boolean then
  insert into redline_rank.pose_v128 values(v_code,p_id,p_seq,p_yaw,p_pitch,p_roll) on conflict(room_code,player_id) do update set seq=excluded.seq,yaw=excluded.yaw,pitch=excluded.pitch,roll=excluded.roll where redline_rank.pose_v128.seq<excluded.seq;
  if exists(select 1 from redline_rank.rooms where code=v_code) then
   select started_at into v_start from public.redline_rooms where code=v_code;
   v_elapsed:=greatest(0,(extract(epoch from now()-v_start)*1000)::integer);
   select max(elapsed_ms) into v_last from redline_rank.samples_v128 where room_code=v_code and player_id=p_id;
   if v_elapsed<=1200000 and (v_last is null or v_elapsed-v_last>=350 or (v_result->>'validated_gates')::int=36 and v_elapsed>v_last) then
    if (select count(*) from redline_rank.samples_v128 where room_code=v_code and player_id=p_id)<4000 then
     insert into redline_rank.samples_v128 values(v_code,p_id,v_elapsed,p_x,p_y,p_z,p_yaw,p_roll) on conflict do nothing;
    end if;
   end if;
  end if;
 end if;
 return v_result||pg_catalog.jsonb_build_object('server_at',now(),'snapshots',redline_rank.snapshots_v128(v_code));
end;$$;
create or replace function public.redline_resume_state_v128(p_code text,p_id uuid,p_secret text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_code text:=upper(trim(p_code)); v_room jsonb;
begin
 if not public._redline_check(v_code,p_id,p_secret) then raise exception 'Invalid room credentials';end if;
 perform redline_rank.advance_v127(v_code);
 v_room:=public.redline_get_room(v_code,p_id,p_secret);
 return pg_catalog.jsonb_build_object('room',v_room,'snapshots',redline_rank.snapshots_v128(v_code),
 'self', (select pg_catalog.jsonb_build_object('seq',t.last_seq,'gates',t.validated_gates,'p',pg_catalog.jsonb_build_array(t.x,t.y,t.z),'yaw',coalesce(o.yaw,0),'pitch',coalesce(o.pitch,0),'roll',coalesce(o.roll,0),'at',t.last_at) from public.redline_race_trace_v37 t left join redline_rank.pose_v128 o on o.room_code=t.room_code and o.player_id=t.player_id where t.room_code=v_code and t.player_id=p_id),
 'forfeited',exists(select 1 from redline_rank.terminal_v127 where code=v_code and dnf_player=p_id));
end;$$;
create or replace function public.redline_leave_v128(p_code text,p_id uuid,p_secret text) returns boolean language plpgsql security definer set search_path='' as $$
declare v_code text:=upper(trim(p_code)); r public.redline_rooms%rowtype;
begin
 if not public._redline_check(v_code,p_id,p_secret) then return false;end if;
 select * into r from public.redline_rooms where code=v_code for update;
 if r.stage in ('countdown','racing') and exists(select 1 from redline_rank.rooms where code=v_code) then
  if exists(select 1 from public.redline_players where id=p_id and finished_ms is not null) then return true;end if;
  insert into redline_rank.terminal_v127(code,reason,dnf_player) values(v_code,'forfeit',p_id) on conflict(code) do nothing;
  update public.redline_players set last_seen=now()-interval '80 seconds' where id=p_id and room_code=v_code;
  perform redline_rank.advance_v127(v_code);return true;
 end if;
 return public.redline_leave_room(v_code,p_id,p_secret);
end;$$;
-- Legacy clients must not erase the ranked roster during an active race.
create or replace function redline_rank.prevent_active_rank_delete_v128() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.redline_rooms r join redline_rank.rooms k on k.code=r.code where r.code=old.room_code and r.stage in ('countdown','racing') and r.expires_at>now()) then raise exception 'Active ranked roster retained; use ranked leave or reconnect';end if;
 return old;
end;$$;
create trigger rl128_preserve_rank_roster before delete on public.redline_players for each row execute function redline_rank.prevent_active_rank_delete_v128();
create or replace function public.redline_publish_ghost_v128(p_code text,p_id uuid,p_secret text) returns uuid language plpgsql security definer set search_path='' as $$
declare v_code text:=upper(trim(p_code)); v_pilot uuid;v_model text;v_ms int;v_frames jsonb;v_id uuid;
begin
 if not public._redline_check(v_code,p_id,p_secret) then raise exception 'Invalid room credentials';end if;
 select m.pilot_id,m.model,p.finished_ms into v_pilot,v_model,v_ms from redline_rank.members m join public.redline_players p on p.id=m.player_id and p.room_code=m.code join public.redline_race_trace_v37 t on t.room_code=m.code and t.player_id=m.player_id where m.code=v_code and m.player_id=p_id and t.validated_gates=36 and p.finished_ms between 20000 and 1200000;
 if not found then raise exception 'A server-validated ranked finish is required';end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(elapsed_ms/1000.0,x,y,z,yaw,roll) order by elapsed_ms),'[]'::jsonb) into v_frames from redline_rank.samples_v128 where room_code=v_code and player_id=p_id;
 if jsonb_array_length(v_frames)<20 or (v_frames->0->>0)::numeric>3 or (v_frames->-1->>0)::numeric<v_ms/1000.0-5 then raise exception 'Incomplete replay trace';end if;
 insert into redline_rank.ghosts_v128(pilot_id,room_code,model,finish_ms,frames) values(v_pilot,v_code,v_model,v_ms,v_frames)
 on conflict(pilot_id,room_code) do update set frames=excluded.frames returning id into v_id;
 return v_id;
end;$$;
create or replace function public.redline_ghost_board_v128(p_week boolean default false) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(q)),'[]'::jsonb) from
 (select g.id,p.name,g.model,g.finish_ms,g.published_at from redline_rank.ghosts_v128 g join redline_rank.pilots p on p.id=g.pilot_id where not coalesce(p_week,false) or g.published_at>=date_trunc('week',now(),'UTC') order by g.finish_ms,g.id limit 50) q
$$;
create or replace function public.redline_ghost_get_v128(p_ghost uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select pg_catalog.jsonb_build_object('id',g.id,'name',p.name,'model',g.model,'finish_ms',g.finish_ms,'frames',g.frames) from redline_rank.ghosts_v128 g join redline_rank.pilots p on p.id=g.pilot_id where g.id=p_ghost
$$;
create or replace function public.redline_friend_action_v128(p_id uuid,p_secret text,p_other uuid,p_action text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not redline_rank.check_pilot(p_id,p_secret) then raise exception 'Invalid pilot credentials';end if;
 if p_other is null or p_other=p_id or not exists(select 1 from redline_rank.pilots where id=p_other) then raise exception 'Unknown pilot';end if;
 if p_action='request' then
  if (select count(*) from redline_rank.friends_v128 where sender=p_id or recipient=p_id)>=100 then raise exception 'Friends list full';end if;
  insert into redline_rank.friends_v128(sender,recipient) values(p_id,p_other) on conflict do nothing;
 elsif p_action='accept' then
  update redline_rank.friends_v128 set accepted=true where sender=p_other and recipient=p_id;
  if not found then raise exception 'No incoming request';end if;
 elsif p_action='remove' then delete from redline_rank.friends_v128 where (sender=p_id and recipient=p_other) or (sender=p_other and recipient=p_id);
 else raise exception 'Invalid friend action';end if;
 return true;
end;$$;
create or replace function public.redline_friends_v128(p_id uuid,p_secret text) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not redline_rank.check_pilot(p_id,p_secret) then raise exception 'Invalid pilot credentials';end if;
 return coalesce((select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(q)) from (select p.id,p.name,p.rating,p.matches,f.accepted,(f.recipient=p_id) incoming from redline_rank.friends_v128 f join redline_rank.pilots p on p.id=case when f.sender=p_id then f.recipient else f.sender end where f.sender=p_id or f.recipient=p_id order by f.accepted desc,p.name,p.id limit 100) q),'[]'::jsonb);
end;$$;
revoke all on function redline_rank.snapshots_v128(text),redline_rank.prevent_active_rank_delete_v128() from public,anon,authenticated;
revoke all on function public.redline_trace_sync_v128(text,uuid,text,bigint,double precision,double precision,double precision,double precision,double precision,double precision),public.redline_resume_state_v128(text,uuid,text),public.redline_leave_v128(text,uuid,text),public.redline_publish_ghost_v128(text,uuid,text),public.redline_ghost_board_v128(boolean),public.redline_ghost_get_v128(uuid),public.redline_friend_action_v128(uuid,text,uuid,text),public.redline_friends_v128(uuid,text) from public;
grant execute on function public.redline_trace_sync_v128(text,uuid,text,bigint,double precision,double precision,double precision,double precision,double precision,double precision),public.redline_resume_state_v128(text,uuid,text),public.redline_leave_v128(text,uuid,text),public.redline_publish_ghost_v128(text,uuid,text),public.redline_ghost_board_v128(boolean),public.redline_ghost_get_v128(uuid),public.redline_friend_action_v128(uuid,text,uuid,text),public.redline_friends_v128(uuid,text) to anon,authenticated;
