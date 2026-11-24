
create table if not exists redline_rank.terminal_v127 (
 code text primary key, reason text not null check(reason in ('forfeit','disconnect','timeout','pair_limit','completed')),
 dnf_player uuid, ended_at timestamptz not null default now()
);
alter table redline_rank.terminal_v127 enable row level security;
revoke all on redline_rank.terminal_v127 from public,anon,authenticated;
create index if not exists rl127_hits_victim_idx on public.redline_hits_v37(victim_id);
create index if not exists rl127_hits_attacker_idx on public.redline_hits_v37(attacker_id);
create index if not exists rl127_trace_player_idx on public.redline_race_trace_v37(player_id);
-- Keep all room mutations in the same lock order: room before player, then settlement.
create or replace function redline_rank.advance_v127(p_code text) returns void language plpgsql security definer set search_path='' as $$
declare r public.redline_rooms%rowtype; a record;b record; win record; lose record; f uuid; why text; v_change integer; n integer; vr integer; lr integer;
begin
 select * into r from public.redline_rooms where code=p_code for update;
 if not found or r.stage not in ('countdown','racing') or r.started_at is null or r.started_at>now() or not exists(select 1 from redline_rank.rooms where code=p_code) then return;end if;
 if (select count(*) from public.redline_players where room_code=p_code)<>2 then return;end if;
 select p.id,p.finished_ms,p.last_seen,m.pilot_id,pp.rating,coalesce(t.validated_gates,0) gates into a from public.redline_players p join redline_rank.members m on m.code=p.room_code and m.player_id=p.id join redline_rank.pilots pp on pp.id=m.pilot_id left join public.redline_race_trace_v37 t on t.room_code=p.room_code and t.player_id=p.id where p.room_code=p_code order by p.id limit 1;
 if not found then return;end if;
 select p.id,p.finished_ms,p.last_seen,m.pilot_id,pp.rating,coalesce(t.validated_gates,0) gates into b from public.redline_players p join redline_rank.members m on m.code=p.room_code and m.player_id=p.id join redline_rank.pilots pp on pp.id=m.pilot_id left join public.redline_race_trace_v37 t on t.room_code=p.room_code and t.player_id=p.id where p.room_code=p_code and p.id<>a.id;
 if not found then return;end if;
 select dnf_player,reason into f,why from redline_rank.terminal_v127 where code=p_code;
 if why is null then
  if a.finished_ms is null and a.last_seen<now()-interval '75 seconds' and b.finished_ms is not null then f:=a.id;why:='disconnect';
  elsif b.finished_ms is null and b.last_seen<now()-interval '75 seconds' and a.finished_ms is not null then f:=b.id;why:='disconnect';
  elsif now()>r.started_at+interval '20 minutes' then why:='timeout';if a.finished_ms is null and b.finished_ms is not null then f:=a.id;elsif b.finished_ms is null and a.finished_ms is not null then f:=b.id;end if;
  else return;end if;
 end if;
 if f=a.id then win:=b;lose:=a;elsif f=b.id then win:=a;lose:=b;end if;
 if f is not null and win.finished_ms is null and why<>'timeout' and now()<=r.started_at+interval '20 minutes' then return;end if;
 perform pg_catalog.pg_advisory_xact_lock(1253702);
 if exists(select 1 from redline_rank.results where code=p_code) then return;end if;
 if f is not null and win.finished_ms is not null and win.gates=36 and lose.finished_ms is null then
  select count(*) into n from redline_rank.results where pilot_id=win.pilot_id and opponent_id=lose.pilot_id and played_at>=date_trunc('day',now(),'UTC');
  if n<3 then
   select rating into vr from redline_rank.pilots where id=win.pilot_id;
   select rating into lr from redline_rank.pilots where id=lose.pilot_id;
   v_change:=round(32*(1-1/(1+power(10::numeric,(lr-vr)/400.0))));
   insert into redline_rank.results(code,pilot_id,opponent_id,finish_ms,rating_before,rating_after,outcome) values
   (p_code,win.pilot_id,lose.pilot_id,win.finished_ms,vr,least(4000,vr+v_change),'win'),
   (p_code,lose.pilot_id,win.pilot_id,3600000,lr,greatest(100,lr-v_change),'loss');
   update redline_rank.pilots set rating=least(4000,vr+v_change),matches=matches+1,wins=wins+1,updated_at=now() where id=win.pilot_id;
   update redline_rank.pilots set rating=greatest(100,lr-v_change),matches=matches+1,updated_at=now() where id=lose.pilot_id;
  else why:='pair_limit';end if;
 end if;
 insert into redline_rank.terminal_v127(code,reason,dnf_player) values(p_code,why,f) on conflict(code) do update set reason=excluded.reason,dnf_player=excluded.dnf_player,ended_at=now();
 update public.redline_rooms set stage='finished' where code=p_code;
