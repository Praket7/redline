begin; do $$
declare a jsonb;b jsonb;ra jsonb;rb jsonb;c text;pa uuid;pb uuid;ia uuid;ib uuid;sa text;sb text;rr jsonb;ms bigint;g uuid;ok boolean;v jsonb;
begin
sa:=repeat('e',32)||replace(gen_random_uuid()::text,'-','');sb:=repeat('f',32)||replace(gen_random_uuid()::text,'-','');
pa:=(public.redline_rank_profile_v125(null,sa,'QA INTEGRATED A')->>'id')::uuid;pb:=(public.redline_rank_profile_v125(null,sb,'QA INTEGRATED B')->>'id')::uuid;
perform public.redline_friend_action_v128(pa,sa,pb,'request');perform public.redline_friend_action_v128(pb,sb,pa,'accept');
if not (public.redline_friends_v128(pa,sa)->0->>'accepted')::boolean then raise exception 'friends failed';end if;
ra:=public.redline_rank_queue_v125(pa,sa,0,'kestrel');rb:=public.redline_rank_queue_v125(pb,sb,0,'blade');c:=ra->'room'->>'code';ia:=(ra->>'id')::uuid;ib:=(rb->>'id')::uuid;
perform public.redline_set_ready(c,ib,rb->>'secret',true);perform public.redline_start_room(c,ia,ra->>'secret');
update public.redline_rooms set stage='racing',started_at=now()-interval '100 seconds' where code=c;
ms:=floor(extract(epoch from clock_timestamp())*1000);
rr:=public.redline_trace_batch_sync_v129(c,ia,ra->>'secret',jsonb_build_array(jsonb_build_object('seq',1,'x',-1110,'y',84,'z',-850,'at',ms-3000,'yaw',0.2,'pitch',0,'roll',0),jsonb_build_object('seq',2,'x',-504.216,'y',91,'z',-975.765,'at',ms-500,'yaw',0.3,'pitch',0,'roll',0),jsonb_build_object('seq',3,'x',-490.744,'y',91,'z',-967.135,'at',ms-200,'yaw',0.4,'pitch',0,'roll',0)));
if (rr->>'validated_gates')::int<>1 or jsonb_array_length(rr->'snapshots')<>1 then raise exception 'batch snapshots %',rr;end if;
rr:=public.redline_resume_state_v128(c,ia,ra->>'secret');if (rr->'self'->>'seq')::int<>3 then raise exception 'resume %',rr;end if;
update public.redline_race_trace_v37 set validated_gates=36 where room_code=c and player_id=ia;
perform public.redline_finish_room_v37(c,ia,ra->>'secret');
update public.redline_players set last_seen=now()-interval '80 seconds' where id=ib;
rr:=public.redline_rank_status_v127(c,ia,ra->>'secret');
if (rr->'receipt'->>'delta')::int is distinct from 16 or rr->>'terminal_reason'<>'disconnect' then raise exception 'disconnect result %',rr;end if;
insert into redline_rank.trace_frames_v127(code,player_id,seq,at_ms,x,y,z,gates)
select c,ia,1000+i,i*1000,10+i,90,20+i,case when i=100 then 36 else 0 end from generate_series(0,100) i;
rr:=public.redline_publish_ghost_v129(c,ia,ra->>'secret',true);g:=(rr->>'token')::uuid;
if jsonb_array_length(public.redline_ghost_get_v128(g)->'frames')<20 then raise exception 'ghost frames';end if;
if public.redline_unshare_ghost_v129(pb,sb,g) then raise exception 'other user removed ghost';end if;
ok:=public.redline_unshare_ghost_v129(pa,sa,g);v:=public.redline_ghost_get_v128(g);
if not ok or v is not null then raise exception 'unshare failed % %',ok,v;end if;
end $$;select 'PASS: friend acceptance, batched snapshot and resume, disconnect settlement, synthetic completed ghost publishing, ownership and revocation' qa;rollback;