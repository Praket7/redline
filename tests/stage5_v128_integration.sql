begin;
do $$
declare a jsonb;b jsonb;ra jsonb;rb jsonb;c text;ia uuid;ib uuid;pa uuid;pb uuid;sa text;sb text;v jsonb;g uuid;failed boolean;
begin
 sa:=repeat('a',32)||replace(gen_random_uuid()::text,'-','');sb:=repeat('b',32)||replace(gen_random_uuid()::text,'-','');
 a:=public.redline_rank_profile_v125(null,sa,'QA NET A');b:=public.redline_rank_profile_v125(null,sb,'QA NET B');pa:=(a->>'id')::uuid;pb:=(b->>'id')::uuid;
 perform public.redline_friend_action_v128(pa,sa,pb,'request');
 if not (public.redline_friends_v128(pb,sb)->0->>'incoming')::boolean then raise exception 'incoming request';end if;
 failed:=false;begin perform public.redline_friend_action_v128(pa,sa,pb,'accept');exception when others then failed:=true;end;if not failed then raise exception 'sender accepted own request';end if;
 perform public.redline_friend_action_v128(pb,sb,pa,'accept');if not (public.redline_friends_v128(pa,sa)->0->>'accepted')::boolean then raise exception 'accept failed';end if;
 failed:=false;begin perform public.redline_friends_v128(pa,sb);exception when others then failed:=true;end;if not failed then raise exception 'friend privacy';end if;
 ra:=public.redline_rank_queue_v125(pa,sa,0,'kestrel');rb:=public.redline_rank_queue_v125(pb,sb,0,'blade');c:=ra->'room'->>'code';ia:=(ra->>'id')::uuid;ib:=(rb->>'id')::uuid;
 if c<>rb->'room'->>'code' then raise exception 'match';end if;
 perform public.redline_set_ready(c,ib,rb->>'secret',true);perform public.redline_start_room(c,ia,ra->>'secret');update public.redline_rooms set stage='racing',started_at=now()-interval '100 seconds' where code=c;
 v:=public.redline_trace_sync_v128(c,ia,ra->>'secret',1,-1110,84,-850,0,0,0);if not (v->>'accepted')::boolean then raise exception 'first trace';end if;
 v:=public.redline_trace_sync_v128(c,ib,rb->>'secret',1,-1110,84,-850,0.5,0,0);if jsonb_array_length(v->'snapshots')<>2 then raise exception 'peer snapshots missing';end if;
 v:=public.redline_resume_state_v128(c,ib,rb->>'secret');if (v->'self'->>'seq')::int<>1 or (v->'self'->>'yaw')::numeric<>0.5 then raise exception 'resume mismatch';end if;
 failed:=false;begin perform public.redline_resume_state_v128(c,ib,ra->>'secret');exception when others then failed:=true;end;if not failed then raise exception 'resume credentials';end if;
 perform public.redline_leave_room(c,ib,rb->>'secret');if (select count(*) from public.redline_players where room_code=c)<>2 then raise exception 'legacy roster removed';end if;
 perform public.redline_leave_v128(c,ib,rb->>'secret');if not (public.redline_resume_state_v128(c,ib,rb->>'secret')->>'forfeited')::boolean then raise exception 'forfeit absent';end if;
 failed:=false;begin perform public.redline_trace_sync_v128(c,ib,rb->>'secret',2,-1110,84,-850,0,0,0);exception when others then failed:=true;end;if not failed then raise exception 'forfeited trace accepted';end if;
 -- Controlled completion fixture; earlier v37 test separately exercises real gate geometry.
 update public.redline_race_trace_v37 set validated_gates=36,last_gate_at=now() where room_code=c and player_id=ia;
 insert into redline_rank.samples_v128(room_code,player_id,elapsed_ms,x,y,z,yaw,roll) select c,ia,i*1000,-1110,84,-850,0,0 from generate_series(0,99) i on conflict do nothing;
 perform public.redline_finish_room_v37(c,ia,ra->>'secret');v:=public.redline_rank_status_v127(c,ia,ra->>'secret');if (v->'receipt'->>'delta')::int<>16 then raise exception 'forfeit settlement %',v;end if;
 if (public.redline_match_history_v127(pb,sb)->0->>'outcome')<>'loss' then raise exception 'history';end if;
 g:=public.redline_publish_ghost_v128(c,ia,ra->>'secret');if jsonb_array_length(public.redline_ghost_get_v128(g)->'frames')<100 then raise exception 'ghost frames';end if;
 if not exists(select 1 from jsonb_array_elements(public.redline_ghost_board_v128(true)) j where j->>'id'=g::text) then raise exception 'weekly ghost';end if;
 failed:=false;begin perform public.redline_publish_ghost_v128(c,ib,rb->>'secret');exception when others then failed:=true;end;if not failed then raise exception 'DNF ghost accepted';end if;
 perform public.redline_rank_status_v127(c,ia,ra->>'secret');if (select matches from redline_rank.pilots where id=pa)<>1 then raise exception 'duplicate rank';end if;
 if has_table_privilege('anon','redline_rank.samples_v128','SELECT') or has_table_privilege('anon','redline_rank.friends_v128','SELECT') then raise exception 'private table exposed';end if;
end $$;
select 'PASS: friend requests, authorization, snapshot and resume, legacy and new forfeit roster preservation, idempotent rating, history, ghost publication and weekly board; synthetic completion; rollback' qa;
rollback;