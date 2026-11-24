begin;
do $$
declare a jsonb;b jsonb;ra jsonb;rb jsonb;v_code text;v_a uuid;v_b uuid;pa uuid;pb uuid;sa text;sb text;v_failed boolean;g record;v_i int;v_lap int;v_pid uuid;v_secret text;v_seq int;v_res jsonb;v_delta int;
begin
 sa:=repeat('c',32)||replace(gen_random_uuid()::text,'-','');sb:=repeat('d',32)||replace(gen_random_uuid()::text,'-','');
 a:=public.redline_rank_profile_v125(null,sa,'QA TRACE A');b:=public.redline_rank_profile_v125(null,sb,'QA TRACE B');
 pa:=(a->>'id')::uuid;pb:=(b->>'id')::uuid;
 ra:=public.redline_rank_queue_v125(pa,sa,0,'kestrel');v_code:=ra->'room'->>'code';v_a:=(ra->>'id')::uuid;
 v_failed:=false;begin perform public.redline_join_room_v37(v_code,'QA LEGACY',0);exception when others then v_failed:=true;end;if not v_failed then raise exception 'legacy bypass';end if;
 rb:=public.redline_rank_queue_v125(pb,sb,1,'spirit');v_b:=(rb->>'id')::uuid;
 if v_code<>rb->'room'->>'code' then raise exception 'match failed';end if;
 perform public.redline_lobby_model_v125(v_code,v_b,rb->>'secret','blade');
 if not exists(select 1 from redline_rank.members where code=v_code and player_id=v_b and model='blade') then raise exception 'airframe not synced';end if;
 if exists(select 1 from public.redline_players where id=v_b and ready) then raise exception 'model change did not clear ready';end if;
 v_failed:=false;begin perform public.redline_lobby_model_v125(v_code,v_b,ra->>'secret','spirit');exception when others then v_failed:=true;end;if not v_failed then raise exception 'wrong room credential';end if;
 perform public.redline_set_ready(v_code,v_b,rb->>'secret',true);perform public.redline_start_room(v_code,v_a,ra->>'secret');
 update public.redline_rooms set stage='racing',started_at=now()-interval '200 seconds' where code=v_code;
 for v_i in 1..2 loop
  v_pid:=case v_i when 1 then v_a else v_b end;v_secret:=case v_i when 1 then ra->>'secret' else rb->>'secret' end;
  v_seq:=1;v_res:=public.redline_trace_v37(v_code,v_pid,v_secret,v_seq,-1110,84,-850);
  if not (v_res->>'initial')::boolean then raise exception 'initial sample failed';end if;
  for v_lap in 1..3 loop
   for g in select * from (values
(0,-497.48,91,-971.45,0.8420547,0.5393922),(1,109.78,86,-910.72,0.6066778,-0.7949478),(2,834.22,116,-961.03,0.8309611,0.5563306),(3,717.85,64,-524.23,-0.9941104,-0.1083719),(4,758.43,101,-61.13,0.8132863,0.5818637),(5,1023.78,56,581.73,-0.4062274,0.913772),(6,488.17,113,890.9,-0.635883,-0.7717855),(7,-106.48,64,593.64,-0.8131204,0.5820956),(8,-665.18,80,1062.69,-0.9956271,0.0934165),(9,-1170.51,52,551.58,-0.1831994,-0.9830758),(10,-679.78,123,30.92,0.6399146,-0.768446),(11,-1110,84,-850,0.5606045,-0.8280837)) t(idx,gx,gy,gz,tx,tz) order by idx loop
    -- Advance fixture timestamps to model real transit without waiting 6 minutes.
    update public.redline_race_trace_v37 set last_at=now()-interval '10 seconds',last_gate_at=now()-interval '5 seconds' where room_code=v_code and player_id=v_pid;
    v_seq:=v_seq+1;perform public.redline_trace_v37(v_code,v_pid,v_secret,v_seq,g.gx-g.tx*8,g.gy,g.gz-g.tz*8);
    update public.redline_race_trace_v37 set last_at=now()-interval '0.2 seconds',last_gate_at=now()-interval '5 seconds' where room_code=v_code and player_id=v_pid;
    v_seq:=v_seq+1;v_res:=public.redline_trace_v37(v_code,v_pid,v_secret,v_seq,g.gx+g.tx*8,g.gy,g.gz+g.tz*8);
    if (v_res->>'validated_gates')::int<>(v_lap-1)*12+g.idx+1 then raise exception 'checkpoint mismatch % %',g.idx,v_res;end if;
   end loop;
  end loop;
  perform public.redline_finish_room_v37(v_code,v_pid,v_secret);
  if v_i=1 then update public.redline_rooms set started_at=now()-interval '205 seconds' where code=v_code;end if;
 end loop;
 v_delta:=(public.redline_rank_status_v125(v_code,v_a,ra->>'secret')->'receipt'->>'delta')::int;
 if v_delta<>16 then raise exception 'wrong rating %',v_delta;end if;
 if (select count(*) from redline_rank.results where code=v_code)<>2 then raise exception 'result count';end if;
end $$;
select 'PASS: 144 before/after gate samples plus 2 initial samples, 72 actual verified crossings, ranked join guard, model authorization, readiness reset, finish and automatic settlement; synthetic transit timestamps; transaction rolled back' as qa;
rollback;