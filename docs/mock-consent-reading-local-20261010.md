# Full Mock consent, Reading layout and Writing result reliability

Status: local implementation only. Rustam explicitly instructed not to deploy; there was no push, deployment request, migration or live learner data edit in this task.

## Behavior

- Consent is stored per student and mock day. Start Full Mock and Start Listening remain disabled before consent, and the API also rejects starting without it. Returning to the same mock loads the saved consent.
- The initial notice explains that administrators may view the current mock section and typed answers during the exam. There is no active-viewer notification or Stop sharing overlay in the exam.
- Leaving, completing or submitting Writing clears the live snapshot and viewer lease. Consent remains recorded. A heartbeat cannot reactivate a stopped session, including a heartbeat that was already in flight. Returning to an active mock explicitly resumes it; completed and assessing real attempts cannot resume.
- Existing active Reading/Writing attempts can continue saving/submitting during rollout. Their answers and timers are not reset by the new consent requirement.
- Daily and Full Mock Reading select controls use the same inline sentence renderer. Options and question spacing are compact; the shared white worksheet and 17px desktop/16px mobile type remain.
- The Full Mock start card is smaller and its mobile steps use compact rows. Writing final submission now uses an in-page confirmation like Listening/Reading.
- Both final Writing essays are saved atomically before AI assessment. A delayed autosave cannot overwrite submitted work. Repeated submissions return the pending state or existing completed result without another assessment.
- Interrupted assessments are retryable, with abandoned claims eligible after 120 seconds. The AI request is bounded to 90 seconds and the route execution budget is 120 seconds. Result commits compare the claim timestamp to prevent a stale assessment from replacing a newer one.
- Student retries target their own attempt rather than waiting behind another student's failed assessment. Result polling runs sequentially every 3 seconds after each completed request, avoiding overlapping requests. The model and reasoning configuration are unchanged.
- The AI prompt now includes Task 1 visual reference data and both task instructions, so table values can be checked against the actual source.

## Verification and limitations

Regression tests cover server consent enforcement, consent persistence, exit after a day closes, stopped/in-flight heartbeat recovery, active-only resumption, own-student retries, save-before-AI ordering, network/save failures, duplicate submissions, stale claim eligibility and final UI rendering. Test data and AI responses are simulated; this is not a real database integration or concurrency load test.

Final local checks: 203 tests passed, production build passed (including TypeScript), and git diff whitespace checks passed. Logs: /tmp/ark-mock-ready-tests.log and /tmp/ark-mock-ready-build.log.

The live production teacher preview was navigated through Listening, Reading and Writing. No real student attempt was submitted. Browser credential protection blocked the final native Writing confirmation, so real AI latency was not measured. The cloud browser also failed to open the local localhost page; the new layouts were verified by rendered-markup tests and build, not a new browser screenshot.

Day 11 remains a teacher-only draft. These edits do not publish its content or change deployed code. Before the later combined deployment, run the consent/start/exit/live-view and final AI result workflow in an authenticated preview, including desktop/mobile visual checks and a real AI timing sample.

## Rollback

Revert this local change set to restore the prior behavior. There are no schema migrations to reverse. The earlier deployment remains the production baseline.
