# ARK IELTS stability fix — 2026-08-31

This change set intentionally avoids visual/CSS refactors and focuses on production reliability and security.

## Fixed

- Daily homework report is scheduled by the ARK IELTS project but executed by the writing-bot project so the correct Telegram bot token is used.
- Login rate limiting is durable across Vercel serverless instances, with the previous in-memory guard retained as a transient-failure fallback.
- Removed a duplicate public read policy on `tests` without changing its access rule.
- Restricted `ark_bot_release_completed_checks()` execution to server-side service access.
- Added missing foreign-key indexes reported by the database advisor.
- Added conservative response security headers that do not block camera/microphone exam flows.

## Deliberately unchanged

- Existing landing/dashboard/test CSS and layout.
- Existing session lifetime and exam behavior.
- Existing historical Supabase retry logic for transient PGRST303/timeout errors.
- Unused-index INFO notices; usage statistics are not sufficient reason to remove working indexes.
