create table if not exists public.ark60_internal_config(
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.ark60_internal_config enable row level security;

insert into public.ark60_internal_config(key,value)
values('speaking_cleanup_token',encode(gen_random_bytes(32),'hex'))
on conflict(key) do nothing;

do $$
declare j record;
begin
  for j in select jobid from cron.job where jobname='ark60-speaking-cleanup-hourly'
  loop perform cron.unschedule(j.jobid); end loop;
end $$;

select cron.schedule(
  'ark60-speaking-cleanup-hourly',
  '7 * * * *',
  $job$
  select net.http_post(
    url := 'https://svdigxqdivcmljirjwhk.supabase.co/functions/v1/ark60-speaking-cleanup',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'x-ark-cleanup-token',(select value from public.ark60_internal_config where key='speaking_cleanup_token')
    ),
    body := '{}'::jsonb
  );
  $job$
);
