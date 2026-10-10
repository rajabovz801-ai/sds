# Challenge verification repairs — 10 October 2026

Base: beae1f1276fb7435e34d77b61be54710fc009881.

## Changes
- Replace three invalid Latin Modern font binaries with the installed TeX distribution's genuine lmroman10 regular, bold and italic OTFs under the existing GUST font license. PDF generation now embeds valid fonts.
- Skip explicitly authored dark selectors and CSS-module :global selectors in the night color generator. Their scoped styles remain authored in their original stylesheets. Regenerate night-theme.css; removes the 16 CSS parsing warnings without leaking module class names.
- Preserve zero remaining time on Full Mock Reading/Writing reload and stage transitions using nullish defaults.
- Update stale source-shape assertions to current shared LessonEntry, session loading/error branches, 60-day rotating Reading schedule, and intended Full Mock Listening reset-on-exit behavior. Do not restore superseded Listening resume or old intro layouts.

## Evidence
- Baseline: 168 tests, 159 pass, 9 failures reproduced.
- After: 170 tests, 170 pass, zero failures.
- TypeScript: npm run typecheck exit 0.
- Production build: npm run build exit 0, no CSS parsing warnings.
- Both new regressions fail against original code, and pass after the fixes.
- Existing three PDF tests now produce PDFs with the expected A4 page counts.

## Limits
No production student submissions or live learner data were changed. Production content publication and authenticated student-to-admin submission flows were not tested by this patch. Unit/source tests do not establish those flows. No scoring, reward entitlement, calendar date, authentication policy or database migration changes.

Rollback: revert this repair commit. This reinstates the invalid fonts and CSS warnings; it does not touch student records.
