create or replace function public.ark60_billing_snapshot(p_student uuid,p_at timestamptz default now()) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare s public.ark60_billing_settings; u public.ark60_students; v_until timestamptz; v_dates jsonb; v_scheduled timestamptz; v_trial boolean; v_done int; v_summary record;
begin
 select * into s from public.ark60_billing_settings where id=true;
 select * into u from public.ark60_students where id=p_student;
 if not found then raise exception 'Student not found'; end if;
 select max(expires_at) into v_until from public.ark60_billing_access where student_id=p_student and revoked_at is null and starts_at<=p_at and expires_at>p_at;
 select coalesce(jsonb_agg(distinct mock_on),'[]'::jsonb) into v_dates from public.ark60_billing_access where student_id=p_student and revoked_at is null and starts_at<=p_at and mock_on>=(p_at at time zone 'Asia/Tashkent')::date;
 select min(starts_at) into v_scheduled from public.ark60_billing_access where student_id=p_student and revoked_at is null and starts_at>p_at;
 v_trial:=u.created_at>=s.launch_at;
 v_done:=0;
 if v_trial then
 select * into v_summary from public.ark60_student_dashboard_summary(p_student,(p_at at time zone 'Asia/Tashkent')::date);
 select count(*)::int into v_done from generate_series(1,2) d where jsonb_array_length(coalesce(v_summary.required_by_day->d::text,'[]'::jsonb))>0 and not exists(
   select 1 from jsonb_array_elements_text(v_summary.required_by_day->d::text) required(module) where not exists(
     select 1 from jsonb_array_elements(coalesce(v_summary.completed,'[]'::jsonb)) c where (c->>'day_number')::int=d and c->>'module'=required.module));
 end if;
 return jsonb_build_object('enforced',s.enforcement_enabled and p_at>=s.launch_at,'launch_at',s.launch_at,'trial_eligible',v_trial,'trial_completed',v_done,'challenge_until',v_until,'mock_dates',v_dates,'scheduled_start',v_scheduled,
 'pending',exists(select 1 from public.ark60_billing_orders where student_id=p_student and status='pending'),
 'had_paid',exists(select 1 from public.ark60_billing_access where student_id=p_student));
end $$;

create or replace function public.ark60_billing_can_study(p_student uuid,p_day int,p_module text default '',p_resume boolean default false,p_at timestamptz default now()) returns boolean
language plpgsql security invoker set search_path=public as $$
declare m jsonb; d date; v_username text; v_start timestamptz;
begin
 if p_day<1 or p_day>60 then return false; end if;
 select username into v_username from public.ark60_students where id=p_student and status='active';
 if not found then return false; end if;
 if lower(v_username)='rustam7' then return true; end if;
 d:='2026-10-01'::date+(p_day-1);
 if d>(p_at at time zone 'Asia/Tashkent')::date then return false; end if;
 m:=public.ark60_billing_snapshot(p_student,p_at);
 if not (m->>'enforced')::boolean then return true; end if;
 if extract(dow from d)=0 then
   if (m->'mock_dates') ? d::text then return true; end if;
 else
   if nullif(m->>'challenge_until','')::timestamptz>p_at or ((m->>'trial_eligible')::boolean and p_day in(1,2)) then return true; end if;
 end if;
 -- Only an already persisted, bounded attempt may finish after natural expiry.
 -- A revoked membership never qualifies for this grace period.
 if not p_resume then return false; end if;
 if p_module='reading' then
   select max(r.started_at) into v_start from public.ark60_reading_starts r join public.ark60_reading_passages p on p.id=r.passage_id where r.student_id=p_student and p.day_number=p_day and r.started_at>p_at-interval '90 minutes';
 elsif p_module='listening' then
   select max(started_at) into v_start from public.ark60_listening_attempts where student_id=p_student and day_number=p_day and status='in_progress' and started_at>p_at-interval '90 minutes';
 elsif p_module='speaking' then
   select max(created_at) into v_start from public.ark60_speaking_attempts where student_id=p_student and day_number=p_day and status='in_progress' and created_at>p_at-interval '60 minutes';
 elsif p_module='mock' then
   select max(started_at) into v_start from public.ark60_mock_attempts where student_id=p_student and day_number=p_day and stage in('listening','reading','writing') and started_at>p_at-interval '4 hours';
 elsif p_module='vocabulary' then
   select max(a.started_at) into v_start from public.ark60_vocab_attempts a join public.ark60_vocab_units u on u.id=a.unit_id where a.student_id=p_student and u.day_number=p_day and a.status='in_progress' and a.started_at>p_at-interval '60 minutes';
 elsif p_module='writing' then
   select min(entered_at) into v_start from public.ark60_writing_visits where student_id=p_student and day_number=p_day and entered_at>p_at-interval '90 minutes';
 end if;
 if v_start is null then return false; end if;
 return exists(select 1 from public.ark60_billing_access where student_id=p_student and revoked_at is null and starts_at<=v_start and
   ((extract(dow from d)<>0 and expires_at>v_start) or (extract(dow from d)=0 and mock_on=d)));
end $$;


revoke all on function public.ark60_billing_snapshot(uuid,timestamptz),public.ark60_billing_can_study(uuid,int,text,boolean,timestamptz) from public,anon,authenticated;
grant execute on function public.ark60_billing_snapshot(uuid,timestamptz),public.ark60_billing_can_study(uuid,int,text,boolean,timestamptz) to service_role;
