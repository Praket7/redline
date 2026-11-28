-- V148 casual DeLorean model metadata; ranked membership rules unchanged.
alter table redline_rank.lobby_models drop constraint lobby_models_model_check;
alter table redline_rank.lobby_models add constraint lobby_models_model_check check (model in ('kestrel','blade','copper','spirit','delorean'));
create or replace function public.redline_lobby_model_v125(p_code text,p_id uuid,p_secret text,p_model text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_code text:=upper(trim(p_code));v_stage text;
begin
 if not public._redline_check(v_code,p_id,p_secret) then raise exception 'Invalid room credentials';end if;
 if p_model is null or p_model not in ('kestrel','blade','copper','spirit','delorean') then raise exception 'Invalid aircraft';end if;
 select stage into v_stage from public.redline_rooms where code=v_code for update;
 if v_stage<>'lobby' then raise exception 'Aircraft locked for this race';end if;
 if p_model='delorean' and exists(select 1 from redline_rank.rooms where code=v_code) then raise exception 'DeLorean is casual-only';end if;
 insert into redline_rank.lobby_models(player_id,model) values(p_id,p_model) on conflict(player_id) do update set model=excluded.model;
 update redline_rank.members set model=p_model where code=v_code and player_id=p_id;
 update public.redline_players set ready=false where id=p_id;
 return public._redline_view(v_code);
end;$$;
