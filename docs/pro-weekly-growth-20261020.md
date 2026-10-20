# PRO weekly growth and identity polish

Dashboard adds a gated Reading/Listening SVG chart for current and future active paid memberships and the two existing Rustam owner accounts. The backend checks access on each request and queries only the authenticated student's results. Non-PRO users see a billing link.

Seven calendar days use Asia/Tashkent submission dates. Reading accuracy is weighted by question count. Listening uses each test day's earliest submitted attempt; older attempts are fetched too so a repeat in this week does not appear as a new first attempt. Days without data remain null and lines do not bridge these gaps. Change is first-to-last available daily accuracy in percentage points, not an IELTS band estimate. No sample results are shown for owner accounts.

Identity rows reserve space for the SVG PRO badge beside truncated names. Podium earned badges move to the avatar. Profile shows subscription expiry only to its owner; Rustam displays PRO · Owner. Coin ranks are dense: equal coins share a place, while study time orders names within a tied place. Current-student visibility uses row index independently of rank.

Verification: production build and typecheck passed, 262 Node tests passed, and Python coverage includes weighted accuracy, timezone boundaries, first attempts, invalid data, dense ranks, denied non-PRO access and student isolation. Browser rendering / touch behavior has not been exercised in this environment.

Rollback: redeploy 4c9c87b467a36ae9762cca4e5947c016d5959ee2. No schema, historical results, billing grants or reward balances are modified by this release.
