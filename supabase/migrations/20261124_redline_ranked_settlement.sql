
create unique index if not exists rl5_pilot_secret_idx on redline_rank.pilots(secret_hash);
create or replace function public.redline_rank_profile_v125(p_id uuid,p_secret text,p_name text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if p_secret is null or p_secret !~ '^[0-9a-f]{64}$' or char_length(trim(coalesce(p_name,''))) not between 1 and 18 then raise exception 'Invalid pilot credentials';end if;
 if p_id is null then
  insert into redline_rank.pilots(secret_hash,name) values(pg_catalog.sha256(pg_catalog.convert_to(p_secret,'UTF8')),trim(p_name))
  on conflict(secret_hash) do update set secret_hash=excluded.secret_hash returning id into v_id;
 else
  if not redline_rank.check_pilot(p_id,p_secret) then raise exception 'Invalid pilot credentials';end if;
  v_id:=p_id;
 end if;
 return redline_rank.profile_json(v_id);
end;$$;
create or replace function redline_rank.on_finish() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.stage='finished' and old.stage is distinct from new.stage and exists(select 1 from redline_rank.rooms where code=new.code) then perform redline_rank.settle(new.code);end if;
 return new;
end;$$;
create trigger rl5_settle_on_finish after update of stage on public.redline_rooms for each row execute function redline_rank.on_finish();
revoke all on function redline_rank.on_finish() from public,anon,authenticated;
