# Challenge workspace fixes — 24 October 2026

## Scope
Preserve the existing ARK challenge and access rules while making the sidebar, dashboard, calendar, progress, leaderboard, billing, profile and rewards more compact and understandable. No schema, student results, payment rates, coin award logic, or shop changes.

## Root causes and changes
- Sidebar footer grid items expanded to intrinsic text widths. Constrained tracks and text containers, wrapped PRO onto its own line, retained name tooltips, and removed horizontal overflow. Desktop sidebar is 240px; drawer remains available on mobile.
- Dashboard resume used an unfiltered device-local path. Suppress finished/unpublished/inaccessible work and clear stale locations on account change.
- Calendar checkmarks represented access rather than completion. Checks now require all published tasks; partial days show done/required counts. Module dots have a complete legend and titles; mock cards show their day number.
- Progress bars were time-based with a fixed multiplier and saturated after a few hours. Bars now count distinct completed published tasks; show numerator/denominator, remaining-task links, and a minute-rounding explanation.
- Leaderboard silently truncated at ten and online names at three. Show all returned students, a +N online indicator, own rank and period start, and clarify shared coin ranks.
- Reward modal combined claims with the entire appearance editor. Keep claims and recent history compact; collection button opens Profile > Appearance. Added Escape, focus containment/restoration, and background scroll locking.
- Profile cover, upload panel and spacing were oversized. Reduced dimensions, removed repeated profile PRO label, identified reward-day badges, and format Uzbek dates explicitly to avoid ICU `M10` fallback.
- Billing exposes active package names, formatted expiry and last order amount/date; unavailable payment methods explain their state and the first available card is selected automatically.
- Logout-all previously ignored server failures. Errors now remain visible and no false success navigation occurs.
- Browser tests found additional mobile overflow in calendar task rows. Grid tracks are now bounded; actions wrap below task text on narrow phones. Disabled study-day actions remain visually disabled.

## Verification
- `npm test`: 278/278 pass.
- `python -m unittest tests.test_weekly_progress tests.test_pro_profile tests.python.test_reward_catalog tests.python.test_reward_api -q`: 24 pass. Updated the reward API test database fixture to support the existing billing-access query.
- `npm run build`: production build and TypeScript pass.
- Chromium with intercepted API fixtures: Dashboard, Plan, Progress, Leaderboard, Billing and Profile; widths 1440, 390 and 320; no document/sidebar horizontal overflow; dark/light toggles; finished resume suppression; reward Escape; collection navigation; no page JavaScript errors.
- Final code review found a repeat-navigation bug: opening the collection twice after switching back to Details did not reselect Appearance. Added a request signal and repeated-navigation browser coverage.
- Screenshots of desktop sections and desktop/mobile reward modal inspected.
- This verifies local UI and mocked requests; it does not validate production authentication or make real payments/claims/profile changes.

## Release and rollback
Work is on `fix/challenge-workspace-compact` for review and preview deployment. Production release requires approval. Rollback is restoring the preceding deployment; no database rollback is needed.
