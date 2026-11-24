begin; do $$
declare a jsonb;b jsonb;ra jsonb;rb jsonb;c text;pa uuid;pb uuid;ia uuid;ib uuid;sa text;sb text;rr jsonb;bad boolean;
begin
 sa:=repeat('a',32)||replace(gen_random_uuid()::text,'-','');sb:=repeat('b',32)||replace(gen_random_uuid()::text,'-','');
 pa:=(public.redline_rank_profile_v125(null,sa,'QA A')->>'id')::uuid;pb:=(public.redline_rank_profile_v125(null,sb,'QA B')->>'id')::uuid;
 ra:=public.redline_rank_queue_v125(pa,sa,0,'kestrel');rb:=public.redline_rank_queue_v125(pb,sb,0,'blade');c:=ra->'room'->>'code';ia:=(ra->>'id')::uuid;ib:=(rb->>'id')::uuid;
 perform public.redline_set_ready(c,ib,rb->>'secret',true);perform public.redline_start_room(c,ia,ra->>'secret');
 update public.redline_rooms set stage='racing',started_at=now()-interval '100 seconds' where code=c;
 perform public.redline_leave_room(c,ib,rb->>'secret');
 if (select stage from public.redline_rooms where code=c)<>'racing' then raise exception 'premature finish';end if;
 if (select count(*) from redline_rank.results where code=c)<>0 then raise exception 'unearned win';end if;
 insert into public.redline_race_trace_v37(room_code,player_id,x,y,z,validated_gates) values(c,ia,0,80,0,36),(c,ib,0,80,0,36);
 bad:=false;begin perform public.redline_finish_room_v37(c,ib,rb->>'secret');exception when others then bad:=true;end;if not bad then raise exception 'forfeiter can finish';end if;
 perform public.redline_finish_room_v37(c,ia,ra->>'secret');
 rr:=public.redline_rank_status_v127(c,ia,ra->>'secret');
 if (rr->'receipt'->>'delta')::int is distinct from 16 or rr->>'terminal_reason'<>'forfeit' then raise exception 'wrong receipt %',rr;end if;
 rr:=public.redline_rank_status_v127(c,ib,rb->>'secret');
 if (rr->'receipt'->>'delta')::int is distinct from -16 then raise exception 'wrong loser receipt';end if;
 perform public.redline_rank_status_v127(c,ia,ra->>'secret');
 if (select matches from redline_rank.pilots where id=pa)<>1 then raise exception 'duplicate award';end if;
 if public.redline_match_history_v127(pb,sb)->0->>'finish_ms' is not null then raise exception 'DNF displayed as time';end if;
 if jsonb_array_length(public.redline_verified_records_v127())<1 then raise exception 'missing verified record';end if;
end $$; select 'PASS: explicit DNF, no premature rating, blocked forfeiter finish, verified winner, idempotence, DNF history and leaderboard' qa;rollback;