# Admin Control Centre Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the low-value admin content-manager area with live student monitoring and redesign Listening, Writing and Speaking admin workflows with day filters, pending badges, 72-hour inbox windows and consistent professional UI without changing working student study flows.

**Architecture:** Add a server-only presence table and a lightweight student presence heartbeat that is completely separate from study-time accounting. Enrich existing admin APIs for live activity, inbox counts and active Writing time, while keeping student Reading/Listening/Writing/Speaking scoring and timers intact. Implement all UI work on a feature branch, validate on a Vercel preview against the additive schema, then merge to production only after tests/build and browser verification pass.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript/JavaScript, Python FastAPI API, Supabase PostgreSQL/Storage, Vercel, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-10-02-admin-control-centre-redesign.md`

## Global Constraints

- Do not change Reading result behavior or Reading student-answer logic.
- Do not change existing study-time accounting rules.
- Presence/online tracking must be separate from study-time so simply being online never adds study seconds.
- Do not remove historical student results from the database as part of this redesign.
- Do not physically delete Writing submissions in this rollout.
- Keep existing Speaking audio cleanup behavior at 72 hours.
- Do not change scoring, answer keys, coins, completion rules, sequential day locks, login security, or current student submissions.
- Preserve mobile support.
- All product-code work is performed on `feat/admin-control-centre-v2`, not directly on `main`.
- The production database change is additive only: one new server-only presence table and supporting indexes.
- Production merge happens only after tests, typecheck/build and Vercel preview verification succeed.

## Review Focus

1. A student can stay online on Dashboard without increasing study-time; presence and study-time must remain independent.
2. Existing Day 01 Listening must still start, save, submit and review exactly as before even after admin day-aware changes.
3. Old Writing/Speaking results must remain stored after they leave the 72-hour admin inbox.
4. Sidebar badge counts must equal the same pending records visible in the 72-hour inbox filters.
5. Preview/admin/expired sessions must not create student presence records or expose privileged presence data.

---

### Task 1: Add regression tests that protect existing flows and define the new admin contract

**Files:**
- Create: `tests/ark60-admin-control-centre.test.mjs`
- Read only: `tests/ark60-stabilization.test.mjs`

**Interfaces:**
- Consumes: current source files as text, following the existing static regression-test pattern.
- Produces: tests that pin the presence separation, day-aware Listening admin contract, active Writing time, 72-hour inbox filtering, pending badges and removal of Content Manager navigation.

- [ ] **Step 1: Write failing source-contract tests**

Add tests asserting:

- a dedicated presence component/API action exists;
- presence code does not update `ark60_study_sessions`;
- admin Overview exposes live activity;
- `Content manager` is absent from the visible admin sections;
- Writing/Speaking sidebar badge elements use `pending_writing` / `pending_speaking`;
- Listening admin no longer hardcodes `day=1` in its admin list/detail requests;
- Writing admin renders `Active Writing Time` separately from task timer time;
- Writing/Speaking admin list APIs include a 72-hour cutoff;
- Speaking cleanup function remains intact;
- existing student Listening `DAY=1` guard and grading functions remain present.

- [ ] **Step 2: Run the targeted test and verify RED**

Run: `node --test tests/ark60-admin-control-centre.test.mjs`

Expected: FAIL because the new presence/admin contracts do not exist yet.

- [ ] **Step 3: Commit the failing tests on the feature branch**

Commit message: `test: define admin control centre redesign contracts`

---

### Task 2: Add server-only student presence storage

**Files:**
- Create: `supabase/migrations/20261002_ark60_presence.sql`

**Interfaces:**
- Produces table `public.ark60_presence`:
  - `student_id uuid primary key references public.ark60_students(id) on delete cascade`
  - `last_seen_at timestamptz not null default now()`
  - `last_interaction_at timestamptz not null default now()`
  - `current_area text not null default 'Dashboard'`
  - `day_number integer null check (day_number between 1 and 60)`
  - `updated_at timestamptz not null default now()`
- Produces index on `last_seen_at desc`.
- RLS enabled with no public client policies; service-role-backed server APIs access it.

- [ ] **Step 1: Add the migration SQL**

The migration must be additive only and must not alter existing challenge tables.

- [ ] **Step 2: Apply the additive migration to Supabase**

Use the connected Supabase migration tool with name `ark60_presence`.

Expected: migration succeeds without modifying existing rows/tables.

- [ ] **Step 3: Verify schema**

Query `information_schema.columns` for `ark60_presence` and confirm all six columns and the primary key exist.

- [ ] **Step 4: Run Supabase security and performance advisors**

Confirm the new table has RLS enabled and no new critical advisory is introduced by this migration.

- [ ] **Step 5: Commit the migration file**

Commit message: `feat: add server-only student presence storage`

---

### Task 3: Implement presence heartbeat without touching study-time

**Files:**
- Create: `app/components/student-presence.tsx`
- Modify: `api/ark60.py`
- Modify: `app/dashboard/page.tsx`
- Modify: `app/day/[day]/page.tsx`
- Modify: `app/notifications/page.tsx`
- Modify: `app/components/study-time-heartbeat.tsx`

**Interfaces:**
- Student POST action: `{action:"presence", area:string, day:number|null, last_interaction_at:string}`
- Server response: `{ok:true}` or preview-safe `{ok:true,preview:true}`.
- `StudentPresence` props: `{area:string; day?:number|null}`.
- Online presence sends about every 25 seconds only while `document.visibilityState==="visible"`.
- Local interaction timestamp updates on `pointerdown`, `keydown`, `touchstart`, `scroll`.
- Module pages use the existing `StudyTimeHeartbeat` wrapper to mount `StudentPresence` with the module name while leaving its study-time effect unchanged.

- [ ] **Step 1: Extend the failing tests**

Assert the presence action writes only `ark60_presence` and never changes `active_seconds`.

- [ ] **Step 2: Run targeted test and confirm RED**

Run: `node --test tests/ark60-admin-control-centre.test.mjs`

- [ ] **Step 3: Implement server presence action in `api/ark60.py`**

Authenticate the student using the existing session path. Reject invalid area/day values, exclude preview `rustam7`, and upsert the single row per student.

- [ ] **Step 4: Implement `StudentPresence` client component**

Keep presence network errors silent so presence can never block studying.

- [ ] **Step 5: Mount presence on Dashboard, day overview and Notifications**

Use areas `Dashboard`, `Day`, and `Notifications`.

- [ ] **Step 6: Mount module presence through `StudyTimeHeartbeat`**

Map its existing `module` prop to display areas `Reading`, `Listening`, `Article`, `Vocabulary`, `Writing`, `Speaking`, preserving the current 20-second study-time heartbeat and 45-second inactivity rule exactly.

- [ ] **Step 7: Run targeted and stabilization tests**

Run:
- `node --test tests/ark60-admin-control-centre.test.mjs`
- `node --test tests/ark60-stabilization.test.mjs`

Expected: presence tests pass; existing study-time tests remain green.

- [ ] **Step 8: Commit**

Commit message: `feat: track student presence separately from study time`

---

### Task 4: Add admin live activity and aligned pending counts

**Files:**
- Modify: `api/ark60.py`
- Modify: `app/admin/page.tsx`
- Modify: `app/globals.css`
- Test: `tests/ark60-admin-control-centre.test.mjs`

**Interfaces:**
- New GET action: `admin_live_activity`.
- Response rows:
  - `student_id`
  - `full_name`
  - `username`
  - `status: "online"|"idle"|"offline"`
  - `current_area`
  - `day_number`
  - `last_seen_at`
  - `last_interaction_at`
  - `today_seconds`
  - `total_seconds`
  - `last_login_at`
  - `last_logout_at` when an explicit revoked session exists
- Online threshold: last seen <= 60 seconds.
- Idle threshold: last seen <= 60 seconds and last interaction > 90 seconds.
- Offline: last seen > 60 seconds.
- `admin_dashboard.pending_writing` and `pending_speaking` count only pending submissions still within their inbox window.

- [ ] **Step 1: Add failing tests for live-activity response and pending-window alignment**

- [ ] **Step 2: Implement `admin_live_activity`**

Read active students, presence rows, aggregated `ark60_study_sessions`, and latest session timestamps server-side. Exclude preview account `rustam7`.

- [ ] **Step 3: Align dashboard pending counts**

Writing pending cutoff: `submitted_at >= now - 72 hours`.

Speaking pending cutoff: submitted attempt remains inside its existing `expires_at` / 72-hour window.

- [ ] **Step 4: Remove Content Manager from visible admin navigation**

Remove it from `sections` and remove the Overview 60-day content manager/shortcut surface. Do not delete content APIs or challenge content.

- [ ] **Step 5: Build the Live Student Activity Overview panel**

Show KPIs and compact rows sorted Online → Idle → Offline. Use green/amber/gray status indicators and show current area/day and Last seen.

- [ ] **Step 6: Add live status to Students view**

Reuse the loaded live-activity map to show status, last seen, today study time and total study time without turning Students into a duplicate dashboard.

- [ ] **Step 7: Poll admin live state safely**

Refresh while admin tab is visible every 25–30 seconds; stop polling while hidden.

- [ ] **Step 8: Run tests**

Run:
- `node --test tests/ark60-admin-control-centre.test.mjs`
- `node --test tests/ark60-stabilization.test.mjs`

- [ ] **Step 9: Commit**

Commit message: `feat: add live student activity to admin overview`

---

### Task 5: Add Writing/Speaking sidebar badges and admin notification feed

**Files:**
- Modify: `api/ark60.py`
- Modify: `app/admin/page.tsx`
- Modify: `app/globals.css`
- Test: `tests/ark60-admin-control-centre.test.mjs`

**Interfaces:**
- Sidebar badge values use `dashboard.pending_writing` and `dashboard.pending_speaking`.
- New GET action `admin_notifications` returns recent pending Writing/Speaking items inside the 72-hour window:
  - `id`
  - `module`
  - `day_number`
  - `student_name`
  - `username`
  - `submitted_at`
  - `expires_at`
- Bell badge = pending Writing + pending Speaking.
- Opening Notifications does not clear anything.
- Review completion is the only normal action that reduces pending count before expiry.

- [ ] **Step 1: Add failing tests for badges/feed**

- [ ] **Step 2: Implement `admin_notifications` server action**

Return only admin-authorized, non-preview, still-actionable inbox records.

- [ ] **Step 3: Render Writing/Speaking badges in sidebar**

Use the existing request-badge visual language, with compact numeric pills.

- [ ] **Step 4: Render top-bell combined badge and Notifications view**

Each feed item links to `/admin/writing?id=<id>` or `/admin/speaking?id=<id>`.

- [ ] **Step 5: Refresh counts after returning from inbox pages**

Dashboard focus/visibility refresh keeps badges synchronized after grading.

- [ ] **Step 6: Run tests and commit**

Commit message: `feat: add admin inbox badges and notification feed`

---

### Task 6: Make Listening admin day-aware and visually consistent without changing student Listening

**Files:**
- Modify: `app/api/challenge-listening/route.ts`
- Modify: `app/admin/listening/page.tsx`
- Modify: `app/admin/listening/listening-admin.css`
- Test: `tests/ark60-admin-control-centre.test.mjs`
- Regression: `tests/ark60-stabilization.test.mjs`

**Interfaces:**
- `admin_list` accepts optional `day` and returns:
  - `available_days:[{day_number:number,title:string,submission_count:number}]`
  - filtered `submissions`
- `admin_detail&id=<attemptId>` derives the attempt day from the stored attempt before loading content.
- Student GET/POST continues to enforce the current published student Listening scope exactly as before.

- [ ] **Step 1: Add failing Listening admin tests**

Assert admin requests are not hardcoded to Day 1 and student DAY/scoring guards remain.

- [ ] **Step 2: Refactor only the admin branches in the Listening route**

Handle `admin_list` and `admin_detail` before the student-only Day 1 guard. For detail, query the attempt first, then fetch matching day content.

- [ ] **Step 3: Add data-driven day selector**

Cards show Day, calendar date and test title. Keep selected day in state and reload list when changed.

- [ ] **Step 4: Replace `← Admin` text link with `AnimatedBackButton`**

- [ ] **Step 5: Align typography/layout to Reading Reports**

Brand/major heading may remain serif; operational UI and question review use sans-serif. Keep compact KPIs, search/refresh and responsive master-detail behavior.

- [ ] **Step 6: Verify Day 01 regression**

Open an existing Day 01 result and confirm score, band, four sections and all 40 review answers are unchanged.

- [ ] **Step 7: Run tests**

Run both admin-control and stabilization suites.

- [ ] **Step 8: Commit**

Commit message: `feat: add day-aware Listening admin reports`

---

### Task 7: Redesign Writing inbox and expose real active Writing time

**Files:**
- Modify: `app/api/challenge-writing/route.js`
- Modify: `app/admin/writing/page.tsx`
- Modify: `app/admin/writing/writing-admin.css`
- Test: `tests/ark60-admin-control-centre.test.mjs`

**Interfaces:**
- `admin_list` returns only submissions with `submitted_at >= now - 72 hours`.
- Each row adds `active_writing_seconds`, summed from `ark60_study_sessions` where `student_id`, `day_number`, `module='writing'`.
- Existing `payload.duration_seconds` remains Task Timer Used.
- Optional query `day=<n>` filters the inbox.
- Optional query `id=<submissionId>` allows deep-link auto-selection client-side without changing grade semantics.

- [ ] **Step 1: Add failing tests for active time and 72-hour inbox**

- [ ] **Step 2: Enrich Writing admin list API**

Fetch submissions inside cutoff, student data and Writing study sessions; aggregate active seconds per student/day.

- [ ] **Step 3: Convert UI from tall stacked cards to compact master-detail**

Left: student/day/task/words/submitted/status.  
Right: PDF, Words, Active Writing Time, Task Timer Used, submitted time, band, feedback, Save/Update.

- [ ] **Step 4: Add day selector/filter**

Only show days represented in the current 72-hour inbox records.

- [ ] **Step 5: Use `AnimatedBackButton` and shared typography hierarchy**

- [ ] **Step 6: Preserve grading/PDF behavior**

Existing `grade` action and PDF URL must remain unchanged.

- [ ] **Step 7: Run tests and commit**

Commit message: `feat: redesign Writing admin inbox`

---

### Task 8: Polish Speaking inbox and enforce non-destructive 72-hour inbox visibility

**Files:**
- Modify: `app/api/challenge-speaking/route.ts`
- Modify: `app/admin/speaking/page.tsx`
- Modify: `app/admin/speaking/speaking-admin.css`
- Read only/protect: `supabase/functions/ark60-speaking-cleanup/index.ts`
- Test: `tests/ark60-admin-control-centre.test.mjs`

**Interfaces:**
- `admin_list` returns only submitted attempts whose `expires_at > now`.
- Day filter query is supported.
- Each row exposes `expires_at` already stored; client formats remaining time.
- Deep link `?id=<attemptId>` auto-opens an item if still in inbox.
- Existing cleanup function continues physically deleting only expired audio and marks `audio_expired=true`.

- [ ] **Step 1: Add failing tests for 72-hour Speaking inbox filtering and cleanup preservation**

- [ ] **Step 2: Filter admin list by unexpired attempts**

Do not delete attempt/result rows.

- [ ] **Step 3: Add day selector and compact rows**

Show answer count, audio duration, review status and expiry.

- [ ] **Step 4: Add clear expiry labels**

Display `Expires in …` on pending rows/details and `Available until …` where useful.

- [ ] **Step 5: Replace text back link and align typography**

Use `AnimatedBackButton`, compact controls and sans-serif operational text.

- [ ] **Step 6: Preserve audio/review workflow**

Part groups, signed audio playback, Play all, band and feedback remain functionally unchanged.

- [ ] **Step 7: Run tests and commit**

Commit message: `feat: polish Speaking admin inbox and expiry`

---

### Task 9: Full automated verification before preview acceptance

**Files:**
- No product changes unless failures require fixes.

**Interfaces:**
- Uses project scripts in `package.json`.

- [ ] **Step 1: Run full Node tests**

Run: `npm test`

Expected: 0 failures.

- [ ] **Step 2: Run TypeScript check**

Run: `npm run typecheck`

Expected: exit 0.

- [ ] **Step 3: Run production build**

Run: `npm run build`

Expected: exit 0.

- [ ] **Step 4: Re-run Supabase advisors**

Confirm no new critical security/performance issue from presence storage.

- [ ] **Step 5: Compare feature branch against main**

Verify changed files are limited to the spec/plan, additive migration, presence/admin APIs, admin UI/CSS, and tests. No student scoring content or answer-key migrations may change.

---

### Task 10: Vercel preview browser verification

**Files:**
- No product changes unless verification finds a regression.

**Interfaces:**
- Feature branch Vercel preview only; production remains on the existing READY main deployment until this task passes.

- [ ] **Step 1: Wait for feature-branch preview deployment to become READY**

- [ ] **Step 2: Verify admin Overview**

Check:
- Content Manager absent
- Online/Idle/Offline table renders
- Writing/Speaking badges render
- bell count/feed renders
- mobile layout has no overflow/zoom issue

- [ ] **Step 3: Verify Listening admin**

Check Day selector, existing Day 01 result, score, band, Section 1–4, 40 answers, back button and typography.

- [ ] **Step 4: Verify Writing admin**

Check compact list/detail, Active Writing Time vs Task Timer Used, PDF open, grading controls and day filter.

- [ ] **Step 5: Verify Speaking admin**

Check day filter, expiry labels, audio playback, Play all, grading and expired-audio fallback.

- [ ] **Step 6: Verify student regressions**

Open student Dashboard, a study Day, Reading, Listening, Vocabulary, Writing and Speaking routes. Confirm presence requests do not disrupt page behavior and study-time still follows the existing idle/visibility rules.

- [ ] **Step 7: Check preview runtime logs for new errors**

No recurring 4xx/5xx presence loop and no admin API exceptions.

---

### Task 11: Merge and verify production

**Files:**
- No new code unless merge conflict resolution is required.

**Interfaces:**
- Merge `feat/admin-control-centre-v2` into `main` only after Tasks 1–10 pass.

- [ ] **Step 1: Create/review PR diff**

Confirm no unexpected files and no destructive database/data operations.

- [ ] **Step 2: Merge to main**

- [ ] **Step 3: Wait for production Vercel deployment READY**

Do not announce completion while state is QUEUED/BUILDING.

- [ ] **Step 4: Production smoke check**

Re-check:
- Admin Overview live activity
- Listening Day 01 result
- Writing inbox
- Speaking inbox
- student Dashboard

- [ ] **Step 5: Report exact production state**

Report production READY deployment/commit and any intentionally deferred items.