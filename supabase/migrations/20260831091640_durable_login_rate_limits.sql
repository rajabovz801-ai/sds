create table if not exists public.login_rate_limits (
  bucket text primary key,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  reset_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table public.login_rate_limits enable row level security;

create or replace function public.consume_login_rate_limit(
  p_bucket text,
  p_window_seconds integer,
  p_max_attempts integer,
  p_increment boolean default false
)
returns table(allowed boolean, retry_after integer, attempt_count integer)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_count integer;
  v_reset timestamptz;
  v_window integer := greatest(1, p_window_seconds);
  v_max integer := greatest(1, p_max_attempts);
begin
  insert into public.login_rate_limits as limits (bucket, attempt_count, reset_at, updated_at)
  values (
    p_bucket,
    case when p_increment then 1 else 0 end,
    v_now + make_interval(secs => v_window),
    v_now
  )
  on conflict (bucket) do update
  set
    attempt_count = case
      when limits.reset_at <= v_now then case when p_increment then 1 else 0 end
      when p_increment then limits.attempt_count + 1
      else limits.attempt_count
    end,
    reset_at = case
      when limits.reset_at <= v_now then v_now + make_interval(secs => v_window)
      else limits.reset_at
    end,
    updated_at = v_now
  returning limits.attempt_count, limits.reset_at into v_count, v_reset;

  allowed := v_count < v_max;
  retry_after := greatest(0, ceil(extract(epoch from (v_reset - v_now)))::integer);
  attempt_count := v_count;
  return next;
end;
$$;

revoke execute on function public.consume_login_rate_limit(text, integer, integer, boolean) from public, anon, authenticated;
grant execute on function public.consume_login_rate_limit(text, integer, integer, boolean) to service_role;
