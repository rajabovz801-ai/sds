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


test("Writing timer restores an explicit zero instead of resetting to full duration",()=>{
  const page=read("app/day/[day]/writing/page.tsx");
  assert.match(page,/Number\.isFinite\(savedRemaining\)\?Math\.max\(0,savedRemaining\):duration/);
  assert.doesNotMatch(page,/Number\(saved\.remaining\)\|\|duration/);
});

test("dashboard redirects expired sessions and surfaces load failures",()=>{
  const dashboard=read("app/dashboard/page.tsx");
  assert.match(dashboard,/res\.status===401/);
  assert.match(dashboard,/window\.location\.replace\("\/"\)/);
  assert.match(dashboard,/Could not load your dashboard/);
});


test("successful registrations stay inside the anti-spam rate-limit bucket",()=>{
  const backend=read("api/ark60.py");
  const register=backend.slice(backend.indexOf('if action=="register":'),backend.indexOf('if action=="login":'));
  assert.match(register,/rate_limit\(request,"register",True\)/);
  assert.doesNotMatch(register,/clear_limit\(bucket\)/);
});


test("Writing drafts are account-scoped and synchronized to the server",()=>{
  const api=read("app/api/challenge-writing/route.js");
  const page=read("app/day/[day]/writing/page.tsx");
  assert.match(api,/ark60_writing_drafts/);
  assert.match(api,/action === "draft"/);
  assert.match(page,/draft_scope/);
  assert.match(page,/ark60-writing-\$\{data\.draft_scope\}-day-/);
  assert.match(page,/action:"draft"/);
  assert.doesNotMatch(page,/ark60-writing-day-\$\{day\}/);
});

test("practice timer never locks Writing editor or submit",()=>{
  const page=read("app/day/[day]/writing/page.tsx");
  assert.match(page,/disabled=\{sending\} spellCheck/);
  assert.match(page,/disabled=\{sending\|\|!answer\.trim\(\)\}/);
  assert.doesNotMatch(page,/disabled=\{!started\|\|paused/);
  assert.doesNotMatch(page,/remaining<=0\}><Send/);
});

test("preview account cannot create study-time heartbeat records",()=>{
  const backend=read("api/ark60.py");
  const heartbeatStart=backend.indexOf('if action=="heartbeat":');
  const heartbeatEnd=backend.indexOf('raise HTTPException(status_code=404,detail="Unknown action")',heartbeatStart);
  const heartbeat=backend.slice(heartbeatStart,heartbeatEnd);
  assert.match(heartbeat,/user\.get\("username"\)=="rustam7"/);
  assert.match(heartbeat,/"preview":True,"added_seconds":0/);
});

test("future day metadata supports the dedicated preview account",()=>{
  const backend=read("api/ark60.py");
  const dayBlock=backend.slice(backend.indexOf('if action=="day":'),backend.indexOf('if action=="admin_me":'));
  assert.match(dayBlock,/user\.get\("username"\)!="rustam7"/);
  assert.match(dayBlock,/"preview":user\.get\("username"\)=="rustam7"/);
});

test("challenge mutation routes reject oversized declared payloads",()=>{
  for(const path of [
    "app/api/challenge-reading/route.ts",
    "app/api/challenge-vocab/route.ts",
    "app/api/challenge-article/route.ts",
    "app/api/challenge-writing/route.js",
  ]){
    const source=read(path);
    assert.match(source,/content-length/);
    assert.match(source,/413/);
  }
});

test("root layout declares a device-width mobile viewport",()=>{
  const layout=read("app/layout.tsx");
  assert.match(layout,/Viewport/);
  assert.match(layout,/width:"device-width"/);
  assert.match(layout,/initialScale:1/);
});
