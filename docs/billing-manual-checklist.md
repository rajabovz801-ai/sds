# Membership release — 19 October 2026

- Existing learners: daily training remains unchanged before 19 October 00:00 Asia/Tashkent. Thereafter all new study attempts require active Challenge/All Access, or an explicit admin grant.
- Accounts created on/after launch receive Day 1 and Day 2 as free content, not a 48-hour clock. Sunday Full MOCK is excluded. Registration still follows existing admin admission approval.
- Challenge: 15,000 UZS / 7 days. MOCK: 25,000 UZS / a specific Sunday. All Access: 35,000 UZS / 7 days plus one dated ticket.
- Before-launch approvals start at launch. Renewals append seven days after remaining Challenge time; an All Access renewal also gives its dated ticket immediately at the launch/current timestamp.
- Student transfers to configured UZCARD/HUMO, clicks “To‘lov qildim”, confirms, and sends receipt privately to @rustam_usmon0v. No visible payment code. Telegram opens a draft; sending the receipt is manual. No billing bot is connected.
- Pending payments do not grant access. The student may cancel only a pending order. Super admin verifies receipt and bank credit, chooses the mock date, and approves/rejects. Optional bank transaction references must be unique.
- A mistaken approval can be revoked with a reason; this does not refund funds or delete learner results. Manual grants are separately audited and excluded from revenue.
- One shared Postgres snapshot/check secures Python and Next.js learning endpoints. Public database roles cannot call membership functions or read paid content tables.
- Post-launch dates unlock by calendar and membership rather than unfinished previous assignments. An unpurchased Sunday never blocks the next study day.
- Completed owner-scoped results/feedback remain readable. Already started Reading/Listening/Writing attempts get a bounded 90-minute continuation window; Speaking/Vocabulary 60 minutes, MOCK 4 hours. A revoked grant cannot use expiry grace. New starts still require valid access.
- Admin payment totals cover all orders; the payment list shows the most recent 200 and says so. Audit list shows the last 50 events.

## Verification
- Node access-policy and endpoint denial tests; full regression suite.
- SQL transactional test: before/after launch, old/new learner, pending, trial, dated mock, exclusive expiry, renewal stacking, cancelled orders, revocation and service-only RPC permissions. All fixtures rolled back.
- Browser fixtures: locked modal, confirmation before POST, Telegram handoff with identity and no code, pending protection, cancellation, trial welcome, direct URL lock, desktop/mobile/dark screenshots. No real money or Telegram receipt sent.
- TypeScript and production build.

## Rollback
Set `public.ark60_billing_settings.enforcement_enabled=false` through an authorized server/admin database operation. Keep orders, access and results. Re-enable after fixing the issue. Before launch this switch never restricts current daily training.
