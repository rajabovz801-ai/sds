# Admin Control Centre Redesign — Design Spec

**Date:** 2026-10-02  
**Project:** ARK IELTS 60-Day Challenge  
**Repository:** rajabovz801-ai/sds  
**Status:** Approved direction, implementation pending written-spec review

## Goal

Make the live admin panel more useful, compact and consistent without changing the working student flows. The admin must be able to see who is online, what they are doing, review Listening/Writing/Speaking by day, see pending counts immediately, and work from a consistent professional UI.

## Non-negotiable safety constraints

- Do not change Reading result behavior or Reading student-answer logic.
- Do not change existing study-time accounting rules.
- Presence/online tracking must be separate from study-time so simply being online never adds study seconds.
- Do not remove historical student results from the database as part of this redesign.
- Do not physically delete Writing submissions in this rollout.
- Keep existing Speaking audio cleanup behavior at 72 hours.
- Do not change scoring, answer keys, coins, completion rules, sequential day locks, login security, or current student submissions.
- Preserve mobile support.
- Every production change must pass build/type verification before deployment.

## 1. Overview redesign

Remove the large 60-day Content Manager section from the Overview and remove **Content manager** from the admin sidebar.

Do not delete the existing backend content-manager APIs or course content data. They remain intact for safety and can be reused later.

Replace the removed space with a **Live Student Activity** panel.

### Overview KPIs

Show four primary cards:

1. Registered Students
2. Online Now
3. Writing To Review
4. Speaking To Review

Inside the Live Student Activity panel also show smaller summary values for:

- Active today
- Total tracked study time today
- Online now
- Idle now

### Live Student Activity table

Columns:

- Student
- Status
- Current activity
- Day
- Current active study time / today study time
- Last seen

Example states:

- green dot + **Online** — recent presence and recent interaction
- amber dot + **Idle** — page is visible/recently present but no recent interaction
- gray dot + **Offline** — no recent presence heartbeat

Example activity labels:

- Dashboard
- Day 02
- Reading · Day 02
- Listening · Day 02
- Article · Day 02
- Vocabulary · Day 02
- Writing · Day 02
- Speaking · Day 02
- Notifications

Rows sort Online first, then Idle, then most-recent Offline.

## 2. Student presence architecture

Create a dedicated server-backed student presence record. Presence must not reuse or increment `ark60_study_sessions.active_seconds`.

Preferred schema:

`ark60_presence`

- `student_id uuid primary key`
- `last_seen_at timestamptz not null`
- `last_interaction_at timestamptz not null`
- `current_area text not null`
- `day_number integer null`
- `updated_at timestamptz not null default now()`

The table is server-write/server-read only. No browser receives a service-role key.

A lightweight client presence component sends a presence heartbeat about every 25 seconds while the document is visible. It records the current path/area and current day if applicable.

Interaction events update the local last-interaction timestamp without changing study-time logic.

Admin status rules:

- **Online:** last seen within 60 seconds and interaction within 90 seconds.
- **Idle:** last seen within 60 seconds but interaction older than 90 seconds.
- **Offline:** last seen older than 60 seconds.

If the browser closes or tab becomes hidden, presence naturally ages to Offline. No false “logout time” is invented.

## 3. Admin notification badges

Use pending work counts, not unread-message counts.

Sidebar:

- `Writing inbox [N]`
- `Speaking inbox [N]`
- existing Requests badge remains

The top bell shows the combined pending Writing + pending Speaking count.

Counts decrease only when the teacher saves a review/score or when the item leaves the 72-hour inbox window. Simply opening an inbox does not clear the count.

Bell view becomes an admin notification feed for recent pending Writing and Speaking items. Each item links directly to the corresponding submission.

## 4. Listening Results redesign

Keep the current score/review engine intact.

### Visual system

Match the Reading Reports design language:

- same compact top header
- same back-button treatment: icon button only, no “Admin” text
- brand serif only where appropriate
- all operational UI, names, scores, filters and question text use clean sans-serif
- compact KPI cards and toolbar
- mobile responsive

### Day selector

Add a data-driven day selector above the results.

Each available day card shows:

- Day number
- calendar date
- Listening test title when available

Selecting a day filters submissions and updates the detail panel.

The admin API must derive the Listening day from the stored attempt/submission instead of displaying hard-coded `Day 01 · Test 206`.

For this rollout, student Listening test behavior is not generalized or changed merely to support the admin redesign. Existing student Listening remains protected. Admin result browsing becomes day-aware using already stored submission day numbers/content.

### Detail panel

Header shows:

`DAY 02 · LISTENING · <test title>`

