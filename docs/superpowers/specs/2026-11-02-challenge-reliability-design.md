# Challenge reliability

User approved the audit fixes except recovery of expired Speaking and changes to Writing assessment. Preserve existing tests, results, coins, billing access, mock code gates and 72-hour Speaking retention. Do not invent missing teaching materials.

Use actual publication in the dashboard summary; preserve personal-code mocks with uploaded materials. Correct the cash Mock date validator, selected mock link, Reading empty state, and Speaking network error handling. Add a bounded retry only to the idempotent Listening summary sync.

Study time: focused visible study counts for five minutes after interaction, and continues during actual media playback. Hidden/unfocused tabs, paused Writing timers and finished exams do not count. First/resumed heartbeats reset the baseline. Serialize heartbeats per student in Postgres, cap intervals, and never backfill absent time or rewrite historical totals.

Approach: targeted changes in the existing Next/Python/Postgres stack. Avoid a client-only timer (duplicate-tab inflation) and a platform rewrite (unnecessary regression risk).
