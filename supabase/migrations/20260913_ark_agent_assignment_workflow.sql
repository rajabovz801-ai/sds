create table if not exists public.ark_agent_group_members (
  chat_id bigint not null,
  user_id bigint not null,
  username text,
  first_name text,
  last_name text,
  display_name text,
  active boolean not null default true,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (chat_id, user_id)
);

create table if not exists public.ark_agent_assignments (
  id uuid primary key default gen_random_uuid(),
  staff_chat_id bigint,
  target_id uuid references public.teddy_bot_targets(id) on delete set null,
  target_chat_id bigint not null,
  target_title text,
  created_by bigint,
  title text not null,
  body text,
  assignment_type text not null default 'homework',
  status text not null default 'scheduled',
  send_at timestamptz not null default now(),
  deadline_at timestamptz,
  remind_at timestamptz,
  source_chat_id bigint,
  source_message_id bigint,
  target_message_id bigint,
  requires_submission boolean not null default true,
  allowed_submission_types text[] not null default array['photo','document']::text[],
  reminder_sent_at timestamptz,
  final_report_sent_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  pass_score integer,
  total_items integer,
  report_to_group boolean not null default true,
  report_to_staff boolean not null default true
);

create index if not exists ark_agent_assignments_target_status_idx on public.ark_agent_assignments(target_chat_id, status, send_at);
create index if not exists ark_agent_assignments_deadline_idx on public.ark_agent_assignments(status, deadline_at);

create table if not exists public.ark_agent_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.ark_agent_assignments(id) on delete cascade,
  chat_id bigint not null,
  student_user_id bigint not null,
  student_name text,
  username text,
  telegram_message_id bigint,
  submission_kind text not null,
  telegram_file_id text,
  caption text,
  status text not null default 'received',
  is_late boolean not null default false,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (assignment_id, student_user_id)
);

create index if not exists ark_agent_submissions_assignment_idx on public.ark_agent_submissions(assignment_id, submitted_at);

create table if not exists public.ark_agent_assignment_members (
  assignment_id uuid not null references public.ark_agent_assignments(id) on delete cascade,
  student_user_id bigint not null,
  student_name text,
  username text,
  added_at timestamptz not null default now(),
  primary key (assignment_id, student_user_id)
);
create index if not exists ark_agent_assignment_members_assignment_idx on public.ark_agent_assignment_members(assignment_id);

create table if not exists public.ark_agent_quiz_polls (
  assignment_id uuid not null references public.ark_agent_assignments(id) on delete cascade,
  question_no integer not null,
  poll_id text not null unique,
  question text,
  correct_option_id integer not null,
  points integer not null default 1,
  created_at timestamptz not null default now(),
  primary key (assignment_id, question_no)
);

create table if not exists public.ark_agent_quiz_answers (
  assignment_id uuid not null references public.ark_agent_assignments(id) on delete cascade,
  student_user_id bigint not null,
  question_no integer not null,
  selected_option_id integer,
  is_correct boolean not null default false,
  answered_at timestamptz not null default now(),
  primary key (assignment_id, student_user_id, question_no)
);
create index if not exists ark_agent_quiz_answers_assignment_idx on public.ark_agent_quiz_answers(assignment_id, student_user_id);

alter table public.ark_agent_group_members enable row level security;
alter table public.ark_agent_assignments enable row level security;
alter table public.ark_agent_submissions enable row level security;
alter table public.ark_agent_assignment_members enable row level security;
alter table public.ark_agent_quiz_polls enable row level security;
alter table public.ark_agent_quiz_answers enable row level security;

comment on table public.ark_agent_group_members is 'Telegram group roster learned from incoming member messages; service-role only.';
comment on table public.ark_agent_assignments is 'ARK AI Staff assignments sent or scheduled to student groups.';
comment on table public.ark_agent_submissions is 'Per-student submission state for ARK AI Staff assignments.';