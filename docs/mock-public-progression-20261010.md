# October 11 mock publication and following-day prerequisites

Rustam authorized deployment and publication on October 10, 2026. Sunday mocks may be entered on their scheduled date regardless of unfinished earlier study days. Subsequent regular study days still require all earlier assignments and completed Full Mock attempts.

The shared TypeScript access helper drives the dashboard and day page. Server module authorization independently uses the same rule with completed mock days read for the signed-in student. The Python API exposes completed_mock_days in the progress response and applies the equivalent rule to its protected day/module actions. These checks preserve the October 4 event start time and future-date locks.

For October 12, having completed the October 11 mock alone is insufficient. Completing earlier daily tasks without completing the mock is also insufficient. Both must be complete, and October 12 must have arrived in Asia/Tashkent.

Publication changes only the five existing Day 11 material statuses: Listening, Writing and Reading passages 1–3. No answer content, audio URL, existing result, student timer, session or attempt is modified. The earlier consent/Reading/Writing reliability changes are included in the combined deployment.

Validation includes progression cases for unfinished prior tasks, unfinished mock, all prerequisites complete, future dates, and parity between the frontend/shared TypeScript helper and Python API.

## Release verification

- All 206 automated tests passed; Next production build and Python compilation passed.
- Production commit: `f53f85c47a360722318bfdac1e860ddc2a9bfecf`.
- Deployment: `dpl_EoNRgS43cQtpvpi3jawHoH4MD3CT`, READY; production alias `arkielts.vercel.app` points to this deployment.
- Day 11 mock page returned HTTP 200 with this deployment ID in its HTML.
- Published exactly two existing content rows and three existing Reading passages. Reading question/key counts remain 13/13, 13/13 and 14/14. Listening has 40 questions and 40 key entries; Writing has two tasks.
- Day 11 attempt count was zero before and after publication. Publication did not touch attempts, submissions, sessions or timers.
- Authenticated browser verification was blocked by the browser credential protection layer. The connector also could not fetch authenticated API endpoints; do not interpret its 401 as verified application authorization behavior. No real student mock or real AI assessment was submitted in this release check.

Rollback: restore the previous production deployment `dpl_BiatHdpsradXS5ptumxcUcwHfqB7` if a code regression occurs. To retract Day 11 publication, change only the five Day 11 IDs documented in `mock-public-publication-20261010.sql` back to draft; preserve any student work created after publication.
