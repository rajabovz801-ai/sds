alter table public.tests
  drop constraint if exists tests_skill_check;

alter table public.tests
  add constraint tests_skill_check
  check (skill in ('reading', 'listening', 'writing', 'speaking', 'full-mock', 'vocabulary'));

comment on constraint tests_skill_check on public.tests is
  'Allowed platform test skills, including HTML vocabulary quizzes.';
