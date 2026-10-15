-- Resume permission is tied to one persisted unfinished passage.
create or replace function public.ark60_billing_can_resume_reading(p_student uuid,p_passage uuid,p_at timestamptz default now()) returns boolean
language sql security invoker set search_path=public as $$
 select exists(
 select 1 from ark60_reading_starts r
 join ark60_reading_passages p on p.id=r.passage_id
 join ark60_students u on u.id=r.student_id and u.status='active'
 where r.student_id=p_student and r.passage_id=p_passage
 and r.started_at<=p_at and r.started_at>p_at-interval '90 minutes'
 and ('2026-10-01'::date+p.day_number-1)<=(p_at at time zone 'Asia/Tashkent')::date
 and extract(dow from ('2026-10-01'::date+p.day_number-1))<>0
 and not exists(select 1 from ark60_reading_attempts a where a.student_id=p_student and a.passage_id=p_passage)
 and exists(select 1 from ark60_billing_access b where b.student_id=p_student and b.revoked_at is null and b.starts_at<=r.started_at and b.expires_at>r.started_at)
 );
$$;
revoke all on function public.ark60_billing_can_resume_reading(uuid,uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.ark60_billing_can_resume_reading(uuid,uuid,timestamptz) to service_role;
