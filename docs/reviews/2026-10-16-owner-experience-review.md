# Owner experience verification

Approved scope: Shop Soon for students, six-section functional experiment for active rustam7 only. Uses an isolated persistent sandbox economy and explicitly labelled sample learning data; it does not replace live scoring, entitlements, teacher feedback or existing real reports.

Implementation: 14 catalog items across six cosmetic categories; original generated PNG wallpapers/characters; buy confirmation, reversible theme preview, inventory, one equipped item per category, wallet refill and confirmed reset. Today demo checklist, answer/evidence review, vocabulary with due times and browser speech where supported, demo partner quest with once-only reward, achievement and progress views. Themes affect dashboard and lesson chrome; test paper stays plain and motion is paused outside dashboard.

Checks:
- 223 Node tests passed, including owner allowlist and learning/catalog helpers.
- Production Next.js build passed.
- Supabase rollback checks passed for non-owner denial, server prices, double-purchase idempotence, unowned equip denial, review correct/wrong/correct reward isolation, whitespace normalization, task/quest idempotence, capped quest, insufficient funds, refill retaining inventory, clear/reset, public grant denial and no writes to real coin events.
- Browser fixtures: owner desktop all sections, categories, preview/cancel, buy/equip/reload, reduced motion, retry and vocabulary, quest claim; mobile 390px no horizontal overflow; non-owner Shop Soon without owner links. Fixtures don't modify production learner data.
- Independent code review found and resolved pending-review navigation race, missing topbar sandbox label, and theme scope. Follow-up review found no blockers.

Limits: this is a Rustam-only sandbox rollout. Learning samples and partner actions are labelled demonstrations, not generated teacher feedback or invitations to actual students. No public store launch or student purchases. Browser speech depends on device voice support. No claim of being bug-free.

Rollback: restore prior application commit b5320508ff22199bec4406c10a640f1fc57b8dec. New RLS-locked tables/functions remain isolated and can be unused. No learner data migration or destructive edits.
