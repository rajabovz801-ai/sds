-- Tests execute the deployed function body with a fixed clock inside a rolled-back subtransaction.
-- No learner rows, material changes, coin entries or messages survive this probe.
do $$
declare definition text;mid uuid;r1 jsonb;r2 jsonb;r3 jsonb;n integer;total integer;receipt text;
begin
 begin
  select id into mid from cb909_materials where group_id=-1002319452850 and cycle_start='2026-10-12' and day=1;
  if mid is null then raise exception 'Probe material missing';end if;
  insert into cb909_users(telegram_id,name,group_id) values(990000000009,'Probe Student',-1002319452850);
  definition:=replace(pg_get_functiondef('public.cb909_submit(bigint,uuid,text,jsonb)'::regprocedure),'public.cb909_submit(','pg_temp.cb909_submit_probe(');
  definition:=replace(definition,'now()','(timestamptz ''2026-10-12 17:00:00+05'')');
  execute definition;
  r1:=pg_temp.cb909_submit_probe(990000000009,mid,'test',(select jsonb_build_object('answers',answer_key) from cb909_materials where id=mid));
  r2:=pg_temp.cb909_submit_probe(990000000009,mid,'test',(select jsonb_build_object('answers',answer_key) from cb909_materials where id=mid));
  if r1->>'id'<>r2->>'id' or (r1->>'score')::integer<>30 then raise exception 'Duplicate/score assertion failed';end if;
  r3:=pg_temp.cb909_submit_probe(990000000009,mid,'retell','{"kind":"voice","file_id":"probe-only"}');
  perform pg_temp.cb909_submit_probe(990000000009,mid,'retell','{"kind":"voice","file_id":"probe-only"}');
  select count(*),sum(amount) into n,total from cb909_coins where student_id=990000000009 and material_id=mid;
  if n<>3 or total<>45 then raise exception 'Coin assertion failed';end if;
  select count(*) into n from cb909_outbox where dedupe in ('result:'||(r1->>'id'),'receipt:'||(r1->>'id'),'retell:'||(r3->>'id'),'media:'||(r3->>'id'),'receipt:'||(r3->>'id'));
  if n<>5 then raise exception 'Atomic notification assertion failed';end if;
  select payload->>'text' into receipt from cb909_outbox where dedupe='receipt:'||(r1->>'id');
  if receipt not like '%30/30%' or receipt like '%Xato%' or receipt like '%coin%' or receipt like '%\%%' then raise exception 'Private short receipt assertion failed';end if;
  if not exists(select 1 from cb909_outbox where dedupe='media:'||(r3->>'id') and payload->>'_after'='retell:'||(r3->>'id')) then raise exception 'Media association failed';end if;
  begin
   perform cb909_edit_material(mid,'{"answer_key":["A"]}');
   raise exception 'Submitted key edit was incorrectly allowed';
  exception when others then if sqlerrm<>'MATERIAL_LOCKED' then raise;end if;end;
  definition:=replace(definition,'2026-10-12 17:00:00+05','2026-10-12 21:00:00+05');execute definition;
  begin
   perform pg_temp.cb909_submit_probe(990000000009,mid,'test','{"answers":["A"]}');raise exception '21:00 incorrectly accepted';
  exception when others then if sqlerrm<>'DEADLINE_CLOSED' then raise;end if;end;
  raise exception using errcode='ZX909',message='Probe success, rolling back fixtures';
 exception when sqlstate 'ZX909' then null;
 end;
end $$;
