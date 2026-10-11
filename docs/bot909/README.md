# 909 Telegram challenge

Owner: Telegram ID **5170628705**. `/admin` is authorized on the server for every callback and every upload. No Web App button or public admin setup endpoint remains in the replaced bot routes. Separate staff bots and IELTS website services are preserved.

Seven days, Asia/Tashkent. PDFs at 08:00, retelling at 16:00, daily reports at 21:00. Submissions close exactly at 21:00 in both Python and the database. One test and one retelling submission per student/day; confirmations are immutable. Student group membership and mandatory channel subscription are checked. Channel and groups must grant the bot administrator rights.

## Installation

1. Apply `schema.sql` to the Supabase project. All challenge tables use RLS and service-role access only. No existing tables are removed.
2. Deploy `api/challenge_bot.py` along with the Next.js project. Set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`). Python must include repository root on its module path.
3. Set `BOT909_WEBHOOK_URL=https://<production-host>/api/challenge_bot` and run `python -m scripts.bot909.setup`. The script sets webhook authentication, removes the default Web App menu, and adds the owner-only `/admin` command scope.
4. Run `python -m scripts.bot909.worker` on an always-on host with the same credentials. Alternatively call GET `/api/challenge_bot` every minute with an Authorization header whose full value equals `BOT909_JOB_AUTH`. A Vercel serverless function alone does **not** schedule itself. No cron is registered automatically by this change.
5. Owner opens `/admin`, adds the 909 group, activates it, configures the subscription channel/start date, uploads each day's PDF/answer key/retelling, publishes, and enables the challenge.

## Delivery and limitations

Persistent outbox deduplication prevents overlapping workers from deliberately sending the same scheduled item twice. Failed or interrupted sends remain visible in the admin delivery panel; ambiguous sends are not automatically retried because Telegram has no idempotency key. A scheduler outage can delay delivery. After 21:00, missed tests/retelling are not posted retroactively. Daily reports include absent submissions. Test keys are admin-supplied; they are not guessed from a missing PDF. Currently answer options are A–D.

Incoming private messages are deleted after processing; the previous menu is edited or replaced. Retelling originals are forwarded as media to the owner before deletion. Admin lists show the first 500 registered students and last 30 delivery events. Daily reports are split into complete HTML lines.

## Verification

`python -m unittest discover -s tests -p test_bot909.py -v`
`npm test`
`npm run typecheck`
`npm run build`

Local tests do not replace a production round trip: verify webhook secret rejection, `/admin` denial from a second account, channel membership, group joining, PDF upload/publication, scheduled delivery and deadline behavior after deployment. Existing production webhook and deployed code are unchanged until installation is completed.
