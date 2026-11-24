
create or replace function public.redline_trace_batch_v127(p_code text,p_id uuid,p_secret text,p_samples jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare c text:=upper(trim(p_code));r public.redline_rooms%rowtype;s public.redline_race_trace_v37%rowtype;
 v jsonb; t timestamptz; stamp timestamptz:=clock_timestamp();seq bigint;x float8;y float8;z float8;dt float8;dist float8;g record;u float8;v2 float8;frac float8;cx float8;cy float8;cz float8;has_state boolean;new_gate smallint;accepted int:=0;
begin
 if not public._redline_check(c,p_id,p_secret) then raise exception 'Invalid room credentials';end if;
 if p_samples is null or jsonb_typeof(p_samples)<>'array' or octet_length(p_samples::text)>12000 then raise exception 'Invalid sample batch';end if;
 if jsonb_array_length(p_samples) not between 1 and 32 then raise exception 'Invalid sample count';end if;
 select * into r from public.redline_rooms where code=c;
 if not found or r.stage not in ('countdown','racing') or r.started_at is null or stamp<r.started_at then raise exception 'Race is not running';end if;
 if exists(select 1 from redline_rank.terminal_v127 where code=c and dnf_player=p_id) then raise exception 'Pilot has forfeited this race';end if;
 -- Per-pilot serialization prevents first-sample insertion races without locking every racer.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(c||p_id::text,127));
 select * into s from public.redline_race_trace_v37 where room_code=c and player_id=p_id for update;has_state:=found;
 for v in select value from pg_catalog.jsonb_array_elements(p_samples) loop
  seq:=(v->>'seq')::bigint;x:=(v->>'x')::float8;y:=(v->>'y')::float8;z:=(v->>'z')::float8;
  if seq is null or seq<1 or seq>10000000 or x is null or y is null or z is null or abs(x)>1500 or abs(z)>1500 or y<4 or y>400 or x='NaN'::float8 or y='NaN'::float8 or z='NaN'::float8 then raise exception 'Invalid flight sample';end if;
  if has_state and seq<=s.last_seq then continue;end if;
  t:=to_timestamp((v->>'at')::float8/1000);
  if t is null or t>stamp+interval '350 milliseconds' or t<stamp-interval '12 seconds' or t<r.started_at-interval '350 milliseconds' then raise exception 'Sample clock outside permitted window';end if;
  t:=greatest(t,r.started_at);
  if not has_state then
   if sqrt((x+1110)^2+(z+850)^2)>180 then raise exception 'Initial position outside starting grid';end if;
   insert into public.redline_race_trace_v37(room_code,player_id,last_seq,last_at,x,y,z) values(c,p_id,seq,t,x,y,z) returning * into s;
   has_state:=true;accepted:=accepted+1;continue;
  end if;
  dt:=extract(epoch from t-s.last_at);
  if dt<.045 then continue;end if;
  dist:=sqrt((x-s.x)^2+(y-s.y)^2+(z-s.z)^2);
  if dist>470*dt+20 or abs(y-s.y)>115*dt+15 then raise exception 'Implausible flight displacement';end if;
  new_gate:=s.validated_gates;
  if new_gate<36 then
   select * into g from (values
(0,-497.48,91,-971.45,0.8420547,0.5393922,29),
(1,109.78,86,-910.72,0.6066778,-0.7949478,28),
(2,834.22,116,-961.03,0.8309611,0.5563306,28),
(3,717.85,64,-524.23,-0.9941104,-0.1083719,27),
(4,758.43,101,-61.13,0.8132863,0.5818637,28),
(5,1023.78,56,581.73,-0.4062274,0.913772,27),
(6,488.17,113,890.9,-0.635883,-0.7717855,29),
(7,-106.48,64,593.64,-0.8131204,0.5820956,28),
(8,-665.18,80,1062.69,-0.9956271,0.0934165,29),
(9,-1170.51,52,551.58,-0.1831994,-0.9830758,27),
(10,-679.78,123,30.92,0.6399146,-0.768446,29),
(11,-1110,84,-850,0.5606045,-0.8280837,31)) q(idx,gx,gy,gz,tx,tz,radius) where idx=(new_gate%12);
   u:=(s.x-g.gx)*g.tx+(s.z-g.gz)*g.tz;v2:=(x-g.gx)*g.tx+(z-g.gz)*g.tz;
   if u<0 and v2>=0 then
    frac:=-u/greatest(.000001,v2-u);cx:=s.x+(x-s.x)*frac;cy:=s.y+(y-s.y)*frac;cz:=s.z+(z-s.z)*frac;
    if (cx-g.gx)^2+(cy-g.gy)^2+(cz-g.gz)^2<(g.radius*.96+5)^2 then
     if s.last_gate_at is not null and t-s.last_gate_at<interval '0.7 seconds' then raise exception 'Checkpoint timing invalid';end if;
     new_gate:=new_gate+1;
    end if;
   end if;
  end if;
  update public.redline_race_trace_v37 set last_seq=seq,last_at=t,x=redline_trace_batch_v127.x,y=redline_trace_batch_v127.y,z=redline_trace_batch_v127.z,validated_gates=new_gate,last_gate_at=case when new_gate<>s.validated_gates then t else s.last_gate_at end where room_code=c and player_id=p_id returning * into s;
  accepted:=accepted+1;
 end loop;
 return pg_catalog.jsonb_build_object('validated_gates',coalesce(s.validated_gates,0),'last_seq',coalesce(s.last_seq,0),'accepted',accepted,'server_at',stamp);
end;$$;
revoke all on function public.redline_trace_batch_v127(text,uuid,text,jsonb) from public;
grant execute on function public.redline_trace_batch_v127(text,uuid,text,jsonb) to anon,authenticated;
