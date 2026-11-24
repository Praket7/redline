begin;
do $$
declare u uuid:=gen_random_uuid();u2 uuid:=gen_random_uuid();sid uuid:=gen_random_uuid();sid2 uuid:=gen_random_uuid();pid uuid;sec text:=repeat('a',32)||replace(gen_random_uuid()::text,'-','');newsec text:=repeat('b',32)||replace(gen_random_uuid()::text,'-','');v jsonb;failed boolean;
begin
 insert into auth.users(id,email,email_confirmed_at) values(u,'qa-'||u::text||'@example.invalid',now()),(u2,'qa-'||u2::text||'@example.invalid',now());
 insert into auth.sessions(id,user_id,created_at,updated_at) values(sid,u,now(),now()),(sid2,u2,now(),now());
 pid:=(public.redline_rank_profile_v125(null,sec,'QA ACCOUNT')->>'id')::uuid;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated','session_id',sid)::text,true);
 if (public.redline_account_status_v128()->>'linked')::boolean then raise exception 'unexpected account';end if;
 perform public.redline_account_link_v128(pid,sec);
 if not (public.redline_account_status_v128()->>'linked')::boolean then raise exception 'link failure';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u2,'role','authenticated','session_id',sid2)::text,true);
 failed:=false;begin perform public.redline_account_link_v128(pid,sec);exception when others then failed:=true;end;if not failed then raise exception 'cross account link accepted';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated','session_id',sid)::text,true);
 v:=public.redline_account_recover_v128(newsec);
 if (v->>'id')::uuid<>pid or redline_rank.check_pilot(pid,sec) or not redline_rank.check_pilot(pid,newsec) then raise exception 'credential rotation failed';end if;
 failed:=false;begin perform public.redline_account_recover_v128(sec);exception when others then failed:=true;end;if not failed then raise exception 'recovery cooldown failed';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated','session_id',gen_random_uuid())::text,true);
 failed:=false;begin perform public.redline_account_status_v128();exception when others then failed:=true;end;if not failed then raise exception 'invalid session accepted';end if;
 if has_function_privilege('anon','public.redline_account_recover_v128(text)','EXECUTE') then raise exception 'anon recovery executable';end if;
end $$;
select 'PASS: confirmed account link, cross-account takeover rejection, recovery rotation, old secret invalidation, cooldown, invalid session rejection, anonymous denial; synthetic auth/session rows rolled back' qa;
rollback;