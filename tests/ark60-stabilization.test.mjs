import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=(path)=>fs.readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Writing workflow uses database-approved reviewed status, never checked",()=>{
  const api=read("app/api/challenge-writing/route.js");
  const page=read("app/day/[day]/writing/page.tsx");
  const admin=read("app/admin/writing/page.tsx");
  const notifications=read("app/notifications/page.tsx");
  assert.match(api,/review_status:\s*"reviewed"/);
  assert.match(api,/\.eq\("review_status",\s*"reviewed"\)/);
  assert.doesNotMatch(api,/review_status:\s*"checked"/);
  assert.doesNotMatch(api,/\.eq\("review_status",\s*"checked"\)/);
  assert.doesNotMatch(page,/review_status==="checked"/);
  assert.doesNotMatch(admin,/review_status==="checked"/);
  assert.doesNotMatch(notifications,/review_status==="checked"/);
});

test("preview account is explicitly isolated from persistent challenge writes",()=>{
  const writing=read("app/api/challenge-writing/route.js");
  const reading=read("app/api/challenge-reading/route.ts");
  const vocab=read("app/api/challenge-vocab/route.ts");
  const article=read("app/api/challenge-article/route.ts");
  const backend=read("api/ark60.py");
  assert.match(writing,/PREVIEW_USERNAME\s*=\s*"rustam7"/);
  assert.match(writing,/preview-writing-/);
  assert.match(reading,/user\.username===previewName/);
  assert.match(reading,/preview:true/);
  assert.match(vocab,/isPreview\(student\)/);
  assert.match(article,/isPreview\(user\)/);
  assert.match(backend,/user\.get\("username"\)=="rustam7"/);
});

test("Article navigation is available on every scheduled challenge day",()=>{
  const sidebar=read("app/components/challenge-sidebar.tsx");
  assert.match(sidebar,/name==="Article"&&scheduled\?/);
  assert.doesNotMatch(sidebar,/name==="Article"&&day===1/);
});

test("dashboard completion uses published module requirements rather than six hardcoded modules",()=>{
  const dashboard=read("app/dashboard/page.tsx");
  assert.match(dashboard,/required_by_day/);
  assert.match(dashboard,/required\.length>0&&required\.every/);
  assert.doesNotMatch(dashboard,/d\.n!==14/);
});

test("dashboard polling is throttled and skips hidden tabs",()=>{
  const dashboard=read("app/dashboard/page.tsx");
  assert.match(dashboard,/document\.visibilityState==="visible"/);
  assert.match(dashboard,/300000/);
  assert.doesNotMatch(dashboard,/setInterval\(refresh,60000\)/);
});
