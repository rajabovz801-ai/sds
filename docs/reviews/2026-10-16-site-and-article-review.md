# Site review and article repair — 16 October 2026

Scope: source review of dashboard/resume, day availability, learning API access checks, billing/admin controls; production database checks of published materials. This is not a claim that every authenticated screen or bank transaction was tested.

Confirmed findings outside the article reader:
- Day 16 Listening and Speaking are not yet published. Day 15 TEST 204 and Speaking are published. No replacement content was invented.
- A regular day screen sends seven availability/progress requests. No measured latency claim is made; batching can be considered separately.
- Admin billing still uses native browser confirm/prompt dialogs. Student billing uses an inline dialog and an explicit Telegram link.

Article repair:
- Preserve original print page numbers, but expose contiguous ordinal reader positions. Day 1 print pages 45–49 map to reader sections 1–5.
- Preserve legacy visited positions and existing completion; no learner data or source text is deleted.
- Use one document scroll and mark sections when their final lines enter the viewport. Remove numbered-page navigation and display reading percentage.
- Break long source paragraphs at sentence boundaries for display only. Original wording remains in the database.
- Save the actual last position, including backward movement. Serialize client requests and merge database visits atomically across tabs.
- Retry failed progress saves explicitly; completion requires every valid section. Retain already earned completion.
- Permit the owner to reopen a completed article after membership expiry, consistent with other completed learning results.
- Skip empty glossary queries instead of issuing an empty `in.()` filter.

Validation: helper regression tests, existing project suite and production build; transactional SQL synthetic student rolled back after testing union, backward bookmark, premature finish rejection, completion retention and service-only RPC privileges. Browser fixture checks cover reader layout, save retry, completion, resume and mobile glossary; no real learner progress is submitted by these fixtures.

Rollback: revert the web commit. The additive service-only SQL function can remain unused safely; no article content migration needs reversing.
