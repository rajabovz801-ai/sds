# Unified Go back controls — 10 October 2026

Scope: the shared return component now uses the same CSS module Start class as Listening/Speaking entry buttons, with a compact return layout and the exact label “Go back”. Existing routes, callbacks, accessible destination labels, abandonment and save logic are preserved. Additional return controls on Vocabulary, Listening results, Writing results/unavailable screens, Speaking part/review/results screens, and Full Mock unavailable/results screens now use the shared component.

Verification: TypeScript check passed; 170/170 existing tests passed; production Next.js build passed; generated night stylesheet unchanged; git diff whitespace check passed. Browser visual verification was attempted but the browser download returned an invalid ZIP, so visual rendering and authenticated student journeys have not been verified. No learner data, API routes, timers or session policies changed.

Deploy through the existing main-branch Vercel integration. Rollback: revert this UI-only commit. Students already working need not reload; the new controls arrive on their next normal page load.
