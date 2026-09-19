alter table public.test_sessions
  add column if not exists last_seen_at timestamptz;

update public.test_sessions
set last_seen_at = coalesce(last_seen_at, started_at, created_at, now())
where last_seen_at is null;

alter table public.test_sessions
  alter column last_seen_at set default now();

create index if not exists idx_test_sessions_live_presence
  on public.test_sessions(status, last_seen_at)
  where status = 'in_progress';
