# Site-Wide 60-Day Challenge Design Refresh

**Status:** Design review pending  
**Date:** 2026-10-07  
**Project:** `rajabovz801-ai/sds` (`arkielts`)

## Goal

Give the 60-Day Challenge a consistent, calm, professional visual style across the student experience and admin pages while keeping lesson content, scoring, saved work, and student records unchanged.

## Current problem

The dashboard uses a light navy-and-blue style, but lesson modules and admin screens still mix purple, gold, brown, charcoal, and several different background tones. Small task labels and coin badges are hard to read at desktop scale. The visual system changes from one page to another.

## Chosen approach

Use a shared set of color tokens, then apply them through scoped rules in the existing stylesheets. This keeps the palette consistent while preventing broad button and background selectors from changing answer choices, result states, or back controls.

Other options considered:

1. **One global restyle:** quick, but broad selectors can unintentionally alter test controls and semantic answer states.
2. **Independent page-by-page restyle:** tightly scoped, but repeats values and risks the palette drifting again.
3. **Shared tokens plus scoped page rules (recommended):** centralizes the palette and lets each page keep its own layout and interaction states.

## Visual system

| Role | Design value |
| --- | --- |
| Main page canvas | `#F6F8FC` |
| Cards and paper surfaces | `#FFFFFF` |
| Light borders | `#E3E9F1` |
| Main text | `#142338` |
| Navy navigation | `#142B4A` |
| Primary action | `#2563EB` |
| Primary hover | `#1D4ED8` |
| Soft blue surface | `#EAF2FF` |
| Coin/reward accent | Keep a restrained gold |
| Correct/incorrect states | Preserve existing green and red |
| Reading highlights | Preserve existing highlight colors |

Keep the current serif heading and sans-serif interface pairing. Use flat, light surfaces with subtle borders; retain the mountain motif only as a quiet dashboard decoration. Primary actions get clear hover and keyboard-focus states. Back, secondary, disabled, destructive, and answer-choice controls keep their distinct meanings.

## Page coverage

- Sign-in and entry page
- Student dashboard, 60-Day Plan, progress, and leaderboard
- Reading, listening, article, vocabulary, writing, speaking, and full-mock pages
- Notifications
- Admin dashboard and listening, reading, speaking, writing, and mock pages

The reading passage remains a clean white paper surface on a pale canvas so students can focus on the text. The dashboard retains its current structure; metadata labels may be enlarged slightly for legibility without changing content or navigation.

## Boundaries

- CSS and visual tokens only; do not change React logic, API routes, database schema, authentication, timing, scoring, answer correctness, unlock rules, or stored student data.
- Preserve the dashboard dark theme.
- Preserve correct/wrong colors, reading highlights, and all back-button behavior.
- Keep existing responsive breakpoints and layouts; make only visual adjustments needed to prevent clipping on small screens.

## Acceptance checks

1. Every listed surface uses the same light canvas, card, border, text, and primary-action palette.
2. Primary button text remains readable; blue action backgrounds meet a 4.5:1 contrast target for small white text.
3. Answer choices, correct/wrong feedback, highlights, timers, and disabled states retain their existing meanings and behavior.
4. Dashboard dark mode remains dark.
5. Desktop and mobile preview routes render without clipping or layout regressions.
6. Production and preview records remain untouched; this change does not write to student data.
