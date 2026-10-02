-- Allow students to repeat a Listening day without overwriting earlier results.
-- Existing rows remain Attempt 1. Only one unfinished attempt may exist per student/day.

alter table public.ark60_listening_attempts
  add column if not exists attempt_number integer not null default 1;

alter table public.ark60_listening_attempts
  drop constraint if exists ark60_listening_attempts_student_id_day_number_key;

alter table public.ark60_listening_attempts
  drop constraint if exists ark60_listening_attempts_student_id_day_number_attempt_number_key;

alter table public.ark60_listening_attempts
  add constraint ark60_listening_attempts_student_id_day_number_attempt_number_key
  unique (student_id,day_number,attempt_number);

alter table public.ark60_listening_attempts
  drop constraint if exists ark60_listening_attempts_attempt_number_check;

alter table public.ark60_listening_attempts
  add constraint ark60_listening_attempts_attempt_number_check
  check (attempt_number >= 1);

create unique index if not exists ark60_listening_attempts_one_in_progress_idx
  on public.ark60_listening_attempts(student_id,day_number)
  where status='in_progress';

create index if not exists ark60_listening_attempts_student_attempt_idx
  on public.ark60_listening_attempts(student_id,day_number,attempt_number desc);
