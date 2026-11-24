
create schema if not exists redline_rank;
revoke all on schema redline_rank from public,anon,authenticated;
create table if not exists redline_rank.pilots(
 id uuid primary key default gen_random_uuid(), secret_hash bytea not null, name text not null check(char_length(name) between 1 and 18),
 rating integer not null default 1000 check(rating between 100 and 4000), matches integer not null default 0, wins integer not null default 0,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists redline_rank.rooms(
 code text primary key references public.redline_rooms(code) on delete cascade, created_at timestamptz not null default now()
);
create table if not exists redline_rank.members(
 code text not null references redline_rank.rooms(code) on delete cascade,
 player_id uuid not null, pilot_id uuid not null references redline_rank.pilots(id),
 model text not null check(model in ('kestrel','blade','copper','spirit')),
 primary key(code,player_id), unique(code,pilot_id)
);
create index if not exists rl5_members_pilot_idx on redline_rank.members(pilot_id);
create table if not exists redline_rank.results(
 code text not null, pilot_id uuid not null references redline_rank.pilots(id), opponent_id uuid not null references redline_rank.pilots(id),
 finish_ms integer not null, rating_before integer not null, rating_after integer not null, outcome text not null check(outcome in ('win','loss','draw')),
 played_at timestamptz not null default now(), primary key(code,pilot_id)
);
create index if not exists rl5_results_pilot_idx on redline_rank.results(pilot_id,played_at desc);
create index if not exists rl5_results_opponent_idx on redline_rank.results(opponent_id);
alter table redline_rank.pilots enable row level security;
alter table redline_rank.rooms enable row level security;
alter table redline_rank.members enable row level security;
alter table redline_rank.results enable row level security;
revoke all on all tables in schema redline_rank from public,anon,authenticated;
create or replace function redline_rank.check_pilot(p_id uuid,p_secret text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from redline_rank.pilots p where p.id=p_id and p.secret_hash=pg_catalog.sha256(pg_catalog.convert_to(p_secret,'UTF8'))) and coalesce(p_secret ~ '^[0-9a-f]{64}$',false)
$$;
create or replace function redline_rank.profile_json(p_id uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select pg_catalog.jsonb_build_object('id',id,'name',name,'rating',rating,'matches',matches,'wins',wins) from redline_rank.pilots where id=p_id
$$;
create or replace function public.redline_rank_profile_v125(p_id uuid,p_secret text,p_name text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if p_secret is null or p_secret !~ '^[0-9a-f]{64}$' or char_length(trim(coalesce(p_name,''))) not between 1 and 18 then raise exception 'Invalid pilot credentials';end if;
 if p_id is null then
  insert into redline_rank.pilots(secret_hash,name) values(pg_catalog.sha256(pg_catalog.convert_to(p_secret,'UTF8')),trim(p_name)) returning id into v_id;
 else
  if not redline_rank.check_pilot(p_id,p_secret) then raise exception 'Invalid pilot credentials';end if;
  v_id:=p_id;
 end if;
 return redline_rank.profile_json(v_id);
end;$$;
-- Protect the matchmaking roster from older room-join endpoints.
create or replace function redline_rank.guard_join() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from redline_rank.rooms where code=new.room_code) and coalesce(pg_catalog.current_setting('redline.rank_join',true),'')<>'allowed' then
  raise exception 'Ranked rooms must be joined through matchmaking';
 end if;
 return new;
end;$$;
create trigger rl5_guard_ranked_join before insert on public.redline_players for each row execute function redline_rank.guard_join();
create or replace function public.redline_rank_queue_v125(p_id uuid,p_secret text,p_skin integer,p_model text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_p redline_rank.pilots%rowtype;v_code text;v_data jsonb;v_player uuid;
begin
 if not redline_rank.check_pilot(p_id,p_secret) then raise exception 'Invalid pilot credentials';end if;
 if p_skin is null or p_skin not between 0 and 3 or p_model is null or p_model not in ('kestrel','blade','copper','spirit') then raise exception 'Invalid aircraft';end if;
 perform pg_catalog.pg_advisory_xact_lock(1253701);
 select * into v_p from redline_rank.pilots where id=p_id;
 if exists(select 1 from redline_rank.members m join public.redline_rooms r on r.code=m.code join public.redline_players p on p.id=m.player_id where m.pilot_id=p_id and r.stage<>'finished' and r.expires_at>now() and p.last_seen>now()-interval '45 seconds') then raise exception 'Already queued or in a ranked race; leave that room first';end if;
 select rr.code into v_code from redline_rank.rooms rr join public.redline_rooms r on r.code=rr.code join redline_rank.members m on m.code=rr.code join redline_rank.pilots opp on opp.id=m.pilot_id join public.redline_players p on p.id=m.player_id
 where r.stage='lobby' and r.expires_at>now() and p.last_seen>now()-interval '22 seconds' and m.pilot_id<>p_id
 and (select count(*) from public.redline_players where room_code=r.code)=1
 and (select count(*) from redline_rank.members where code=r.code)=1
 and abs(opp.rating-v_p.rating)<=least(600,150+floor(extract(epoch from now()-rr.created_at)/15)*50)
 order by abs(opp.rating-v_p.rating),rr.created_at limit 1 for update of r;
 if v_code is null then
  v_data:=public.redline_create_room_v37(v_p.name,p_skin);
  v_code:=v_data->'room'->>'code';
  update public.redline_rooms set max_players=2 where code=v_code;
  insert into redline_rank.rooms(code) values(v_code);
 else
  perform pg_catalog.set_config('redline.rank_join','allowed',true);
  v_data:=public.redline_join_room_v37(v_code,v_p.name,p_skin);
  perform pg_catalog.set_config('redline.rank_join','',true);
 end if;
 v_player:=(v_data->>'id')::uuid;
 insert into redline_rank.members(code,player_id,pilot_id,model) values(v_code,v_player,p_id,p_model);
 return v_data||pg_catalog.jsonb_build_object('room',public._redline_view(v_code),'ranked',true);
end;$$;
-- Server settlement is idempotent and only uses both validated finishes.
create or replace function redline_rank.settle(p_code text) returns void language plpgsql security definer set search_path='' as $$
declare a record;b record;v_expected numeric;v_actual numeric;v_change integer;v_ra integer;v_rb integer;
begin
 perform pg_catalog.pg_advisory_xact_lock(1253702);
 if exists(select 1 from redline_rank.results where code=p_code) then return;end if;
 if not exists(select 1 from redline_rank.rooms rr join public.redline_rooms r on r.code=rr.code where rr.code=p_code and r.stage='finished' and r.protocol_version=37) then return;end if;
 if (select count(*) from redline_rank.members where code=p_code)<>2 or (select count(*) from public.redline_players where room_code=p_code)<>2 then return;end if;
 select m.pilot_id,p.finished_ms,pp.rating into a from redline_rank.members m join public.redline_players p on p.id=m.player_id and p.room_code=m.code join redline_rank.pilots pp on pp.id=m.pilot_id join public.redline_race_trace_v37 t on t.player_id=p.id and t.room_code=m.code where m.code=p_code and p.finished_ms is not null and t.validated_gates=36 order by m.pilot_id limit 1;
 if not found then return;end if;
 select m.pilot_id,p.finished_ms,pp.rating into b from redline_rank.members m join public.redline_players p on p.id=m.player_id and p.room_code=m.code join redline_rank.pilots pp on pp.id=m.pilot_id join public.redline_race_trace_v37 t on t.player_id=p.id and t.room_code=m.code where m.code=p_code and p.finished_ms is not null and t.validated_gates=36 and m.pilot_id<>a.pilot_id limit 1;
 if not found then return;end if;
 -- Repeated pair farming is limited to three rated matches per UTC day.
 if (select count(*) from redline_rank.results where pilot_id=a.pilot_id and opponent_id=b.pilot_id and played_at>=date_trunc('day',now(),'UTC'))>=3 then return;end if;
 v_expected:=1/(1+power(10::numeric,(b.rating-a.rating)/400.0));
 v_actual:=case when a.finished_ms<b.finished_ms then 1 when a.finished_ms>b.finished_ms then 0 else .5 end;
 v_change:=round(32*(v_actual-v_expected));v_ra:=greatest(100,least(4000,a.rating+v_change));v_rb:=greatest(100,least(4000,b.rating-v_change));
 insert into redline_rank.results(code,pilot_id,opponent_id,finish_ms,rating_before,rating_after,outcome) values
 (p_code,a.pilot_id,b.pilot_id,a.finished_ms,a.rating,v_ra,case v_actual when 1 then 'win' when 0 then 'loss' else 'draw' end),
 (p_code,b.pilot_id,a.pilot_id,b.finished_ms,b.rating,v_rb,case v_actual when 0 then 'win' when 1 then 'loss' else 'draw' end);
 update redline_rank.pilots set rating=v_ra,matches=matches+1,wins=wins+(case when v_actual=1 then 1 else 0 end),updated_at=now() where id=a.pilot_id;
 update redline_rank.pilots set rating=v_rb,matches=matches+1,wins=wins+(case when v_actual=0 then 1 else 0 end),updated_at=now() where id=b.pilot_id;
end;$$;
create or replace function public.redline_rank_status_v125(p_code text,p_id uuid,p_secret text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_code text:=upper(trim(p_code));v_pilot uuid;v_receipt jsonb;
begin
 if not public._redline_check(v_code,p_id,p_secret) then raise exception 'Invalid room credentials';end if;
 if not exists(select 1 from redline_rank.rooms where code=v_code) then return '{"ranked":false}'::jsonb;end if;
 perform redline_rank.settle(v_code);
 select pilot_id into v_pilot from redline_rank.members where code=v_code and player_id=p_id;
 select pg_catalog.jsonb_build_object('before',rating_before,'after',rating_after,'delta',rating_after-rating_before,'outcome',outcome) into v_receipt from redline_rank.results where code=v_code and pilot_id=v_pilot;
 return pg_catalog.jsonb_build_object('ranked',true,'profile',redline_rank.profile_json(v_pilot),'receipt',v_receipt,'members',coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('id',m.player_id,'rating',p.rating,'matches',p.matches,'model',m.model)) from redline_rank.members m join redline_rank.pilots p on p.id=m.pilot_id where m.code=v_code),'[]'::jsonb));
end;$$;
create or replace function public.redline_rank_board_v125() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.to_jsonb(q)),'[]'::jsonb) from (select name,rating,matches,wins from redline_rank.pilots where matches>=1 order by rating desc,matches desc,id limit 50) q
$$;
revoke all on all functions in schema redline_rank from public,anon,authenticated;
revoke all on function public.redline_rank_profile_v125(uuid,text,text),public.redline_rank_queue_v125(uuid,text,integer,text),public.redline_rank_status_v125(text,uuid,text),public.redline_rank_board_v125() from public;
grant execute on function public.redline_rank_profile_v125(uuid,text,text),public.redline_rank_queue_v125(uuid,text,integer,text),public.redline_rank_status_v125(text,uuid,text),public.redline_rank_board_v125() to anon,authenticated;
