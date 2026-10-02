create table if not exists public.ark60_presence(
  student_id uuid primary key references public.ark60_students(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  last_interaction_at timestamptz not null default now(),
  current_area text not null default 'Dashboard',
  day_number integer null check (day_number between 1 and 60),
  updated_at timestamptz not null default now()
);

alter table public.ark60_presence enable row level security;
revoke all on table public.ark60_presence from anon, authenticated;
grant select, insert, update, delete on table public.ark60_presence to service_role;

create index if not exists ark60_presence_last_seen_idx
on public.ark60_presence(last_seen_at desc);
