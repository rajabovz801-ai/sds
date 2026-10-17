# Day 18 personal mock access — QA and operating notes

## Approved scope
18 October 2026, 09:00 Asia/Tashkent (04:00 UTC). Each code belongs to one active student account and Day 18. Super admin confirms payment and issues, replaces or revokes access. No Shop, global billing, historical mock or student-result changes.

## Operation
Admin → Full Mock → Day 18 → search/select learner → tick payment confirmation → create code. The generated code and recipient are shown once and can be copied. Stored values are SHA-256 hashes and a four-character hint; the full code cannot be recovered. Replacing it revokes the previous code. Revoking a student from a stale admin page revokes that student's current Day 18 access.

Before 09:00, only rustam7 preview can read material. At 09:00 the ordinary dashboard entry becomes available and its server gate asks for a personal code. This is request-time scheduling; it requires no timed publication job. All five material rows stay draft. Successful redemption persists across sessions; every subsequent mock request rechecks the grant. Five failed attempts cause a 15-minute account/day lock.

Revocation/rotation interrupts active autosave, heartbeat and assessment polling. The gate replaces the exam and pauses client activity. Same-tab re-entry preserves unsaved Reading/Writing text and refreshes the remaining time from the server. A full page reload only recovers drafts already saved to the server. Existing Listening restart-on-leave rules are retained.

## Verification
- Database rollback tests: issue, wrong-account denial, idempotent redemption, rotation, five-failure lockout, lock expiry, stale-admin revoke, no new results, no anonymous/authenticated table or RPC access.
- HTTP-handler tests: super-admin and explicit payment confirmation, session-derived student identity, foreign-origin denial, invalid-code accounting, all Day 18 content/write actions denied before any content query when not open or not redeemed.
- Client tests: rejected requests surface the gate; gated runtime stops; same-stage unsaved text merges with server state while retaining server timers; schedule/code/admin components render the intended controls.
- Full Node suite, typecheck and optimized build run before release.
- Live owner preview completed Listening → Reading → Writing → AI assessment and answer review. Deliberately blank L and three selected R answers gave 0/40 and 3/40; sample essays received Writing 8.0. No Day 18 attempt was saved, because this was Rustam preview.
- Actual admin signed-in browser verification was unavailable because the cloud browser has no admin session. Existing admin authentication was not bypassed. Admin handler/component and real database behavior were tested separately.

## Independent review
Two Important findings fixed: active clients ignored revoked access; stale-code revoke left a newer code active. Both have regression tests. Database tests demonstrated the stale-code failure before the replacement RPC and passed afterward.

Deferred Minor: code-history list is capped at 2,000 entries. At unusually high rotation volumes, old active entries may require targeted management work; normal use is below this cap. API reports the limit instead of hiding it.

Ruling: manual code issuance is the admin's payment confirmation for this mock; it does not create or change unrelated billing packages. RLS intentionally has no client policies on code tables: only service_role has table/RPC privileges, and the RPC additionally checks the active super-admin role.

## Rollback
Previous working deployment: dpl_BX3murajrnUU9m2CX8tv1CKk8zbL (commit 0a65b62ad866670673d8dd4ebf7805f1d6ddfe8b). Revert to it if needed; Day 18 drafts then return to owner-only preview. Keep additive code tables and audit rows; do not delete real attempts or payment confirmations.
