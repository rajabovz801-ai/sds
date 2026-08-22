-- ARK Education exam control, one-attempt enforcement and admin analytics.
-- Run this once in Supabase SQL Editor before deploying the matching application code.

create extension if not exists pgcrypto;

alter table public.tests
  add column if not exists duration_minutes integer not null default 60;

update public.tests
set duration_minutes = 60
where duration_minutes is null or duration_minutes < 5 or duration_minutes > 240;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'tests_duration_minutes_range'
  ) then
    alter table public.tests
      add constraint tests_duration_minutes_range
      check (duration_minutes between 5 and 240);
  end if;
end $$;

create table if not exists public.test_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  test_id uuid not null references public.tests(id) on delete cascade,
  mock_attempt_id uuid references public.attempts(id) on delete cascade,
  mode text not null default 'practice' check (mode in ('practice', 'mock')),
  section text,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'expired')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  submitted_at timestamptz,
  raw_score numeric,
  max_score numeric,
  band numeric,
  correct_count integer,
  wrong_count integer,
  unanswered_count integer,
  duration_seconds integer,
  violation_count integer not null default 0,
  last_violation_at timestamptz,
  locked_until timestamptz,
  client_submission_id text,
  details jsonb not null default '{}'::jsonb,
  delivery jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (mode = 'practice' and mock_attempt_id is null)
    or
    (mode = 'mock' and mock_attempt_id is not null and section is not null)
  )
);

alter table public.test_sessions
  add column if not exists locked_until timestamptz;

create unique index if not exists test_sessions_one_attempt_per_test
  on public.test_sessions(student_id, test_id);

create unique index if not exists test_sessions_one_mock_section
  on public.test_sessions(mock_attempt_id, section)
  where mode = 'mock';

create index if not exists test_sessions_student_activity
  on public.test_sessions(student_id, started_at desc);

create index if not exists test_sessions_test_activity
  on public.test_sessions(test_id, started_at desc);

create index if not exists test_sessions_status_activity
  on public.test_sessions(status, started_at desc);

alter table public.test_sessions enable row level security;
revoke all on table public.test_sessions from anon, authenticated;

comment on table public.test_sessions is
  'Server-owned IELTS/CEFR exam sessions. Enforces one attempt and stores analytics.';
