
create table if not exists redline_rank.account_links_v128(
 user_id uuid primary key references auth.users(id) on delete cascade,
 pilot_id uuid not null unique references redline_rank.pilots(id) on delete cascade,
 linked_at timestamptz not null default now(),last_recovered_at timestamptz
);
alter table redline_rank.account_links_v128 enable row level security;
revoke all on redline_rank.account_links_v128 from public,anon,authenticated;
create or replace function redline_rank.verified_account_v128() returns uuid language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=auth.uid(); sid uuid;
begin
 if uid is null then raise exception 'Sign in first';end if;
 begin sid:=(auth.jwt()->>'session_id')::uuid;exception when others then raise exception 'Invalid login session';end;
 if not exists(select 1 from auth.users u join auth.sessions s on s.user_id=u.id where u.id=uid and u.email_confirmed_at is not null and not u.is_anonymous and s.id=sid and (s.not_after is null or s.not_after>now())) then raise exception 'Verified email and active session required';end if;
 return uid;
end;$$;
create or replace function public.redline_account_status_v128() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare u uuid:=redline_rank.verified_account_v128();p uuid;
begin select pilot_id into p from redline_rank.account_links_v128 where user_id=u;
 return pg_catalog.jsonb_build_object('linked',p is not null,'profile',redline_rank.profile_json(p));end;$$;
create or replace function public.redline_account_link_v128(p_id uuid,p_secret text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=redline_rank.verified_account_v128();p uuid;
begin
 if not redline_rank.check_pilot(p_id,p_secret) then raise exception 'Invalid pilot credentials';end if;
 perform pg_catalog.pg_advisory_xact_lock(1282001);
 select pilot_id into p from redline_rank.account_links_v128 where user_id=u;
 if p is not null and p<>p_id then raise exception 'Account already linked to another pilot';end if;
 if exists(select 1 from redline_rank.account_links_v128 where pilot_id=p_id and user_id<>u) then raise exception 'Pilot already linked to another account';end if;
 insert into redline_rank.account_links_v128(user_id,pilot_id) values(u,p_id) on conflict(user_id) do nothing;
 return redline_rank.profile_json(p_id);
end;$$;
create or replace function public.redline_account_recover_v128(p_new_secret text) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=redline_rank.verified_account_v128();p uuid;last_at timestamptz;
begin
 if p_new_secret is null or p_new_secret !~ '^[0-9a-f]{64}$' then raise exception 'Invalid recovery secret';end if;
 select pilot_id,last_recovered_at into p,last_at from redline_rank.account_links_v128 where user_id=u for update;
 if p is null then raise exception 'No linked pilot';end if;
 if last_at>now()-interval '30 seconds' then raise exception 'Recovery cooldown; retry in 30 seconds';end if;
 if exists(select 1 from redline_rank.members m join public.redline_rooms r on r.code=m.code join public.redline_players pp on pp.id=m.player_id where m.pilot_id=p and r.stage in ('countdown','racing') and r.expires_at>now() and pp.last_seen>now()-interval '75 seconds') then raise exception 'Finish or leave the active ranked race first';end if;
 update redline_rank.pilots set secret_hash=pg_catalog.sha256(pg_catalog.convert_to(p_new_secret,'UTF8')),updated_at=now() where id=p;
 update redline_rank.account_links_v128 set last_recovered_at=now() where user_id=u;
 return redline_rank.profile_json(p);
end;$$;
revoke all on function redline_rank.verified_account_v128() from public,anon,authenticated;
revoke all on function public.redline_account_status_v128(),public.redline_account_link_v128(uuid,text),public.redline_account_recover_v128(text) from public,anon;
grant execute on function public.redline_account_status_v128(),public.redline_account_link_v128(uuid,text),public.redline_account_recover_v128(text) to authenticated;
