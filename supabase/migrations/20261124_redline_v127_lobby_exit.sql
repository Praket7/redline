
do $$ declare d text;begin
 select pg_get_functiondef('public.redline_leave_room(text,uuid,text)'::regprocedure) into d;
 d:=replace(d,'delete from public.redline_players where room_code=v_code and id=p_id;', 'delete from redline_rank.members where code=v_code and player_id=p_id; delete from public.redline_players where room_code=v_code and id=p_id;');
 execute d;
 -- Use an explicitly initialized null record for the timeout-without-finisher branch.
 select pg_get_functiondef('redline_rank.advance_v127(text)'::regprocedure) into d;
 d:=replace(d,'if f=a.id then win:=b;lose:=a;elsif f=b.id then win:=a;lose:=b;end if;', 'win:=a;lose:=b; if f=a.id then win:=b;lose:=a;elsif f=b.id then win:=a;lose:=b;end if;');
 execute d;
end $$;
-- Only a ready state mutation during the actual lobby stage; serialize against host start.
create or replace function public.redline_set_ready(p_code text,p_id uuid,p_secret text,p_ready boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare c text:=upper(trim(p_code));s text;
begin
 if not public._redline_check(c,p_id,p_secret) then raise exception 'Invalid room credentials';end if;
 select stage into s from public.redline_rooms where code=c for update;
 if s is distinct from 'lobby' or not public._redline_check(c,p_id,p_secret) then raise exception 'Lobby is locked';end if;
 update public.redline_players set ready=coalesce(p_ready,false),last_seen=now() where id=p_id and room_code=c;
 return public._redline_view(c);
end;$$;
