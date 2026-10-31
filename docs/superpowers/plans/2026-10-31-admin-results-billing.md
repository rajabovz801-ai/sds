# Admin results and billing polish

Goal: implement the five user-approved improvements while preserving payment APIs, access policy, scores and course content.
Architecture: reuse existing result components in the admin shell; keep standalone routes functional. Add pure date/progress helpers, scoped CSS and native details/select controls.

- [x] Add regression tests for current mock selection (Tashkent, boundary dates, explicit day) and membership progress (scheduled, expired, invalid dates).
- [x] Embed Reading/Listening/Mock in the existing shell, hide duplicate report navigation only when embedded, retain refresh controls and direct URLs.
- [x] Replace hardcoded Day 18; prevent stale mock fetches from replacing a newly selected day's rows.
- [x] Collapse payment requests, use status select and compact actions; add grant filters/pagination, local dates and accessible progress.
- [x] Run regression suite, typecheck/build, review diff; push preview and deploy only verified commit.

Review focus: queued subscriptions; expired/revoked grants; rapid mock-day changes; mobile sidebar; direct result URLs.

Verification: baseline 299/299; final 304/304 Node tests, TypeScript and production build pass. Independent review identified scheduled mock filter, slow poll cancellation and dark meter contrast; all three reproduced by failing tests then fixed. No API, SQL, access policy or course-content files changed. Cloud browser repeatedly timed out, so authenticated visual verification remains unavailable.
