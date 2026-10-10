# Shared exam UI parity

User request: separate Listening Part 1–4 buttons, show only the selected part's ten question numbers centred, match Full Mock Reading to daily Reading typography, polish Writing consistently.

Daily Listening and Full Mock now render the same navigation component. Part changes select the first question and scroll to the top; question changes retain the existing handlers. Navigation touches no audio, timer, answer, submission, grading or persistence logic. Mobile places ten numbers on a separate row so all parts remain accessible.

Full Mock removes duplicate passage/question font rules and uses the shared Reading worksheet (Times New Roman 17px/1.6 desktop, 16px mobile). Reading retains independent Part 1–3 texts and questions. Full Mock Listening's lock icon no longer occupies an empty back-button surface. MCQ numbers sit beside question wording, with compact option spacing.

Writing Task tabs use the shared blue active state. Repeated tab word counts were removed; active editor word count remains. Prompt/table/editor sizing is consistent across daily and Full Mock Writing. The two-pane mock grid and daily draggable split remain intact.

Validation: 175 tests pass, including rendered navigation coverage for all four parts and callback routing. TypeScript and production build pass. No database records or student results were modified. Day 11 stays Rustam-only draft, and publication is not changed by this update.
