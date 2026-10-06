
create table if not exists public.ark60_writing_visits (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.ark60_students(id) on delete cascade,
  day_number integer not null check (day_number between 1 and 60),
  entered_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  left_at timestamptz null,
  exit_reason text null check (exit_reason is null or exit_reason in ('hidden','pagehide','back','submit','reenter','unload','timeout','unknown')),
  created_at timestamptz not null default now()
);
create index if not exists ark60_writing_visits_student_day_entered_idx
  on public.ark60_writing_visits(student_id,day_number,entered_at);
create unique index if not exists ark60_writing_visits_one_open_idx
  on public.ark60_writing_visits(student_id,day_number)
  where left_at is null;
alter table public.ark60_writing_visits enable row level security;
comment on table public.ark60_writing_visits is 'Tracks each Writing page visit/re-entry for audit timeline in the 60-day challenge.';
