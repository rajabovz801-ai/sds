-- Vault secret cb909_job_auth must contain the same value as BOT909_JOB_AUTH.
-- pg_cron and pg_net are enabled on the production project.
select cron.schedule(
 'cb909-scheduler', '* * * * *',
 $$select net.http_get(
   url := 'https://ark-writing-bot.vercel.app/api/challenge_bot',
   headers := jsonb_build_object('Authorization',
     (select decrypted_secret from vault.decrypted_secrets where name='cb909_job_auth')),
   timeout_milliseconds := 55000
 );$$
);
