-- Additive, server-only live mock state; existing attempts remain untouched.
create table if not exists public.ark60_mock_live (
 student_id uuid not null references public.ark60_students(id) on delete cascade,
 day_number integer not null check(day_number between 1 and 60),
 allowed boolean not null default false,
 snapshot jsonb,
 snapshot_at timestamptz,
 heartbeat_at timestamptz not null default now(),
 viewed_at timestamptz,
 primary key(student_id,day_number)
);
alter table public.ark60_mock_live enable row level security;
revoke all on public.ark60_mock_live from anon,authenticated;
grant select,insert,update,delete on public.ark60_mock_live to service_role;
