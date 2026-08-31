alter table public.tests add column if not exists test_scope text;

alter table public.tests drop constraint if exists tests_test_scope_check;
alter table public.tests add constraint tests_test_scope_check
  check (test_scope is null or test_scope in (
    'part-1','part-2','part-3','part-4',
    'passage-1','passage-2','passage-3',
    'full-test'
  ));

update public.tests
set test_scope = 'full-test'
where mock_only = false
  and track = 'ielts'
  and skill = 'listening'
  and test_scope is null;

update public.tests
set test_scope = 'full-test'
where mock_only = false
  and track = 'ielts'
  and skill = 'reading'
  and test_scope is null
  and title ilike '%mock%';

create index if not exists tests_track_skill_scope_status_idx
  on public.tests (track, skill, test_scope, status);
