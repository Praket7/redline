
create or replace function public.redline_trace_batch_sync_v129(p_code text,p_id uuid,p_secret text,p_samples jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare c text:=upper(trim(p_code));r jsonb;v jsonb;yaw float8;pitch float8;roll float8;seq bigint;
begin
 r:=public.redline_trace_batch_v127(c,p_id,p_secret,p_samples);seq:=(r->>'last_seq')::bigint;
 select value into v from jsonb_array_elements(p_samples) where (value->>'seq')::bigint=seq limit 1;
 if v is not null then
 yaw:=(v->>'yaw')::float8;pitch:=(v->>'pitch')::float8;roll:=(v->>'roll')::float8;
 if yaw is null or pitch is null or roll is null or abs(yaw)>100 or abs(pitch)>6.4 or abs(roll)>6.4 or yaw='NaN'::float8 or pitch='NaN'::float8 or roll='NaN'::float8 then raise exception 'Invalid orientation';end if;
 insert into redline_rank.pose_v128(room_code,player_id,seq,yaw,pitch,roll) values(c,p_id,seq,yaw,pitch,roll) on conflict(room_code,player_id) do update set seq=excluded.seq,yaw=excluded.yaw,pitch=excluded.pitch,roll=excluded.roll where redline_rank.pose_v128.seq<=excluded.seq;
 end if;
 return r||pg_catalog.jsonb_build_object('snapshots',redline_rank.snapshots_v128(c));
end;$$;
create or replace function public.redline_publish_ghost_v129(p_code text,p_id uuid,p_secret text,p_share boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare c text:=upper(trim(p_code));r record;frames jsonb;tok uuid;
begin
 if not public._redline_check(c,p_id,p_secret) then raise exception 'Invalid room credentials';end if;
 select m.pilot_id,m.model,p.finished_ms into r from redline_rank.members m join public.redline_players p on p.id=m.player_id and p.room_code=m.code join public.redline_race_trace_v37 t on t.room_code=m.code and t.player_id=m.player_id where m.code=c and m.player_id=p_id and t.validated_gates=36 and p.finished_ms between 20000 and 1200000;
 if not found then raise exception 'A completed, trace-validated ranked race is required';end if;
 perform 1 from redline_rank.pilots where id=r.pilot_id for update;
 if p_share is not true then delete from redline_rank.ghosts_v128 where pilot_id=r.pilot_id and room_code=c;return '{"shared":false}'::jsonb;end if;
 select id into tok from redline_rank.ghosts_v128 where pilot_id=r.pilot_id and room_code=c;
 if tok is not null then return pg_catalog.jsonb_build_object('shared',true,'token',tok);end if;
 if (select count(*) from redline_rank.ghosts_v128 where pilot_id=r.pilot_id)>=20 then raise exception '20 shared ghosts maximum';end if;
 select jsonb_agg(jsonb_build_array(at_ms/1000.0,x,y,z,coalesce(atan2(-(nx-x),-(nz-z)),0),0) order by at_ms) into frames
 from (select at_ms,x,y,z,lead(x) over(order by at_ms) nx,lead(z) over(order by at_ms) nz from (select *,row_number() over(order by seq) rn,count(*) over() n from redline_rank.trace_frames_v127 where code=c and player_id=p_id) v where rn=1 or rn=n or rn%2=0) q;
 if frames is null or jsonb_array_length(frames)<20 or jsonb_array_length(frames)>4001 or (frames->0->>0)::numeric>3 or (frames->-1->>0)::numeric<r.finished_ms/1000.0-5 then raise exception 'Complete replay trace unavailable';end if;
 insert into redline_rank.ghosts_v128(pilot_id,room_code,model,finish_ms,frames) values(r.pilot_id,c,r.model,r.finished_ms,frames) returning id into tok;
 return pg_catalog.jsonb_build_object('shared',true,'token',tok);
end;$$;
create or replace function public.redline_unshare_ghost_v129(p_id uuid,p_secret text,p_ghost uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if not redline_rank.check_pilot(p_id,p_secret) then raise exception 'Invalid pilot credentials';end if;
 delete from redline_rank.ghosts_v128 where id=p_ghost and pilot_id=p_id;return found;
end;$$;
create or replace function public.redline_my_ghosts_v129(p_id uuid,p_secret text) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not redline_rank.check_pilot(p_id,p_secret) then raise exception 'Invalid pilot credentials';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',id,'finish_ms',finish_ms,'model',model,'published_at',published_at) order by published_at desc) from redline_rank.ghosts_v128 where pilot_id=p_id),'[]'::jsonb);
end;$$;
-- Existing public APIs remain intact; the consolidated client uses a single v129 ghost format.
revoke all on function public.redline_trace_batch_sync_v129(text,uuid,text,jsonb),public.redline_publish_ghost_v129(text,uuid,text,boolean),public.redline_unshare_ghost_v129(uuid,text,uuid),public.redline_my_ghosts_v129(uuid,text) from public;
grant execute on function public.redline_trace_batch_sync_v129(text,uuid,text,jsonb),public.redline_publish_ghost_v129(text,uuid,text,boolean),public.redline_unshare_ghost_v129(uuid,text,uuid),public.redline_my_ghosts_v129(uuid,text) to anon,authenticated;
do $$ declare d text;begin
 select pg_get_functiondef('public.redline_match_history_v127(uuid,text)'::regprocedure) into d;
 d:=replace(d,'when t.dnf_player=m.player_id then null','when t.dnf_player=m.player_id or a.finish_ms>=3600000 then null');execute d;
end $$;
