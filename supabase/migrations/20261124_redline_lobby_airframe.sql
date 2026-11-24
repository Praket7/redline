
create table if not exists redline_rank.lobby_models(
 player_id uuid primary key references public.redline_players(id) on delete cascade,
 model text not null check(model in ('kestrel','blade','copper','spirit'))
);
alter table redline_rank.lobby_models enable row level security;
revoke all on redline_rank.lobby_models from public,anon,authenticated;
create or replace function public.redline_lobby_model_v125(p_code text,p_id uuid,p_secret text,p_model text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_code text:=upper(trim(p_code));v_stage text;
begin
 if not public._redline_check(v_code,p_id,p_secret) then raise exception 'Invalid room credentials';end if;
 if p_model is null or p_model not in ('kestrel','blade','copper','spirit') then raise exception 'Invalid aircraft';end if;
 select stage into v_stage from public.redline_rooms where code=v_code for update;
 if v_stage<>'lobby' then raise exception 'Aircraft locked for this race';end if;
 insert into redline_rank.lobby_models(player_id,model) values(p_id,p_model) on conflict(player_id) do update set model=excluded.model;
 update redline_rank.members set model=p_model where code=v_code and player_id=p_id;
 update public.redline_players set ready=false where id=p_id;
 return public._redline_view(v_code);
end;$$;
create or replace function public.redline_lobby_models_v125(p_code text,p_id uuid,p_secret text) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not public._redline_check(p_code,p_id,p_secret) then raise exception 'Invalid room credentials';end if;
 return coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('id',p.id,'model',coalesce(l.model,m.model))) from public.redline_players p left join redline_rank.lobby_models l on l.player_id=p.id left join redline_rank.members m on m.player_id=p.id and m.code=p.room_code where p.room_code=upper(trim(p_code))),'[]'::jsonb);
end;$$;
revoke all on function public.redline_lobby_model_v125(text,uuid,text,text),public.redline_lobby_models_v125(text,uuid,text) from public;
grant execute on function public.redline_lobby_model_v125(text,uuid,text,text),public.redline_lobby_models_v125(text,uuid,text) to anon,authenticated;