Keep:

- score / 40
- band
- Section 1–4 scores
- per-question review
- submitted time
- elapsed test time

Add CSV export only if it can reuse existing Reading-style export patterns without changing result data.

## 5. Writing Inbox redesign

Replace the tall stacked cards with a compact master-detail layout.

### Left list

Each row shows:

- student
- username
- Day number
- Task 1 / Task 2
- word count
- submitted time
- Pending / Checked

Add day filter chips/cards for days that have Writing submissions in the current inbox window.

### Right detail

Show:

- student + Day + Task
- Open PDF
- Words
- **Active Writing Time**
- optional smaller **Task Timer Used**
- Submitted time
- IELTS band selector
- Feedback
- Save / Update result

### Writing time meaning

`Active Writing Time` comes from server-recorded `ark60_study_sessions` summed for that student + day + `module='writing'`.

The existing Writing task countdown remains independent and unchanged.

Therefore a student can have:

- Active Writing Time: 18m 12s
- Task Timer Used: 0m 00s

if they wrote without pressing Start.

## 6. Speaking Inbox redesign

Keep the current master-detail model but make rows and controls more compact and visually consistent with Listening/Writing.

Add:

- day filter
- icon-only back button
- consistent sans-serif operational typography
- clear expiration text on every pending row/detail:
  - `Expires in 2d 4h`
  - or `Available until 05 Oct, 11:41`

Keep:

- Part 1/2/3 recordings
- Play all
- band
- feedback
- reviewed state
- current 72-hour audio cleanup mechanism

## 7. 72-hour inbox behavior

The admin **Writing Inbox** and **Speaking Inbox** show only submissions still inside the 72-hour inbox window.

This is an inbox-retention rule, not destructive result deletion.

### Speaking

- Existing audio files continue to be physically deleted after their existing 72-hour `expires_at`.
- Speaking inbox stops showing expired items.
- Reviewed band/feedback/result records remain available to the student after audio expiry.

### Writing

- Writing inbox stops showing an item 72 hours after `submitted_at`.
- Writing answer/result data is not physically deleted in this redesign.
- Student reviewed result remains available.
- No irreversible Writing deletion is introduced without a separate explicit decision.

Pending dashboard/sidebar counts use the same 72-hour window so counts match the inbox.

## 8. Students page

Keep Students as the detailed historical/account view.

Add student activity fields where useful:

- Current status
- Current activity
- Last seen
- Today study time
- Total study time

Do not make Overview duplicate the entire Students page. Overview is for live monitoring; Students is for account/detail management.

## 9. Typography and interaction system

Admin result pages share one visual language:

- Serif: ARK brand / major editorial heading only
- Sans-serif: student names, questions, scores, controls, tables, filters, metadata
- Minimal shadows
- Light borders
- Compact rows
- White/very light worksheet background
- Existing navy/gold accents retained
- Back navigation uses the existing `AnimatedBackButton` icon treatment
- No decorative heavy backgrounds

## 10. Data/API boundaries

Expected server changes:

- presence heartbeat action
- admin live-activity read action
- dashboard pending counts aligned to 72-hour inbox windows
- Writing admin list enriched with active Writing time
- Listening admin list/detail made day-aware without changing student scoring
- Speaking/Writing inbox list filtering by 72-hour window
- admin notification-feed endpoint or response using existing admin auth

All admin endpoints remain admin-authenticated.

No client may query privileged tables with service-role credentials.

## 11. Failure handling

- Presence failure must never block student study pages.
- Presence failure must never change study-time counts.
- If live activity cannot load, Overview still renders KPIs/inboxes and shows a small stale-data warning.
- If one inbox fails, other admin sections remain usable.
- Expired Speaking audio must render an expiry message instead of a broken player.
- Missing student names fall back to “Student” as today.
- Existing submissions created before this rollout remain readable.

## 12. Verification requirements

Before production deployment:

- Type/build succeeds.
- Existing Reading admin still loads unchanged.
- Existing Day 01 Listening submission and detail still load.
- Listening admin filters by selected day correctly.
- Writing pending submission opens, PDF still opens, grading still saves.
- Writing Active Time is independent of task timer.
- Speaking audio still plays before expiry and shows expiry state correctly.
- Writing/Speaking sidebar badges equal the actual pending items in their inbox windows.
- Presence heartbeat does not increment `ark60_study_sessions`.
- Online → Idle → Offline state transitions follow the documented thresholds.
- Admin Overview is responsive on desktop/mobile.
- Existing student dashboard/day/module flows still load.
- Production deployment is checked to READY before announcing completion.
