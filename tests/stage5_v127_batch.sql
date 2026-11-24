begin; do $$
declare a jsonb; b jsonb; c text; id uuid; sec text; nowms bigint; r jsonb; bad boolean;
begin
 a:=public.redline_create_room_v37('QA BATCH A',0);c:=a->'room'->>'code';id:=(a->>'id')::uuid;sec:=a->>'secret';b:=public.redline_join_room_v37(c,'QA BATCH B',0);
 update public.redline_rooms set stage='racing',started_at=now()-interval '100 seconds' where code=c;
 nowms:=floor(extract(epoch from clock_timestamp())*1000);
 r:=public.redline_trace_batch_v127(c,id,sec,jsonb_build_array(jsonb_build_object('seq',1,'x',-1110,'y',84,'z',-850,'at',nowms-3000),jsonb_build_object('seq',2,'x',-504.216,'y',91,'z',-975.765,'at',nowms-500),jsonb_build_object('seq',3,'x',-490.744,'y',91,'z',-967.135,'at',nowms-200)));
 if (r->>'validated_gates')::int<>1 then raise exception 'gate not crossed %',r;end if;
 r:=public.redline_trace_batch_v127(c,id,sec,jsonb_build_array(jsonb_build_object('seq',3,'x',-490.744,'y',91,'z',-967.135,'at',nowms-200)));
 if (r->>'accepted')::int<>0 then raise exception 'replay not idempotent';end if;
 bad:=false;begin perform public.redline_trace_batch_v127(c,id,sec,jsonb_build_array(jsonb_build_object('seq',4,'x',1000,'y',91,'z',1000,'at',nowms)));exception when others then bad:=true;end;if not bad then raise exception 'teleport accepted';end if;
 bad:=false;begin perform public.redline_trace_batch_v127(c,id,sec,jsonb_build_array(jsonb_build_object('seq',4,'x',-490,'y',91,'z',-967,'at',nowms+5000)));exception when others then bad:=true;end;if not bad then raise exception 'future sample accepted';end if;
 if (select last_seq from public.redline_race_trace_v37 where room_code=c and player_id=id)<>3 then raise exception 'atomic rollback failed';end if;
end $$;select 'PASS: multi-sample gate crossing, duplicate retry, teleport/future-clock rejection, atomic failure' qa;rollback;