end;$$;
create or replace function public.redline_get_room(p_code text,p_id uuid,p_secret text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_code text:=upper(trim(p_code));v_host uuid;v_stage text;
begin
 if not public._redline_check(v_code,p_id,p_secret) then raise exception 'Invalid room credentials';end if;
 select stage into v_stage from public.redline_rooms where code=v_code for update;
 if not found or not public._redline_check(v_code,p_id,p_secret) then raise exception 'Invalid room credentials';end if;
 if not exists(select 1 from redline_rank.terminal_v127 where code=v_code and dnf_player=p_id) then
 update public.redline_players set last_seen=now() where id=p_id and room_code=v_code;end if;
 if v_stage='lobby' then
 select p.id into v_host from public.redline_players p join public.redline_rooms r on r.code=p.room_code where r.code=v_code and p.id=r.host_player_id and p.last_seen>now()-interval '22 seconds';
 if v_host is null then select p.id into v_host from public.redline_players p where p.room_code=v_code and p.last_seen>now()-interval '22 seconds' order by p.slot limit 1;
 if v_host is not null then update public.redline_rooms set host_player_id=v_host where code=v_code;end if;end if;
 end if;
 update public.redline_rooms set stage='racing' where code=v_code and stage='countdown' and started_at<=now();
 perform redline_rank.advance_v127(v_code);
 update public.redline_rooms set expires_at=greatest(expires_at,now()+interval '45 minutes') where code=v_code;
 return public._redline_view(v_code);
end;$$;
create or replace function public.redline_leave_room(p_code text,p_id uuid,p_secret text) returns boolean language plpgsql security definer set search_path='' as $$
declare v_code text:=upper(trim(p_code));v_host uuid;r public.redline_rooms%rowtype;
begin
 if not public._redline_check(v_code,p_id,p_secret) then return false;end if;
 select * into r from public.redline_rooms where code=v_code for update;
 if not found or not public._redline_check(v_code,p_id,p_secret) then return false;end if;
 if exists(select 1 from redline_rank.rooms where code=v_code) and r.stage in ('countdown','racing','finished') then
  if r.stage='finished' then return true;end if;
  if r.started_at>now() then
   insert into redline_rank.terminal_v127(code,reason,dnf_player) values(v_code,'forfeit',p_id) on conflict do nothing;
   update public.redline_rooms set stage='finished' where code=v_code;
  elsif exists(select 1 from public.redline_players where id=p_id and finished_ms is null) then
   insert into redline_rank.terminal_v127(code,reason,dnf_player) values(v_code,'forfeit',p_id) on conflict do nothing;
   perform redline_rank.advance_v127(v_code);
  end if;
  return true;
 end if;
 delete from public.redline_players where room_code=v_code and id=p_id;
 select id into v_host from public.redline_players where room_code=v_code order by slot limit 1;
 if v_host is null then delete from public.redline_rooms where code=v_code;
 else update public.redline_rooms set host_player_id=v_host where code=v_code and host_player_id=p_id;end if;
 return true;
end;$$;
-- Prevent a forfeited pilot from finishing via an old client.
create or replace function redline_rank.guard_finish_v127() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.finished_ms is not null and old.finished_ms is null and exists(select 1 from redline_rank.terminal_v127 where code=new.room_code and dnf_player=new.id) then raise exception 'Pilot has forfeited this race';end if;
 return new;
end;$$;
create trigger rl127_guard_finish before update of finished_ms on public.redline_players for each row execute function redline_rank.guard_finish_v127();
create or replace function public.redline_rank_status_v127(p_code text,p_id uuid,p_secret text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_code text:=upper(trim(p_code)); d jsonb;t redline_rank.terminal_v127%rowtype;
begin
 if not public._redline_check(v_code,p_id,p_secret) then raise exception 'Invalid room credentials';end if;
 perform redline_rank.advance_v127(v_code);
 d:=public.redline_rank_status_v125(v_code,p_id,p_secret);
 select * into t from redline_rank.terminal_v127 where code=v_code;
 return d||pg_catalog.jsonb_build_object('terminal_reason',t.reason,'dnf_player',t.dnf_player,'verified',coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('id',player_id,'gates',validated_gates)) from public.redline_race_trace_v37 where room_code=v_code),'[]'::jsonb));
end;$$;
create or replace function public.redline_match_history_v127(p_id uuid,p_secret text) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not redline_rank.check_pilot(p_id,p_secret) then raise exception 'Invalid pilot credentials';end if;
 return coalesce((select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(q)) from (select a.code,b.name opponent,a.outcome,a.rating_before,a.rating_after,a.rating_after-a.rating_before delta,case when t.dnf_player=m.player_id then null else a.finish_ms end finish_ms,a.played_at,coalesce(t.reason,'completed') reason from redline_rank.results a join redline_rank.pilots b on b.id=a.opponent_id left join redline_rank.terminal_v127 t on t.code=a.code left join redline_rank.members m on m.code=a.code and m.pilot_id=a.pilot_id where a.pilot_id=p_id order by a.played_at desc limit 30) q),'[]'::jsonb);
end;$$;
create or replace function public.redline_verified_records_v127() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(q)),'[]'::jsonb) from (select p.name,min(a.finish_ms) finish_ms,count(*) matches from redline_rank.results a join redline_rank.pilots p on p.id=a.pilot_id where a.finish_ms<3600000 group by p.id,p.name order by min(a.finish_ms),p.id limit 50) q
$$;
revoke all on function redline_rank.advance_v127(text),redline_rank.guard_finish_v127() from public,anon,authenticated;
revoke all on function public.redline_rank_status_v127(text,uuid,text),public.redline_match_history_v127(uuid,text),public.redline_verified_records_v127() from public;
grant execute on function public.redline_rank_status_v127(text,uuid,text),public.redline_match_history_v127(uuid,text),public.redline_verified_records_v127() to anon,authenticated;
