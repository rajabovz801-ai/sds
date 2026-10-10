# Full Mock Writing: save before AI assessment

Local change only. Rustam explicitly requested no deployment on 2026-10-10.

Submitting a real attempt now conditionally changes Writing to assessing and saves both final essays, elapsed time and submission timestamp before calling AI. A failed save never starts assessment. Concurrent submissions cannot both claim the same Writing stage, and delayed autosaves cannot overwrite submitted essays.

Network failures become retryable errors without discarding the essays. AI fetches have a 90-second timeout; an abandoned assessment marked retrying becomes eligible for recovery after 120 seconds through the existing student/admin polling. The retry claim also compares the previous update timestamp to avoid reclaiming a renewed lease. Teacher preview remains separate and creates no student attempt.

The later local consent/UI batch also bounds the route execution to 120 seconds, returns existing completed results on duplicate Submit, targets student retries to their own attempt, checks completion against the claim timestamp, and includes Task 1 visual data in the examiner prompt. See mock-consent-reading-local-20261010.md for combined validation and browser limitations.

Regression tests simulate successful assessment, interrupted network, database save failure, duplicate submission, lost claim and abandoned assessment recovery. These tests use fake database and AI services, so they do not measure real AI latency or test production infrastructure.

Files: app/api/challenge-mock/route.ts and tests/mock-writing-save-first.test.mjs. No schema changes or live student data edits are required. Reverting these source changes restores the previous behavior.
