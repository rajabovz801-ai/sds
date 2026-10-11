alter table public.cb909_outbox add column if not exists priority smallint not null default 50;
create index if not exists cb909_outbox_due_priority_idx on public.cb909_outbox(priority,created_at) where status='pending';

create or replace function public.cb909_submit(p_student bigint,p_material uuid,p_kind text,p_payload jsonb) returns jsonb language plpgsql security invoker set search_path=public as $$
declare m cb909_materials;u cb909_users;s cb909_settings;g cb909_groups;r cb909_submissions;d integer;n integer;v integer;header text;markup jsonb;receipt text;method text;
begin
 perform pg_advisory_xact_lock(p_student);
 perform pg_advisory_xact_lock(hashtextextended(p_material::text,909));
 select * into s from cb909_settings where id=true;
 select * into u from cb909_users where telegram_id=p_student;
 select * into g from cb909_groups where chat_id=u.group_id and chat_id=-1002319452850 and active=true;
 d=((now() at time zone 'Asia/Tashkent')::date-g.start_date)+1;
 if s.active is distinct from true or g.is_test or d is null or d not between 1 and 7 or (now() at time zone 'Asia/Tashkent')::time >= time '21:00' or (now() at time zone 'Asia/Tashkent')::time < time '08:00' then raise exception 'DEADLINE_CLOSED';end if;
 select * into m from cb909_materials where id=p_material and published=true and day=d and cycle_start=g.start_date;
 if m.id is null or u.group_id is distinct from m.group_id then raise exception 'INVALID_MATERIAL';end if;
 if p_kind='test' then
 n=jsonb_array_length(m.answer_key);
 if jsonb_typeof(p_payload->'answers') is distinct from 'array' then raise exception 'INVALID_ANSWERS';end if;
 if jsonb_array_length(p_payload->'answers')<>n or exists(select 1 from jsonb_array_elements_text(p_payload->'answers') a where a !~ '^[ABCD]$' or a is null) then raise exception 'INVALID_ANSWERS';end if;
 select count(*) into v from generate_series(0,n-1) i where p_payload->'answers'->>i=m.answer_key->>i or exists(select 1 from jsonb_array_elements_text(coalesce(m.accepted_alternatives->((i+1)::text),'[]'::jsonb)) alt where alt=p_payload->'answers'->>i);
 elsif p_kind='retell' then
 if (now() at time zone 'Asia/Tashkent')::time < time '16:00' or (coalesce(m.retell_photo_id,'')='' and coalesce(m.retell_text,'')='') then raise exception 'RETELL_NOT_OPEN';end if;
 if coalesce(p_payload->>'file_id','')='' or coalesce(p_payload->>'kind','') not in ('voice','audio','video','video_note','document') then raise exception 'INVALID_MEDIA';end if;
 else raise exception 'INVALID_KIND';end if;
 insert into cb909_submissions(student_id,material_id,kind,payload,score,total) values(p_student,p_material,p_kind,p_payload,v,n) on conflict(student_id,material_id,kind) do nothing returning * into r;
 if r.id is null then select * into r from cb909_submissions where student_id=p_student and material_id=p_material and kind=p_kind;end if;
 insert into cb909_coins(student_id,material_id,kind,amount) values(p_student,p_material,p_kind,case when p_kind='test' then r.score else 10 end) on conflict(student_id,material_id,kind) do nothing;
 if exists(select 1 from cb909_submissions where student_id=p_student and material_id=p_material and kind='test') and exists(select 1 from cb909_submissions where student_id=p_student and material_id=p_material and kind='retell') then
 insert into cb909_coins(student_id,material_id,kind,amount) values(p_student,p_material,'bonus',5) on conflict(student_id,material_id,kind) do nothing;
 end if;
 header:=replace(replace(replace(u.name,'&','&amp;'),'<','&lt;'),'>','&gt;');
 header:=E'👤 '||header||E'\n🆔 '||p_student||E'\n📚 909 · '||m.day||E'-kun\n📖 '||replace(replace(replace(coalesce(m.title,'Grammar Challenge'),'&','&amp;'),'<','&lt;'),'>','&gt;')||E'\n🔑 Kod: '||m.code;
 if p_kind='test' then
  insert into cb909_outbox(dedupe,chat_id,method,payload) values('result:'||r.id,5170628705,'sendMessage',jsonb_build_object('text',E'📊 <b>Yangi test natijasi</b>\n'||header||E'\n📝 <b>'||r.score||'/'||r.total||'</b>','parse_mode','HTML')) on conflict(dedupe) do nothing;
  receipt:=E'✅ Natijangiz saqlandi!\n📝 <b>'||r.score||'/'||r.total||'</b>';
 else
  insert into cb909_outbox(dedupe,chat_id,method,payload) values('retell:'||r.id,5170628705,'sendMessage',jsonb_build_object('text',E'🎙 <b>Retelling yuborildi</b>\n'||header,'parse_mode','HTML')) on conflict(dedupe) do nothing;
  method:=case r.payload->>'kind' when 'voice' then 'sendVoice' when 'audio' then 'sendAudio' when 'video' then 'sendVideo' when 'video_note' then 'sendVideoNote' else 'sendDocument' end;
  insert into cb909_outbox(dedupe,chat_id,method,payload) values('media:'||r.id,5170628705,method,jsonb_build_object(r.payload->>'kind',r.payload->>'file_id','_after','retell:'||r.id)) on conflict(dedupe) do nothing;
  receipt:=E'✅ Retelling qabul qilindi!';
 end if;
 update cb909_users set step='home',state='{}'::jsonb,updated_at=now() where telegram_id=p_student;
 markup:='{"inline_keyboard": [[{"text": "📝 Test javoblarini yuborish", "callback_data": "test"}], [{"text": "🎙 Retelling yuborish", "callback_data": "retell"}], [{"text": "📊 Mening natijalarim", "callback_data": "mine"}], [{"text": "👤 Profilim", "callback_data": "profile"}]]}'::jsonb;
 insert into cb909_outbox(dedupe,chat_id,method,payload,priority) values('receipt:'||r.id,p_student,'sendMessage',jsonb_build_object('text',receipt,'parse_mode','HTML','reply_markup',markup,'_menu',true),5) on conflict(dedupe) do nothing;
 return to_jsonb(r);
