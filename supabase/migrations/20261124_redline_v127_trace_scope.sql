do $$ declare d text;begin
 select pg_get_functiondef('public.redline_trace_batch_v127(text,uuid,text,jsonb)'::regprocedure) into d;
 d:=replace(d,'declare c text','<<batch>> declare c text');
 d:=replace(d,'redline_trace_batch_v127.x','batch.x');d:=replace(d,'redline_trace_batch_v127.y','batch.y');d:=replace(d,'redline_trace_batch_v127.z','batch.z');
 execute d;
end $$;