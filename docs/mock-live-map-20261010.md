# Mock UI and live admin view — 10 October 2026

Requested: smaller original map left and answer controls right; 17px desktop/16px mobile Listening and Reading; bold Reading question stems; automatic fullscreen at section submission; consent-based live mock view from admin student names.

Changes: map grid shared across daily Listening and Full Mock; in-page L/R submission confirmation preserves browser activation for fullscreen; admin selected result refresh uses functional state (previous interval captured the initial selection); server-only live state is separate from graded attempts.

Students explicitly allow or stop mock sharing. Admin reads only a selected consenting student's current mock state, with a 3-second active refresh, 10-second idle heartbeat and 15-second online/viewer leases. Static mock materials load once per open admin view. Heartbeats avoid re-reading full mock materials. Answer snapshots are uploaded only while an admin viewer lease is active. No OS, other-tab, camera, microphone, or HTML capture. Only bounded structured state is stored, and React escapes displayed text. Sharing failures never block submission or alter attempts. Main admin names open a right-side view; Full Mock result details also include it. Teacher preview is excluded from real result totals.

Migration: 20261010162331_mock_live_consent, applied successfully. RLS enabled, anon/authenticated privileges revoked; service-role access only through session-checked API. Existing 23 completed Day 4 attempts unchanged; Day 11 remains draft and teacher-only.

Validation before release: 188 automated tests, TypeScript and production build pass. Live browser: original map measured 560px wide on the left, answer panel 448px on the right; Listening and Reading body verified 17px; Reading and Writing transitions show Exit fullscreen. Consent allow/stop verified. Authenticated admin browser verification passed: live Listening answer 15=B and map; Reading answer 1=TRUE; Part 2 updates to Halley VI; Writing live typed text; student watching indicator; Stop sharing removes the admin screen. Admin Day 4 displays all 23 completed results. Day 11 remains zero real attempts and draft materials. Automated tests also cover admin authentication, revocation/offline handling, viewer leases and all three screen replicas. Browser fullscreen requires a supported browser and user activation; the confirmation action supplies that activation without native window.confirm.

Rollback: revert this application commit to parent 1790e3e34aa306b6c4d8e55b1c3681c61775c382. The additive live table can remain unused; no destructive data rollback is required.

Production application version: 5f10e96354bc1948558004012addcb7d5d722940, deployment dpl_BB8TFAbFxgDWBc4viDxK432apGoU READY. Preview sharing revoked after testing. Large concurrent load was not simulated.
