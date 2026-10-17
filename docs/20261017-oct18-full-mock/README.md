# 18 October Full Mock — owner preview

Based on production-safe rollback commit 46f2e10. This change adds no Shop functionality and makes no billing or access-code changes.

Day 18: Volume 10 Listening Test 5, Volume 10 Reading Test 7 and Writing Mock 331. Five material records are stored as drafts in the database. Existing Rustam-only draft access is retained; ordinary accounts cannot load draft materials even after 18 October. No existing content or student result is overwritten. Day 11 had 22 attempts before and after the draft insert.

Small runtime changes: Reading answer groups support order-independent, unique credit in both grading and final review. Three-choice Reading UI saves its answers through the existing save endpoint. Writing source charts render in the candidate interface and admin live view. Writing assessment receives the chart's transcribed numeric reference data rather than an image URL.

Source issues: Listening Q14 uses A, as explained by the supplied PDF's transcript-discrepancy note; its older key says C. An independent full audio transcription has not been performed. Reading Q13's incorrect reference to animals was corrected to age group; Q23's malformed summary sentence was repaired using passage evidence. Reading 38–40 accepts B/D/E in any order without duplicate credit. Supplied legitimate spelling/number alternatives are retained.

Verification: 221 automated tests, TypeScript and production build passed before release preparation. MP3 endpoint returned HTTP 206, audio/mpeg, valid ID3/MPEG header, 24,909,572-byte total size. Full audio-to-question alignment and real AI scoring remain separate checks. Private content/answer payloads and insertion SQL are archived separately, not committed to this public repository.

Rollback: restore the previous deployment dpl_AqB2EeBGBdBrgHtsQoWSZSmyrqfG if needed. Day 18 records may stay draft; do not delete attempts. Publishing the five material rows or activating per-student codes requires the next agreed step.
