alter table public.test_sessions
  add column if not exists draft_state jsonb not null default '{}'::jsonb,
  add column if not exists draft_saved_at timestamptz;

comment on column public.test_sessions.draft_state is 'Server-side in-progress exam state used to restore mock answers and listening position after a reconnect.';
comment on column public.test_sessions.draft_saved_at is 'Last successful server autosave timestamp for draft_state.';
