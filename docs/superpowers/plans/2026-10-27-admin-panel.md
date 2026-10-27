# Admin panel polish

Goal: implement the approved screenshot review within admin routes only. Preserve student pages, database records, access/payment rules and grading formulas.

Approach: scoped admin layout, shared compact typography and back navigation; reuse current endpoints and forms. No site-wide redesign or schema changes.

- [x] Normalize admin-only headings (28px), body (14px), labels (12–13px), spacing and sidebar.
- [x] Add compact day selection and cross-report navigation without removing existing report controls.
- [x] Clarify recent Writing counts versus full history, review stages and short responses.
- [x] Prioritize pending Speaking by expiry, expose audio errors and support stopping sequential playback.
- [x] Move mock access codes into a collapsed panel, explain existing three-section average, preserve grading.
- [x] Separate account/subscription labels, add student search, compact destructive action and prevent admin credential autofill.
- [x] Make billing access list collapsible, expose cash action and remaining subscription time; preserve transactions.
- [x] Fix Reading grouping/export to retain all three passages on mock days.
- [x] Run behavior tests, existing suite, typecheck/build and screenshot checks at desktop/mobile with fixture data.

Review focus: expired/missing audio, empty filtered lists, three Reading passages, exact expiry boundaries, long names/mobile overflow. No live financial mutations during verification.
