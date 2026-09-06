create table if not exists public.shadowing_lessons (
  id uuid primary key default gen_random_uuid(),
  sequence_no integer not null unique check (sequence_no > 0),
  title text not null,
  script text not null default '',
  video_path text not null,
  status text not null default 'published' check (status in ('draft','published')),
  daily_task_enabled boolean not null default false,
  daily_task_points integer not null default 20 check (daily_task_points between 0 and 100),
  daily_task_started_at timestamptz,
  daily_task_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists shadowing_lessons_status_sequence_idx
  on public.shadowing_lessons (status, sequence_no);
create index if not exists shadowing_lessons_daily_task_idx
  on public.shadowing_lessons (daily_task_enabled, daily_task_expires_at);

create table if not exists public.shadowing_daily_task_completions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  shadowing_id uuid not null references public.shadowing_lessons(id) on delete cascade,
  points_awarded integer not null check (points_awarded >= 0),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (student_id, shadowing_id)
);

create index if not exists shadowing_daily_task_student_completed_idx
  on public.shadowing_daily_task_completions (student_id, completed_at desc);

alter table public.shadowing_lessons enable row level security;
alter table public.shadowing_daily_task_completions enable row level security;

revoke all on table public.shadowing_lessons from anon, authenticated;
revoke all on table public.shadowing_daily_task_completions from anon, authenticated;
grant select, insert, update, delete on table public.shadowing_lessons to service_role;
grant select, insert, update, delete on table public.shadowing_daily_task_completions to service_role;
