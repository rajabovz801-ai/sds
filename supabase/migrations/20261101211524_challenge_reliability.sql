CREATE OR REPLACE FUNCTION public.ark60_student_dashboard_summary(p_student uuid, p_today date)
 RETURNS TABLE(active_seconds bigint, today_seconds bigint, by_module jsonb, completed jsonb, coins bigint, required_by_day jsonb)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
with
time_agg as (
  select
    coalesce(sum(active_seconds),0)::bigint as active_seconds,
    coalesce(sum(active_seconds) filter (where study_date=p_today),0)::bigint as today_seconds,
    jsonb_build_object(
      'reading',coalesce(sum(active_seconds) filter (where module='reading'),0),
      'listening',coalesce(sum(active_seconds) filter (where module='listening'),0),
      'article',coalesce(sum(active_seconds) filter (where module='article'),0),
      'vocabulary',coalesce(sum(active_seconds) filter (where module='vocabulary'),0),
      'writing',coalesce(sum(active_seconds) filter (where module='writing'),0),
      'speaking',coalesce(sum(active_seconds) filter (where module='speaking'),0)
    ) as by_module
  from public.ark60_study_sessions
  where student_id=p_student
),
reading_required as (
  select day_number,count(*)::int total
  from public.ark60_reading_passages
  where status='published'
  group by day_number
),
reading_done as (
  select rr.day_number
  from reading_required rr
  where (
    select count(distinct ra.passage_id)
    from public.ark60_reading_attempts ra
    join public.ark60_reading_passages rp on rp.id=ra.passage_id
    where ra.student_id=p_student and rp.day_number=rr.day_number and rp.status='published'
  ) >= rr.total
),
article_done as (
  select a.day_number
  from public.ark60_articles a
  join public.ark60_article_progress ap on ap.article_id=a.id
  where a.status='published' and ap.student_id=p_student and ap.completed_at is not null
),
vocab_unit_sizes as (
  select
    u.day_number,
    u.id,
    (select count(*) from public.ark60_vocab_terms t where t.unit_id=u.id)::int as word_count
  from public.ark60_vocab_units u
  where u.status='published'
),
vocab_required as (
  select day_number,6::int total
  from vocab_unit_sizes
  group by day_number
  having count(*)=6 and count(*) filter (where word_count=20)=6
),
vocab_done as (
  select vr.day_number
  from vocab_required vr
  where (
    select count(*)
    from public.ark60_vocab_units u
    where u.day_number=vr.day_number and u.status='published'
      and exists (
        select 1 from public.ark60_vocab_attempts va
        where va.student_id=p_student and va.unit_id=u.id and va.status='completed'
      )
  ) >= vr.total
),
submission_done as (
  select distinct on (day_number,module)
    day_number,module,score,band,review_status
  from public.ark60_submissions
  where student_id=p_student
    and module in ('writing','listening','speaking')
  order by day_number,module,submitted_at desc
),
completed_rows as (
  select day_number,'reading'::text module,null::numeric score,null::numeric band,'reviewed'::text review_status from reading_done
  union all
  select day_number,'article',null::numeric,null::numeric,'reviewed' from article_done
  union all
  select day_number,'vocabulary',null::numeric,null::numeric,'reviewed' from vocab_done
  union all
  select day_number,module,score,band,review_status from submission_done
),
protected_mock_required as (
  -- Uploaded personal-code mocks stay available through the existing code gate.
  select d.day_number,m.module
  from (
    select day_number from public.ark60_content
    where day_number in (18,25,32) and status in ('draft','published')
      and module in ('listening','writing')
    group by day_number having count(distinct module)=2
  ) d
  cross join unnest(array['listening','reading','writing']::text[]) m(module)
  where (select count(*) from public.ark60_reading_passages rp
    where rp.day_number=d.day_number and rp.status in ('draft','published'))=3
),
published_required as (
  select distinct day_number,'reading'::text module from public.ark60_reading_passages where status='published'
  union
  select distinct day_number,'article' from public.ark60_articles where status='published'
  union
  select distinct day_number,'vocabulary' from public.ark60_vocab_units where status='published'
  union
  select distinct day_number,module from public.ark60_content
    where status='published' and module in ('writing','listening','speaking')
),
required_rows as (
  select day_number,module from protected_mock_required
  union
  select day_number,module from published_required
),
required_grouped as (
  select day_number,jsonb_agg(module order by module) modules
  from required_rows
  group by day_number
),
completed_json as (
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'day_number',day_number,
      'module',module,
      'score',score,
      'band',band,
      'review_status',review_status
    ) order by day_number,module
  ),'[]'::jsonb) as value
  from completed_rows
),
required_json as (
  select coalesce(jsonb_object_agg(day_number::text,modules),'{}'::jsonb) as value
  from required_grouped
),
coin_agg as (
  select coalesce(sum(amount),0)::bigint as coins
  from public.ark60_coin_events
  where student_id=p_student
)
select
  t.active_seconds,
  t.today_seconds,
  t.by_module,
  c.value,
  ca.coins,
  r.value
from time_agg t
cross join completed_json c
cross join coin_agg ca
cross join required_json r;
$function$;

-- Only the server may record time. Serialize across all modules and tabs.
create or replace function public.ark60_record_study_heartbeat(
  p_student uuid,p_day integer,p_module text,p_reset boolean default false
) returns integer
language plpgsql
security invoker
set search_path=public
as $function$
declare
  v_stamp timestamptz;
  v_today date;
  v_last public.ark60_study_sessions%rowtype;
  v_current public.ark60_study_sessions%rowtype;
  v_elapsed numeric;
  v_added integer;
begin
  if p_day not between 1 and 60 or p_module not in
    ('reading','listening','article','vocabulary','writing','speaking') then
    raise exception 'Invalid study module';
  end if;
  if not exists(select 1 from public.ark60_students where id=p_student and status='active') then
    raise exception 'Active student required';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_student::text,0));
  v_stamp:=clock_timestamp();
  v_today:=(v_stamp at time zone 'Asia/Tashkent')::date;
  select * into v_last from public.ark60_study_sessions
    where student_id=p_student order by last_active_at desc,id desc limit 1 for update;
  v_elapsed:=extract(epoch from (v_stamp-v_last.last_active_at));
  if p_reset or v_last.id is null or v_last.study_date<>v_today or
     v_last.day_number<>p_day or v_last.module<>p_module or
     v_elapsed > 45 or v_elapsed < 0 then
    select * into v_current from public.ark60_study_sessions
      where student_id=p_student and study_date=v_today and day_number=p_day and module=p_module
      order by last_active_at desc,id desc limit 1 for update;
    if v_current.id is null then
      insert into public.ark60_study_sessions(student_id,study_date,day_number,module,active_seconds,last_active_at)
      values(p_student,v_today,p_day,p_module,0,v_stamp);
    else
      update public.ark60_study_sessions set last_active_at=v_stamp where id=v_current.id;
    end if;
    return 0;
  end if;
  if v_elapsed < 18 then return 0; end if;
  v_added:=least(20,floor(v_elapsed)::integer);
  update public.ark60_study_sessions set
    active_seconds=active_seconds+v_added,last_active_at=v_stamp where id=v_last.id;
  return v_added;
end $function$;
revoke all on function public.ark60_record_study_heartbeat(uuid,integer,text,boolean) from public,anon,authenticated;
grant execute on function public.ark60_record_study_heartbeat(uuid,integer,text,boolean) to service_role;
