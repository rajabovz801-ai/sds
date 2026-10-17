# Personal Mock Access Implementation Plan

**Goal:** Open Day 18 on 18 October 2026 at 09:00 Asia/Tashkent, through account-bound codes issued after admin payment confirmation.

**Architecture:** Preserve the existing mock runtime and design. Keep Day 18 material rows draft. Add service-only code tables/RPCs, a focused API and admin code panel. Gate every mock GET/POST server-side before returning draft content. Existing Rustam preview stays available; earlier mocks are unchanged.

**Approved brief:** User approved the described personal-code workflow and 09:00 opening, then instructed full implementation in this session.

## Constraints
- No Shop changes, no existing results deletion, no global billing changes.
- Codes belong to one student and one mock. Store hashes only; display new code once to admin.
- Admin can generate/replace/revoke. Issue means explicit payment confirmation; record admin and timestamp.
- Successful redemption is durable across sessions. Five failures trigger a 15-minute lock.
- Schedule enforced with server UTC timestamps; 09:00 Tashkent equals 04:00 UTC.
- Ordinary users cannot read drafts using direct URLs or API actions.

## Tasks
- [x] Add failing policy tests: exact opening boundary, other-day compatibility, wrong account, revoked/unredeemed grants.
- [x] Implement pure access policy, service-only SQL tables/RPCs, database rollback tests for issue/redeem/revoke/rotation/lockout.
- [x] Add authenticated API for admin list/issue/revoke and student redemption. Confirm origins, role, IDs, day, active student and explicit payment confirmation.
- [x] Integrate mock GET/POST, gate UI, admin code panel, 09:00 metadata and scheduled visibility. Preserve draft content and historical grading.
- [x] Run test suite, typecheck, build; test browser preview and Writing AI; verify no test student results persist.
- [x] Deploy reviewed commit, verify public denial, scheduling, drafts, admin component and records. Report any authentication-limited check.

## Review focus
Wrong-account reuse; code rotation races; revocation during an attempt; opening at exactly 04:00 UTC; existing historical mocks and scores.
