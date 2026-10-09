# Profile-only backgrounds and compact workspace artwork

Reward scene selection remains stored and claim/unlock behavior is unchanged. Scene backgrounds now render only in the Profile hero and collection preview. Leaderboard, preview account and sidebar use consistent backgrounds; avatars and milestone badges remain visible.

Top-three award artwork shares a dedicated row with the avatar, reducing card height while making crowns and rank numerals clearer. Progress KPI artwork has a separate grid column. Task artwork and Plan mascot use dedicated layout tracks, with narrow-screen rules so artwork cannot cover text. Task card duration estimates are removed; exam timers remain untouched.

New transparent PNGs: Plan wolf mascot and Reading, Listening, Writing, Article, Vocabulary, Speaking icons. Existing small icons have transparent padding cropped without flattening alpha. No API, database, results, award or timing logic changes.

Validation: production build; 14 existing relevant leaderboard/workspace/resume tests; desktop and narrow-screen browser fixtures in light/dark mode. Browser fixtures do not write to production accounts.

Rollback: revert this UI/assets commit; no data migration required.
