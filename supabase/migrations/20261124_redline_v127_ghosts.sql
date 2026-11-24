
create table if not exists redline_rank.trace_frames_v127(
 code text not null references public.redline_rooms(code) on delete cascade,player_id uuid not null references public.redline_players(id) on delete cascade,
 seq bigint not null,at_ms integer not null check(at_ms between 0 and 1205000), x real not null,y real not null,z real not null,gates smallint not null,
 primary key(code,player_id,seq)
);
create index if not exists rl127_frame_player_idx on redline_rank.trace_frames_v127(player_id);
create table if not exists redline_rank.ghosts_v127(
 token uuid primary key default gen_random_uuid(),code text not null,pilot_id uuid not null references redline_rank.pilots(id),
 name text not null,finish_ms integer not null,model text not null,frames jsonb not null,created_at timestamptz not null default now(),unique(code,pilot_id)
);
create index if not exists rl127_ghost_pilot_idx on redline_rank.ghosts_v127(pilot_id);
alter table redline_rank.trace_frames_v127 enable row level security;
alter table redline_rank.ghosts_v127 enable row level security;
revoke all on redline_rank.trace_frames_v127,redline_rank.ghosts_v127 from public,anon,authenticated;
create or replace function redline_rank.record_frame_v127() returns trigger language plpgsql security definer set search_path='' as $$
declare start_at timestamptz;ms integer;prev integer;
begin
 if tg_op='UPDATE' then if new.last_seq<=old.last_seq then return new;end if;end if;
 if not exists(select 1 from redline_rank.rooms where code=new.room_code) then return new;end if;
 select started_at into start_at from public.redline_rooms where code=new.room_code;
 if start_at is null then return new;end if;
 ms:=greatest(0,floor(extract(epoch from new.last_at-start_at)*1000)::int);
 if ms>1205000 then return new;end if;
 select at_ms into prev from redline_rank.trace_frames_v127 where code=new.room_code and player_id=new.player_id order by seq desc limit 1;
 if prev is not null and (ms<=prev or (ms-prev<250 and new.validated_gates<36)) then return new;end if;
 insert into redline_rank.trace_frames_v127(code,player_id,seq,at_ms,x,y,z,gates) values(new.room_code,new.player_id,new.last_seq,ms,new.x,new.y,new.z,new.validated_gates) on conflict do nothing;
 return new;
end;$$;
create trigger rl127_capture_trace after insert or update on public.redline_race_trace_v37 for each row execute function redline_rank.record_frame_v127();
create or replace function public.redline_share_ghost_v127(p_id uuid,p_secret text,p_code text,p_share boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare c text:=upper(trim(p_code));r record;frames jsonb;tok uuid;existing uuid;
begin
 if not redline_rank.check_pilot(p_id,p_secret) then raise exception 'Invalid pilot credentials';end if;
 perform 1 from redline_rank.pilots where id=p_id for update;
 if p_share is not true then delete from redline_rank.ghosts_v127 where code=c and pilot_id=p_id;return '{"shared":false}'::jsonb;end if;
 select token into existing from redline_rank.ghosts_v127 where code=c and pilot_id=p_id;
 if existing is not null then return pg_catalog.jsonb_build_object('shared',true,'token',existing);end if;
 if (select count(*) from redline_rank.ghosts_v127 where pilot_id=p_id)>=20 then raise exception '20 shared ghosts maximum; unshare an old ghost first';end if;
 select a.finish_ms,p.name,m.model,m.player_id into r from redline_rank.results a join redline_rank.pilots p on p.id=a.pilot_id join redline_rank.members m on m.code=a.code and m.pilot_id=a.pilot_id where a.code=c and a.pilot_id=p_id and a.finish_ms<3600000;
 if not found then raise exception 'A rated, completed finish is required';end if;
 select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(at_ms,x,y,z) order by seq) into frames from redline_rank.trace_frames_v127 where code=c and player_id=r.player_id;
 if frames is null or jsonb_array_length(frames)<3 or jsonb_array_length(frames)>5000 or not exists(select 1 from redline_rank.trace_frames_v127 where code=c and player_id=r.player_id and gates=36) then raise exception 'Complete server trace unavailable';end if;
 insert into redline_rank.ghosts_v127(code,pilot_id,name,finish_ms,model,frames) values(c,p_id,r.name,r.finish_ms,r.model,frames) returning token into tok;
 return pg_catalog.jsonb_build_object('shared',true,'token',tok);
end;$$;
create or replace function public.redline_ghost_v127(p_token uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select pg_catalog.jsonb_build_object('name',name,'finish_ms',finish_ms,'model',model,'frames',frames,'course','grand','handling','sport') from redline_rank.ghosts_v127 where token=p_token
$$;
create or replace function public.redline_ghost_list_v127(p_id uuid,p_secret text) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not redline_rank.check_pilot(p_id,p_secret) then raise exception 'Invalid pilot credentials';end if;
 return coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('code',code,'token',token,'finish_ms',finish_ms,'created_at',created_at) order by created_at desc) from redline_rank.ghosts_v127 where pilot_id=p_id),'[]'::jsonb);
end;$$;
revoke all on function redline_rank.record_frame_v127() from public,anon,authenticated;
revoke all on function public.redline_share_ghost_v127(uuid,text,text,boolean),public.redline_ghost_v127(uuid),public.redline_ghost_list_v127(uuid,text) from public;
grant execute on function public.redline_share_ghost_v127(uuid,text,text,boolean),public.redline_ghost_v127(uuid),public.redline_ghost_list_v127(uuid,text) to anon,authenticated;
