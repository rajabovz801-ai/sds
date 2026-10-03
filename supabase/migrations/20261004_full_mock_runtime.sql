-- Full Mock runtime state for Sunday mock days.
-- Keeps section scores hidden from students until the complete LRW mock is finished.

create table if not exists public.ark60_mock_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.ark60_students(id) on delete cascade,
  day_number integer not null check (day_number between 1 and 60),
  stage text not null default 'listening' check (stage in ('listening','reading','writing','assessing','completed')),
  status text not null default 'in_progress' check (status in ('in_progress','assessing','completed')),
  listening_answers jsonb not null default '{}'::jsonb,
  listening_score integer,
  listening_band numeric(3,1),
  listening_part_scores jsonb,
  listening_elapsed_seconds integer not null default 0,
  listening_submitted_at timestamptz,
  reading_answers jsonb not null default '{}'::jsonb,
  reading_score integer,
  reading_band numeric(3,1),
  reading_part_scores jsonb,
  reading_elapsed_seconds integer not null default 0,
  reading_started_at timestamptz,
  reading_submitted_at timestamptz,
  writing_task1 text not null default '',
  writing_task2 text not null default '',
  writing_elapsed_seconds integer not null default 0,
  writing_started_at timestamptz,
  writing_submitted_at timestamptz,
  writing_band numeric(3,1),
  writing_assessment jsonb,
  grading_error text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(student_id,day_number)
);

create index if not exists ark60_mock_attempts_day_status_idx
  on public.ark60_mock_attempts(day_number,status,updated_at desc);

alter table public.ark60_mock_attempts enable row level security;
