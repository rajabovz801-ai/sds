create or replace function public.ark60_student_dashboard_summary(p_student uuid, p_today date)
returns table(active_seconds bigint, today_seconds bigint, by_module jsonb, completed jsonb, coins bigint, required_by_day jsonb)
language sql
security definer
set search_path to 'public'
as $function$
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
vocab_required as (
  select day_number,count(*)::int total
  from public.ark60_vocab_units
  where status='published'
  group by day_number
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
planned_required as (
  select d.day_number,m.module
  from generate_series(
    1,
    least(60,greatest(0,(p_today-date '2026-10-01')+1))
  ) as d(day_number)
  cross join lateral unnest(
    case
      when extract(dow from (date '2026-10-01'+(d.day_number-1)))=0
        then array['listening','reading','writing']::text[]
      else array['reading','listening','article','vocabulary','writing','speaking']::text[]
    end
  ) as m(module)
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
  select day_number,module from planned_required
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
