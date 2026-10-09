# Workspace artwork refresh — 9 October 2026

Base: 80f9cf7a6246351f7c7a34acf17749f6fa9478d5.

Dashboard now uses a fixed welcome banner with a wolf studying, three statistics, a compact resume row and task cards without duration estimates. Profile backgrounds remain owned and selected through the existing reward API; they appear on profile, sidebar profile tile and leaderboard, rather than the welcome banner. Existing cosmetics, avatar unlocks, reward claims and data schemas are unchanged.

Progress has a wolf climbing steps, four decorative statistic icons and six matching module line icons. Leaderboard has a trophy wolf, compact top-three cards, selected themes restricted to the cover strip, PNG gold/silver/bronze medals with HTML rank numbers, a first-place crown and accessible presence dots. Existing sorting, period fetches, refresh cadence, table, route actions and presence logic are unchanged. Reward buttons and modal use a treasure chest.

Twelve original AI-generated PNG assets are optimized with alpha preserved (~397 KB combined). No rasterized labels or live statistics. Decorations ignore pointer events; image errors hide decorative assets while HTML rank numbers remain visible. Assets were inspected on white and navy backgrounds.

Validation:
- TypeScript and production Next.js build passed.
- 14 targeted leaderboard/workspace/resume checks passed.
- Full suite: 163/168 pass. Same five failures independently reproduced at the base commit: passage-schedule expectation, obsolete persisted mock-listening expectation, three existing quiz-PDF font-format failures. No additional failures.
- Local production browser checks with intercepted test-only API fixtures: Dashboard, Progress and Leaderboard at 1440px and 390px, light and dark, 12 views. No page errors, broken workspace artwork or horizontal page overflow. Rendered screenshots inspected. No real student records were created or modified.

Rollback: revert the workspace refresh commit. No migration or account-data rollback is needed.
