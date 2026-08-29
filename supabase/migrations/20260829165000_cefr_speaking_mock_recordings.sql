create table if not exists public.cefr_speaking_mocks (
  id uuid primary key default gen_random_uuid(),
  mock_key text not null unique,
  title text not null,
  instruction_video_path text,
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cefr_speaking_recordings (
  id uuid primary key default gen_random_uuid(),
  mock_id uuid not null references public.cefr_speaking_mocks(id) on delete cascade,
  student_id uuid references public.students(id) on delete set null,
  candidate_name text not null,
  audio_path text not null,
  mime_type text,
  size_bytes bigint,
  duration_seconds integer,
  status text not null default 'uploading' check (status in ('uploading','completed','failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists cefr_speaking_recordings_mock_idx
  on public.cefr_speaking_recordings(mock_id, created_at desc);

create index if not exists cefr_speaking_recordings_student_idx
  on public.cefr_speaking_recordings(student_id, created_at desc);

alter table public.cefr_speaking_mocks enable row level security;
alter table public.cefr_speaking_recordings enable row level security;

insert into public.cefr_speaking_mocks (mock_key, title, status)
values ('mock-1', 'CEFR Speaking Mock Test 1', 'draft')
on conflict (mock_key) do nothing;
