# ARK 60 – Telegram manual Billing (staged)

## Plans
- Challenge weekly: 15,000 UZS, 7 days after approval.
- MOCK Only: 25,000 UZS, one upcoming Sunday full MOCK.
- All Access: 35,000 UZS, both of the above.
- All amounts are calculated server-side; no client-provided price is trusted.
- Previous 4-week promotional prices are NOT part of this first rollout.

## Payment process
1. Student selects plan, UZCARD or HUMO, creates an order.
2. Student transfers to the card displayed from the admin-controlled billing settings.
3. Student copies the order code, sends both the code and the bank receipt as a **private Telegram message** to @rustam_usmon0v.
4. Receipt images do not enter this site, its server, or its database.
5. Super admin finds the order code, independently checks the bank transfer, confirms only once.
6. Atomic review function marks the order approved and grants the selected plan; rejected orders carry a reason.
7. Student can review plan status and order history under Billing. Each student can have only one pending order.

## Safeguards
- Dedicated signed-session auth for student and super admin using existing ARK60 cookies.
- RLS enabled on billing tables. API uses service-role server-side; no anonymous database access.
- Atomic review with row locking prevents double activation on concurrent admin clicks.
- Confirmation is not proof of receipt. Super admin must verify actual bank credit.
- Server-side price fixed in catalog; existing scores/progress remain untouched.
- This first-stage pull request deliberately does NOT turn on access gating of lesson/mock APIs.

## Launch checklist (do NOT auto-enable)
- [ ] Review and merge code only after build/typecheck succeeds.
- [ ] Apply supabase/migrations/20261015_ark60_billing_manual.sql to the correct existing project.
- [ ] Confirm the payment RPC grants and RLS; check service-role key only on server.
- [ ] Sign in as the real Super Admin and enter real UZCARD/HUMO card details on To‘lovlar; never place real card numbers in Git or public screenshots.
- [ ] Test student order: card displayed correctly, order ID, Telegram private receipt instructions, duplicate pending protection.
- [ ] Manually verify payment through a real bank app or statement before approval.
- [ ] Test approval + reject + simultaneous approval and read-only payment history.
- [ ] Test expiry at 7 days, Sunday assignment, admin preview, dark mode, mobile.
- [ ] Decide when to activate billing restrictions. Before gating new lessons, notify parents/students, define legacy/grace access and school exemptions.
- [ ] Implement robust backend permission checks in ALL relevant learning endpoints only in a separate release (not in this PR).
- [ ] Add pagination before reaching 200+ payments. Add renewal notice later.
