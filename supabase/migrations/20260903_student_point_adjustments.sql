create table if not exists public.student_point_adjustments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  points integer not null check (points <> 0 and points between -100000 and 100000),
  reason text null,
  created_at timestamptz not null default now()
);

create index if not exists student_point_adjustments_student_created_idx
  on public.student_point_adjustments (student_id, created_at desc);

alter table public.student_point_adjustments enable row level security;

revoke all on table public.student_point_adjustments from anon, authenticated;
grant select, insert on table public.student_point_adjustments to service_role;
