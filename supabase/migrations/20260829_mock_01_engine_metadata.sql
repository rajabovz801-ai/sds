alter table public.mocks
  add column if not exists listening_video_path text,
  add column if not exists reading_video_path text,
  add column if not exists candidate_prefix text not null default 'ARK-MOCK',
  add column if not exists dashboard_enabled boolean not null default false,
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at timestamptz;

alter table public.mock_access_codes
  add column if not exists candidate_id text,
  add column if not exists code_plain text;

create unique index if not exists mock_access_codes_mock_student_uidx
  on public.mock_access_codes(mock_id, student_id);

create unique index if not exists mock_access_codes_mock_candidate_uidx
  on public.mock_access_codes(mock_id, candidate_id)
  where candidate_id is not null;

create table if not exists public.mock_attempt_progress (
  attempt_id uuid primary key references public.attempts(id) on delete cascade,
  stage text not null default 'listening_video'
    check (stage = any (array['listening_video'::text,'listening_test'::text,'reading_video'::text,'reading_test'::text,'completed'::text])),
  listening_video_seen_at timestamptz,
  reading_video_seen_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.mock_attempt_progress enable row level security;

comment on table public.mock_attempt_progress is 'Isolated Full Mock flow progress. Keeps instruction-video and section sequencing separate from normal practice sessions.';
comment on column public.mock_access_codes.code_plain is 'Admin-only distributable one-time mock access code. Table is RLS protected and accessed server-side.';
