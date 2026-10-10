# Compact Go back follow-up — 10 October 2026

The supplied Day plan and Article screenshots show the previous Go back control stretching across a grid column. Root cause: `width:auto` inherits grid item stretching in headers with `1fr auto 1fr`. Shared return CSS now uses fit-content width, start justification, center alignment, 36px height, and non-wrapping label/icon spacing. Added the requested right chevron to all shared return controls and Listening/Speaking Start buttons.

All existing navigation callbacks/routes remain unchanged. No student records or test state changed. Typecheck, 170/170 existing tests, and production build passed. The generated night stylesheet is unchanged. Local Chromium failed to launch; cloud browser can read the unauthenticated Article unavailable screen but authenticated Day/Article layouts remain unverified visually. The supplied screenshots and matching CSS selectors establish the stretching cause; inspect live component dimensions after deployment.

Rollback: revert this UI-only follow-up commit.
