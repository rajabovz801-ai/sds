# Exam control deployment

## 1. Apply the database migration

Open the Supabase project, go to **SQL Editor**, paste the complete contents of
`supabase/migrations/20260822_exam_control.sql`, and run it once.

The migration adds:

- server-controlled test duration;
- one attempt per student and test;
- authoritative start and expiry timestamps;
- result, delivery and fullscreen-violation storage;
- indexes and locked-down RLS for the admin analytics dashboard.

Deploying the application before this migration is applied will intentionally
show an exam-control setup error instead of silently allowing an uncontrolled
attempt.

## 2. Configure server-only variables

Keep these values in Vercel environment variables, never in browser code:

```env
SUPABASE_SECRET_KEY=...
AUTH_SESSION_SECRET=...
ADMIN_ACCESS_KEY=...
ADMIN_ENTRY_CODE=...
BOT_REGISTRATION_SECRET=...
BOT_RESULTS_ENDPOINT=https://your-sysdc-host.example/path/reading.php
BOT_RESULTS_SUBMIT_KEY=...
```

`BOT_RESULTS_SUBMIT_KEY` must match SysDC `config.php`. The Telegram bot token
stays only on SysDC and is never needed by Vercel.

Use a private 4–8 digit value for `ADMIN_ENTRY_CODE`; entering it in the normal
student code field reveals the PIN step. `ADMIN_ACCESS_KEY` is the separate,
long admin PIN. `AUTH_SESSION_SECRET` must be a random value of at least 32
characters. There are no production fallback credentials.

## 3. Rotate exposed credentials

If a bot token or private app-to-app key has appeared in chat, logs, screenshots,
or git history, treat it as compromised:

1. revoke/regenerate the Telegram token through BotFather;
2. generate a new result submit key and update SysDC plus Vercel;
3. generate a new student API secret and update SysDC plus Vercel;
4. redeploy both sides and verify that old values no longer work.

## 4. Verify SysDC delivery

`reading.php` must return success only after Telegram accepts at least one admin
message. Use an explicit JSON response such as:

```json
{ "success": true, "sent_count": 2 }
```

For a failure, return a non-2xx status with:

```json
{ "success": false, "message": "Telegram API error" }
```

See `docs/sysdc-results.md` for the complete request contract.

## 5. Production smoke test

1. In admin, upload a test, set its duration, and press **Start**.
2. Log in as a test student and start the exam in fullscreen.
3. Leave fullscreen and confirm the 10-second security lock appears.
4. Submit once and confirm the result appears in the student's admin profile.
5. Confirm SysDC returns an explicit delivery count and the admin receives the message.
6. Try to start the same test again and confirm the attempt is rejected.
7. Ban the student and confirm their existing session and APIs stop working.
