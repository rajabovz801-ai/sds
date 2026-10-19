import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const file=(p)=>fs.readFileSync(p,"utf8");
const sql=file("supabase/migrations/20261019_cash_billing_v1.sql");
test("cash receipt is atomic, audited and server-priced",()=>{
 assert.match(sql,/ark60_billing_record_cash/);
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.match(sql,/cash_request_id/);
 assert.match(sql,/create unique index if not exists ark60_billing_cash_request_uq/);
 assert.match(sql,/p_plan='challenge' then 15000 else 25000/);
 assert.match(sql,/interval '7 days'/);
 assert.match(sql,/payment_method.*'cash'/);
 assert.match(sql,/insert into public\.ark60_billing_access/);
 assert.match(sql,/insert into public\.ark60_billing_audit/);
 assert.match(sql,/insert into public\.ark60_billing_events/);
 assert.match(sql,/grant execute on function public\.ark60_billing_record_cash/);
});
test("a combined package cannot be bought via cash or bank",()=>{
 const api=file("app/api/admin/billing/route.ts");
 assert.match(api,/!\["challenge","mock"\]\.includes\(input\.plan\)/);
 assert.match(api,/input\.action === "record_cash"/);
 assert.match(api,/input\.confirmed!==true/);
 assert.match(file("lib/billing/plans.ts"),/key: "challenge"/);
 assert.doesNotMatch(file("lib/billing/plans.ts"),/key: "all_access"/);
});
test("day 1 and day 2 trial remains but mock stays separate",()=>{
 const access=file("lib/billing/access-policy.ts");
 assert.match(access,/membership\.trial_eligible&&day<=2/);
 assert.match(access,/membership\.mock_dates\.includes/);
 const cash=file("app/components/admin-billing-panel.tsx");
 assert.match(cash,/Naqd to‘lovni tasdiqlash/);
 assert.match(cash,/Day 1–2 bepul sinov saqlanadi/);
});
