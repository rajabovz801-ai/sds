# Daily reward collection

Reward progress counts successful daily claims and does not reset unlocked items after a missed day. Historical coins and reward dates are preserved. Students with eight historical claims immediately own the theme collection, even when their old stored streak was capped at seven. A theme is applied only when the student chooses one and presses **Apply style**.

| Reward day | Gift |
| --- | --- |
| 1–7 | Existing +1 through +7 coins |
| 8 | Dawn, Ocean and Forest theme collection |
| 9 | +3 coins |
| 10 | Name badge |
| 11 | Matching PNG decorations |
| 12 | +5 coins |
| 13 | Cartoon avatars: boy, girl, navy hijab |
| 14, 21, 28, 35, 42, 49, 56, 60 | Milestone badges |
| Other later days | +3 or +5 coins |

Themes affect the profile cover, the student's public leaderboard card and selected dashboard accents. Reading/listening/writing exam screens are independent. Avatar choice is independent of the student's gender field. The collection can be changed or reset to the default style later.

## Rustam demo

The existing `rustam7` preview account gets **Daily reward → Rustam · Try demo** with a day selector and reset button. Claims are simulated; they never insert reward or coin events. Applied cosmetic choices are saved to this account so they remain visible after closing the modal and reloading. Its leaderboard preview is explicitly unranked.

## Assets

Built-in image generation produced the PNG assets in `public/images/rewards/`:

- `dawn.png`, `ocean.png`, `forest.png`: quiet scenic landscape covers, warm mountain sunrise / turquoise sea / sage woodland lake, premium painterly editorial finish, no text or UI.
- `boy.png`, `girl.png`, `girl-hijab.png`: clearly stylized 3D cartoon characters with rounded proportions, expressive eyes and navy clothing, transparent background; no photographic portraits.
- `dawn-decor.png`, `ocean-decor.png`, `forest-decor.png`: isolated sunrise/mountain, wave and botanical objects with soft matte shading, transparent background.

Covers are optimized to 1024 pixels wide; avatars to 320 pixels; ornaments to 192 pixels. All nine assets total approximately 1 MB; avatar/ornament alpha channels are preserved.

## Database and authorization

`supabase/migrations/20261008062546_reward_theme_collection.sql` introduces service-only cosmetic storage and v2 reward RPCs. Existing v1 RPCs stay available for older clients. Reward claims are serialized per student, unique per date and idempotent. Cosmetic API requests authenticate the session, ignore client-supplied identities and reject unearned items. Cosmetic storage has RLS enabled and no grants to `anon` or `authenticated`; the server uses `service_role`.

## Verification

- Nine Python reward/API tests pass (catalog, historical eighth claim, locked-item rejection, authenticated saving, demo isolation).
- `npm run typecheck`, production build and `git diff --check` pass.
- Database transaction checks passed for day 8 theme with no coin increment, repeated claim, day 9 coins, day 10 badge, and continuation after a missed day. All synthetic test records were rolled back.
- Production-build browser smoke checks with API fixtures passed: day 8 claim and theme apply, profile/leaderboard display, day 13 cartoon avatar apply, reload persistence, mobile layout without horizontal overflow, and dark-mode rendering.
- Read-only check of Ruhshona on 2026-10-08 returned eight claims, next day nine and an unchanged 76-coin balance.
- Full Node suite: 163/168 pass. The same five failures were independently reproduced on unchanged commit `6fafb41`: `day plan and Reading picker use one shared passage schedule`; `Listening persists in-progress answers and resumes one-time audio from server start time`; `30 question quiz PDF fits one A4 sheet in two columns`; `60 question quiz PDF uses exactly two A4 sheets with 30 questions per sheet`; `short quiz PDF uses one A4 page`. The first two are outdated source-shape assertions; the PDF tests report existing `Unknown font format`. No unrelated production code was changed for these failures.
