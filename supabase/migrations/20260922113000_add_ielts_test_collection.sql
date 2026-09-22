alter table public.tests
  add column if not exists test_collection text not null default 'real-exam';

alter table public.tests
  drop constraint if exists tests_test_collection_check;

alter table public.tests
  add constraint tests_test_collection_check
  check (test_collection in ('real-exam','cambridge','gold'));

update public.tests
set test_collection = 'cambridge'
where track = 'ielts'
  and mock_only = false
  and lower(title) like '%cambridge%';

update public.tests
set test_collection = 'gold'
where track = 'ielts'
  and mock_only = false
  and lower(title) like '%gold%';

create index if not exists tests_collection_skill_scope_status_idx
  on public.tests (test_collection, track, skill, test_scope, status);

comment on column public.tests.test_collection is
  'Student IELTS library collection: real-exam, cambridge, or gold.';
