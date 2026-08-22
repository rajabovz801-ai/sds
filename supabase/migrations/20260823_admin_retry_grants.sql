-- Allow an admin to reopen a student's used test without deleting result history.
-- Existing sessions remain in analytics; only the latest non-superseded session blocks a new attempt.

alter table public.test_sessions
  add column if not exists superseded boolean not null default false;

drop index if exists public.test_sessions_one_attempt_per_test;
create unique index if not exists test_sessions_one_attempt_per_test
  on public.test_sessions(student_id, test_id)
  where superseded = false;

drop index if exists public.test_sessions_one_mock_section;
create unique index if not exists test_sessions_one_mock_section
  on public.test_sessions(mock_attempt_id, section)
  where mode = 'mock' and superseded = false;

create index if not exists test_sessions_current_attempt_lookup
  on public.test_sessions(student_id, test_id, superseded);

comment on column public.test_sessions.superseded is
  'True when an admin archived this used attempt and granted the student one fresh attempt.';
