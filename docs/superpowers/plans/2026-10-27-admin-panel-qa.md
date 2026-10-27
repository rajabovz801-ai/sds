# Challenge admin panel verification — 27 October 2026

Scope: admin routes and the admin-only billing component. Shared student Back component, student pages, database schema, access policies, grading formulas, retention and payment handlers remain unchanged. Generated night-theme additions select `.ark-admin-scope` only.

Implemented: compact consistent typography; admin back/navigation; collapsible day history and compact day picker; recent Writing counter explanation and AI/teacher review states; filtered Writing detail cannot retain an unrelated submission; Speaking expiry queue, audio metadata/error/retry and cancellable playback; correct notification deep-link selection; Reading retains all passages in table, totals and CSV; collapsed mock code management and existing overall formula explanation; student search/account-versus-subscription labels; compact billing, quick cash entry, remaining subscription time and proper confirmation line breaks; new-admin credential autocomplete hints.

Validation:
- Baseline: 286 tests passed.
- Final: 293 tests passed; TypeScript passed; production Next build passed.
- Local production HTTP smoke: /admin, /admin/reading, /admin/listening, /admin/writing, /admin/speaking, /admin/mock and /dashboard returned 200.
- `scripts/admin-panel-smoke.cjs`: fixture-only browser checks at 1440×1000 and 390×844; five report routes, student/billing/admin/leaderboard/study views, no page-level horizontal overflow or browser exceptions. Tested Reading 3-passage totals; empty Writing search; real WAV metadata/play/stop; mock code panel collapsed; cash entry opener; mobile sidebar open/close; two-submission Speaking notification deep link.
- Inspected screenshots of Overview, Reading, Writing, Speaking, Students and billing.
- Independent code review identified a Speaking initial-selection race; fixed and regression-tested. Reviewer confirmed no remaining blockers.

Limits: browser APIs used synthetic records, not live student accounts. No real payments, deletions, permission grants, or AI assessments were submitted during validation.

Rollback: revert the admin polish commit and redeploy the previous production commit 5baf81f4de5af1f9b32db5e8341f0ecdae16047d. No database rollback required.
