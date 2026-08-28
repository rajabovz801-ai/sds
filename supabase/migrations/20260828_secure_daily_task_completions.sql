-- Keep daily task rewards server-only.
-- Application reads/writes this table through the Supabase service client.
alter table public.daily_task_completions enable row level security;
revoke all privileges on table public.daily_task_completions from anon, authenticated;