end $$;
revoke all on function public.cb909_submit(bigint,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.cb909_submit(bigint,uuid,text,jsonb) to service_role;


create or replace function public.cb909_edit_material(p_material uuid,p_values jsonb) returns jsonb language plpgsql security invoker set search_path=public as $$
declare m cb909_materials;k text;n integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_material::text,909));
 select * into m from cb909_materials where id=p_material for update;
 if m.id is null or m.group_id<>-1002319452850 then raise exception 'INVALID_MATERIAL';end if;
 if jsonb_typeof(p_values) is distinct from 'object' or p_values='{}'::jsonb then raise exception 'INVALID_MATERIAL_EDIT';end if;
 for k in select jsonb_object_keys(p_values) loop
  if k not in ('pdf_id','title','code','answer_key','accepted_alternatives') then raise exception 'INVALID_MATERIAL_EDIT';end if;
 end loop;
 if (p_values ? 'pdf_id' or p_values ? 'answer_key' or p_values ? 'code' or p_values ? 'accepted_alternatives') and exists(select 1 from cb909_submissions where material_id=p_material) then raise exception 'MATERIAL_LOCKED';end if;
 if p_values ? 'pdf_id' and coalesce(p_values->>'pdf_id','')='' then raise exception 'INVALID_MATERIAL_EDIT';end if;
 if p_values ? 'title' and (coalesce(length(p_values->>'title'),0) not between 1 and 120) then raise exception 'INVALID_MATERIAL_EDIT';end if;
 if p_values ? 'code' then
  if coalesce(p_values->>'code','') !~ '^[0-9]{4,8}$' then raise exception 'INVALID_MATERIAL_EDIT';end if;
  if exists(select 1 from cb909_materials where group_id=m.group_id and cycle_start=m.cycle_start and code=p_values->>'code' and id<>m.id) then raise exception 'DUPLICATE_CODE';end if;
 end if;
 if p_values ? 'answer_key' then
  if jsonb_typeof(p_values->'answer_key') is distinct from 'array' then raise exception 'INVALID_ANSWERS';end if;
  n:=jsonb_array_length(p_values->'answer_key');
  if n not between 1 and 100 or exists(select 1 from jsonb_array_elements_text(p_values->'answer_key') a where a !~ '^[ABCD]$' or a is null) then raise exception 'INVALID_ANSWERS';end if;
 end if;
 update cb909_materials set pdf_id=coalesce(p_values->>'pdf_id',pdf_id),title=coalesce(p_values->>'title',title),code=coalesce(p_values->>'code',code),answer_key=coalesce(p_values->'answer_key',answer_key),accepted_alternatives=coalesce(p_values->'accepted_alternatives',accepted_alternatives) where id=p_material returning * into m;
 return to_jsonb(m);
end $$;
revoke all on function public.cb909_edit_material(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.cb909_edit_material(uuid,jsonb) to service_role;
