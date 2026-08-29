alter table public.tests add column if not exists mock_only boolean not null default false;
comment on column public.tests.mock_only is 'True for tests that are only launchable inside a Full Mock flow and should not appear in normal practice libraries.';
