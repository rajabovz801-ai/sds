# Owner experience release

User approved the six-screen design and requested implementation on 16 October, with all new functionality restricted to Rustam and Shop marked Soon for everyone else. This is an isolated subsystem extending the existing authenticated dashboard, not a public launch of a new economy.

## Contract
- Existing server-authenticated `rustam7` account only; never infer authorization from display name, client flags, query strings or localStorage.
- Everyone sees Shop after Billing. Non-owner sees only Soon; experience API denies reads and writes.
- Owner gets Today, Shop/inventory, whole-workspace live themes, mistake retry, vocabulary review, weekly quest, achievements and progress, all interactive.
- Owner sandbox uses explicitly labelled sample learning data and a separate 1,200-coin test wallet. Purchases, quest rewards and retry results persist in a service-only database table. No production XP, leaderboard, billing or learner attempts change.
- Catalog prices/category validated server-side. Atomic DB mutation locks state and prevents negative balances and duplicate rewards/purchases. Only one item per cosmetic category equipped. Owned cosmetics survive balance reset. Separate full reset is explicit.
- Classic is default, Forest/Library/Aurora themes use original generated artwork. Pause ambient motion in exam routes and respect reduced motion. Owner can preview without buying, cancel preview, buy/equip and restore Classic.
- New workspace navigation exists only for owner. Existing Progress/Leaderboard/Billing continue for students.
- Keep exam readability, assessment rules and existing paid entitlements intact.

## Verification
Pure catalog/progress tests; database rollback tests for unauthorized access, purchase idempotence, insufficient funds, ownership enforcement, quest/review reward idempotence; browser owner/non-owner, persistence, each category, preview cancellation, phone layout; full existing tests and production build. Deploy via existing GitHub/Vercel connection. Rollback previous Git commit; new additive isolated tables can remain unused.

## Sources
Duolingo official social features: https://blog.duolingo.com/friends-social-features/
Quizlet official spaced repetition: https://quizlet.com/features/spaced-repetition
Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
These inform interaction principles. Assets and interface are original, not copies.
