# Site-Wide 60-Day Challenge Design Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved light blue design consistently across the ARK IELTS challenge, student, and admin UI while making every label readable.

**Architecture:** Reuse the existing global and page-scoped stylesheets. Define the shared palette in `app/globals.css`, then tune the challenge modules, admin styles, and notification styles with scoped selectors. No React, API, data, or lesson behavior changes.

**Tech Stack:** Next.js App Router, CSS, Vercel preview deployments.

**Spec:** `docs/superpowers/specs/2026-10-07-sitewide-challenge-design.md`

## Global Constraints

- Main canvas `#F6F8FC`; cards `#FFFFFF`; borders `#E3E9F1`; main text `#142338`.
- Navy navigation `#142B4A`; primary `#2563EB`; hover `#1D4ED8`; soft blue `#EAF2FF`.
- Body text is at least 14px; lesson passage and question text is at least 16px; metadata and utility text is at least 12px, with compact question-number controls allowed at 11px.
- Small text contrast is at least 4.5:1; keyboard focus remains visible.
- Preserve dashboard dark theme, correct/wrong answer colors, reading highlights, back controls, disabled and destructive states.
- Do not change application logic, API routes, authentication, lesson content, scoring, unlock rules, or student data.
- Keep page layouts and existing responsive breakpoints; prevent clipping on narrow screens.

## Review Focus

1. Small viewports: labels wrap or reflow without clipping; verify at 390px.
2. Reading answers and highlight marks: confirm colors and positions remain unchanged.
3. Correct/wrong feedback: confirm the existing green/red meanings survive all new rules.
4. Dashboard dark mode: confirm dark surfaces are not replaced by light overrides.
5. Long English and Uzbek labels: confirm tables, buttons, and cards remain readable without overflow.

---

### Task 1: Shared site palette and dashboard surfaces

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: approved palette and readability requirements from the design spec.
- Produces: scoped shared tokens and the dashboard, entry, navigation, card, and typography base styles used by later pages.

- [ ] **Step 1: Add shared tokens and scoped canvas/surface overrides** using the exact spec values; keep overrides scoped so exam and answer-state selectors are not caught by generic rules.
- [ ] **Step 2: Update dashboard and entry typography** to the specified minimum sizes while preserving layout, serif/sans pairing, dark theme, and mobile breakpoints.
- [ ] **Step 3: Inspect selector scope** to ensure only intended primary actions, neutral controls, and background surfaces are affected.

**Check:** Preview CSS includes shared tokens; dark theme, back, disabled, destructive, and answer-state selectors retain their own rules.

---

### Task 2: Student challenge lesson pages

**Files:**
- Modify: `app/day/[day]/article/article.css`
- Modify: `app/day/[day]/listening/listening.css`
- Modify: `app/day/[day]/mock/mock.css`
- Modify: `app/day/[day]/speaking/speaking.css`
- Modify: `app/day/[day]/vocabulary/vocabulary.css`
- Modify: `app/day/[day]/writing/writing.css`
- Modify: `app/globals.css` (reading and reading-analysis selectors)

**Interfaces:**
- Consumes: shared tokens from Task 1.
- Produces: consistent pale page canvas, white exam paper surfaces, legible interface text, and matching primary actions.

- [ ] **Step 1: Align page backgrounds, cards, borders, and heading colors** with the shared tokens; retain white reading/listening paper surfaces.
- [ ] **Step 2: Increase small interface text** to spec minimums and check mobile wrapping.
- [ ] **Step 3: Restyle only primary actions**; preserve answer-option controls, correct/wrong states, timers, highlights, and Back controls.

**Check:** Inspect each module in preview at desktop and 390px. Confirm question, answer, result, and highlight states are unchanged.

---

### Task 3: Admin and notification pages

**Files:**
- Modify: `app/admin/listening/listening-admin.css`
- Modify: `app/admin/mock/mock-admin.css`
- Modify: `app/admin/speaking/speaking-admin.css`
- Modify: `app/admin/writing/writing-admin.css`
- Modify: `app/notifications/notifications.css`
- Modify: `app/globals.css` (admin dashboard and reading-admin surfaces)

**Interfaces:**
- Consumes: shared tokens from Task 1.
- Produces: consistent admin and notification page surfaces, controls, table text, and status labels.

- [ ] **Step 1: Align admin and notification backgrounds, cards, borders, and headings** without changing page layout.
- [ ] **Step 2: Apply shared button and text sizes** while preserving status colors and table readability.
- [ ] **Step 3: Check long names, long lesson titles, and narrow layouts** for clipping.

**Check:** Preview each admin route and notifications route at desktop and 390px; verify table/status distinctions remain clear.

---

### Task 4: Preview verification and release

**Files:**
- No additional product files; review all styles changed in Tasks 1–3.

- [ ] **Step 1: Review the full diff** and confirm only CSS changes are present.
- [ ] **Step 2: Build a Vercel preview** and verify the CSS bundle returns successfully with the approved tokens.
- [ ] **Step 3: Check representative student and admin routes** at desktop and mobile widths; inspect focus state and high-contrast labels.
- [ ] **Step 4: Run repository checks.** Report any unrelated existing failures separately; do not bypass a failing gate silently.
- [ ] **Step 5: Merge only after preview and checks are reviewed.** Confirm the production deployment reaches READY and the production CSS bundle includes the new palette.

**Check:** Production verification shows the new CSS is live; no student records or challenge progress are written during verification.
