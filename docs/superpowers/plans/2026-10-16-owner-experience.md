# Owner Experience Implementation Plan

Goal: ship approved six-screen experience behind existing rustam7 session; all others see Shop Soon.
Spec: ../specs/2026-10-16-owner-experience.md
Architecture: isolated service-only sandbox state plus atomic RPC, one authenticated API, focused React panels and generated original artwork. Existing study/billing untouched.

- [x] Add tests for authorization, catalog, ranks, normalized review and deduplicated progress; observe missing implementation, implement helpers.
- [x] Add additive RLS-locked state/catalog and atomic server mutations. Verify with rollback SQL: non-owner denied; purchase duplicate/free/insufficient; equip ownership; task/review/quest repeat reward; refill/reset isolation.
- [x] Add API GET/POST using existing getStudent; enforce owner before queries; reject cross-site, unknown actions and invalid IDs. Snapshot no-store.
- [x] Add Today, Shop, mistake practice, progress and quest components. Persist actions; surface loading/error states; confirm purchases and full reset.
- [x] Add theme provider validated by API and dataset-scoped CSS. Preview reversible; route changes clear preview; actual exam pages use plain readable surfaces and no motion.
- [x] Generate original Forest/Library/Aurora/fox/owl assets, optimize PNGs, add provenance. Existing icon library supplies other cosmetics.
- [x] Integrate owner navigation and student Shop Soon. Browser check owner, student, buy/equip/refill/reload, all categories, mobile overflow, keyboard dialog, theme cancel.
- [ ] Commit/push GitHub, verify Vercel READY and unauthenticated API denial. Tests/build completed.

Review focus: multiple-tab stale purchases, client-forged owner flag, last-item filtering and empty inventory, logout/theme leakage, reduced-motion/exam readability.
