# Site-wide night mode — 9 October 2026

## Scope
Saved `ark60-theme` now applies at the document level before rendering. A small client synchronizer preserves the setting across routes and browser storage events; the Dashboard toggle waits until restoration before saving, avoiding overwriting a saved dark preference with its initial light state.

Palette: canvas #0B111B, panels #152131, header/sidebar #101925, border #29384A, primary ink #EAF0F7, secondary ink #A7B6C8, blue actions #3B73E8, gold #E8C56A. Night mode covers workspace, reward collection/dialog, Day pages, exam entry/workspace/results, notifications, and shared authentication/admin styles. Images keep their native colors. Reading/Article/Listening/Mock highlights use readable yellow/mint night colors. Existing fonts, question sizing, layout and data flows remain intact; the Reading overview clips only horizontal decoration overflow.

## Maintenance
`node scripts/build-night-theme.cjs` regenerates `app/night-theme.css` from existing CSS and inline JSX styles. The generated layer changes colors only and is scoped to `html[data-ark-theme="dark"]`. Hand-written surface, control and contrast refinements live in `app/night-theme-overrides.css`. Regenerate after adding UI CSS; review semantic states visually. Keep native Custom Highlight rules in `public/ark-highlight-api.css` to bypass CSS transformation limitations.

## Validation
TypeScript and production build passed. Nine leaderboard/resume regression checks passed. Local Playwright fixtures intercept all API requests; no real learner record is used or written. Workspace QA covers five views at 1440/390/320 pixels in light/dark, plus reward dialogs at desktop/mobile. Lesson QA covers seven module entry views, Reading worksheet, Listening result, Full Mock Reading/Writing at desktop/mobile. Checks include white surface detection, page overflow, browser errors, writing editor input and saved dark/light preference on reload. These are fixture browser checks, not a signed-in production learner test.

## Release boundaries
No API, database, grading, attempt, timer, audio, recording or attendance changes. Base production commit: 729e465fdfb4b3dc5a12caf05a8dd2434d966fdb. Roll back with a revert of this night-mode commit, preserving subsequent unrelated work.
