# Daily Writing student assessment

Fixes the hidden AI results: a pending teacher review no longer hides an available AI assessment. Student UI separates estimated AI bands from teacher final bands. Includes criterion evidence, Uzbek improvement plan, original/corrected sentences, and one improved paragraph for new assessments. Old assessments remain readable.

Submit saves the essay first, then runs the existing grading service through Next after(). Client polls the owned submission, and results survive navigation. Failed/stalled assessments can be retried by their owner after five minutes, using an optimistic payload compare to prevent concurrent requests. No regrading of reviewed or full mock records. Preview submissions remain unsaved.

Task 1 passes the published local visual to the model, converted to PNG. File traversal is rejected. Existing exact reference data is preserved. Scores are validated and the band is recomputed from criteria. AI results are explicitly estimates, not official IELTS results.

Validation: real component SSR tests for pending/ready/teacher states; mocked-provider runtime grader tests for score aggregation and missing credentials; full Node suite, TypeScript and production build. Real authenticated submission/provider billing and visual browser checks have not been performed. Rollback: restore changed files from parent commit. No database migrations.
