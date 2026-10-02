-- Student leaderboard period aggregation.
-- Additive only: existing all-time admin leaderboard RPC and coin/study accounting remain unchanged.

create or replace function public.ark60_student_leaderboard_period(p_start date default null)
returns table(
  student_id uuid,
  full_name text,
  username text,
  coins bigint,
  active_seconds bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id as student_id,
    trim(s.first_name || ' ' || s.last_name) as full_name,
    s.username,
    coalesce(c.coins,0)::bigint as coins,
    coalesce(t.active_seconds,0)::bigint as active_seconds
  from public.ark60_students s
  left join lateral (
    select coalesce(sum(e.amount),0)::bigint as coins
    from public.ark60_coin_events e
    where e.student_id=s.id
      and (
        p_start is null
        or e.created_at >= (p_start::timestamp at time zone 'Asia/Tashkent')
      )
  ) c on true
  left join lateral (
    select coalesce(sum(ss.active_seconds),0)::bigint as active_seconds
    from public.ark60_study_sessions ss
    where ss.student_id=s.id
      and (p_start is null or ss.study_date >= p_start)
  ) t on true
  where s.status='active'
    and lower(s.username)<>'rustam7'
    and (coalesce(c.coins,0)>0 or coalesce(t.active_seconds,0)>0)
  order by
    coalesce(c.coins,0) desc,
    coalesce(t.active_seconds,0) desc,
    trim(s.first_name || ' ' || s.last_name) asc;
$$;

revoke all on function public.ark60_student_leaderboard_period(date) from public;
grant execute on function public.ark60_student_leaderboard_period(date) to service_role;
