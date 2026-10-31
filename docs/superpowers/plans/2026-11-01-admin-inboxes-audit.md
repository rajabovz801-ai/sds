# Admin inbox integration and regression audit

User-approved scope: integrate Writing/Speaking into the existing sidebar and fix verified admin regressions, preserving backend grading/access/storage semantics.

- [x] Integrate all five reports using stable section URLs; sidebar, overview shortcuts and notifications use the same shell. Browser refresh/back restores a section; direct legacy routes continue working.
- [x] Make reviewed notification targets visible; use each target only once so refresh does not reselect an old notification.
- [x] Guard report fetches against stale responses and unmounts; clear old detail before loading a new student.
- [x] Validate band input (0 through 9, steps of 0.5), preserve edits on unrelated refresh, serialize grading/AI actions and retain batch completion messages.
- [x] Scope inbox CSS in embedded shell; remove nested main landmarks; update generated dark theme if needed.
- [x] Run regression suite, typecheck and production build; independent review, preview deployment and production verification.

Review focus: reviewed links with pending filter; rapid student/day switching; grading while refreshing; band zero; browser back/refresh; mobile overflow/audio unmount.

Verification: 313/313 Node tests pass; production build (including TypeScript) passes. Reviewed notification tests execute actual inbox load functions with fixture fetch responses. Editable-field tests reproduced the save/edit race before inputs were locked. Independent review found that race; it is fixed and covered. No backend, SQL, payment/access policy or student content changed. Live authenticated browser interaction remains unavailable due to prior browser tool timeouts.
