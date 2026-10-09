# Shared learning UI — 9 October 2026

## Scope
All dynamic Day routes use the same components; the refresh is not restricted to Day 9. Listening and Speaking have compact centered entry cards, transparent wolf artwork, sound/microphone checks, and collapsed instructions. Part 1/3 Speaking shows one question at a time, advances after a successful save, and protects unsaved recordings from question navigation. Review includes playback; preview blob URLs stay valid until the page unmounts. The waveform now waits for its canvas to mount.

Day plans and Vocabulary have smaller artwork and concise progress. Reading and Article reduce duplicated labels; Article has section navigation and a compact glossary. Writing has neutral word counts, fewer duplicated labels and a keyboard/pointer adjustable desktop split. Shared initial loading states use a centered blue ring. Light/dark styles and small-screen controls are covered.

## Validation
Production build and TypeScript checks passed; nine leaderboard/resume/retry regression checks passed. API-intercepted browser fixtures covered 60 combinations of learning pages and Speaking stages at 1440/390/320 pixels in light/dark mode with no horizontal overflow or broken images. Final focused checks passed after mobile refinements: six Day/Writing layouts, recording/save/advance, saved preview playback with nonempty audio, Writing input/keyboard resize, and Listening/Speaking Day 1/17/60 entry labels. No browser errors in the final run. Existing night-mode fixture coverage also included Reading, Listening results and Full Mock.

## Release boundaries and rollback
No API, database, migrations, grading, unlock schedule, attempt-retention or timer policy changes. QA intercepts all API requests and never submits real student answers. Authenticated production student workflows were not exercised. Audio recordings continue to go to teacher review; AI assessment is outside this release.

Base commit: 69f904fa0427435ce6b15d81a811ca2db716eb29. Revert this UI commit to roll back, preserving any later unrelated work. Generated QA scripts, next-env.d.ts and local build output are excluded from the release.
