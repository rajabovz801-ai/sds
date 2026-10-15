# Membership launch implementation plan

Goal: implement the approved two-day trial, manual Telegram receipt flow and server-enforced memberships from 19 October 2026 00:00 Asia/Tashkent.
Architecture: one service-only Postgres access snapshot/check shared by Python and Next.js. Keep existing calendar/progression rules before launch. At launch require membership or Day 1–2 trial eligibility; Sunday mocks require a dated ticket. Preserve completed reviews and bounded in-progress sessions.

- [x] Add access policy tests for old/new students, pending payments, scheduled activation, exact expiry, future days, mock isolation and renewals.
- [x] Add migration with launch switch, service-only access functions, cancelled orders, immutable audit events, date-specific approval and renewal stacking.
- [x] Wire all learning endpoints and Python day/heartbeat APIs to the same policy; keep owner-scoped result reads.
- [x] Add premium assets and membership state UI, locked-task modal, trial welcome, pending/cancel/rejected/expired/scheduled states and billing deep links.
- [x] Update admin payment filters, full-name search, exact activation preview, revocation, manual grants and lifetime totals.
- [x] Run Node/Python tests, TypeScript/build, SQL policy tests, asset checks and deploy. Enforce from launch time only; never infer receipt delivery from a Telegram link.

Rollback: disable ark60_billing_settings.enforcement_enabled; do not delete orders, access or learner results.
