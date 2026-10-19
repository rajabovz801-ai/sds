import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=(path)=>fs.readFileSync(path,"utf8");
test("Challenge and Full MOCK are sold as two independent plans",()=>{
 const plans=read("lib/billing/plans.ts");
 assert.match(plans,/key: "challenge".*price: 15000/);
 assert.match(plans,/key: "mock".*price: 25000/);
 assert.doesNotMatch(plans,/key: "all_access"/);
});
test("Mock requires its own access even when a Challenge subscription covers Sunday",()=>{
 const access=read("lib/billing/access-policy.ts");
 assert.match(access,/date\.getUTCDay\(\)===0\)return membership\.mock_dates\.includes/);
 const notice=read("app/components/membership-notice.tsx");
 assert.match(notice,/Full MOCK alohida to‘lanadi/);
 assert.doesNotMatch(notice,/All Access paketi/);
});
test("Legacy combined pending orders cannot be approved or recreated",()=>{
 const api=read("app/api/admin/billing/route.ts");
 const student=read("app/api/billing/route.ts");
 assert.match(api,/order\?\.plan_key==="all_access"/);
 assert.match(api,/!\["challenge","mock"\]\.includes\(input\.plan\)/);
 assert.match(student,/isBillingPlan\(body\.plan_key\)/);
 const ui=read("app/components/billing-panel.tsx");
 assert.match(ui,/Oldingi All Access buyurtmangiz mavjud/);
});
