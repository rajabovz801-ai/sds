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

test("Article remains reachable from the day plan after redundant module sidebar removal",()=>{
  const sidebar=read("app/components/challenge-sidebar.tsx");
  const dayPage=read("app/day/[day]/page.tsx");
  assert.doesNotMatch(sidebar,/MY MODULES/);
  assert.match(dayPage,/name==="Article"\?"\/day\/"\+day\+"\/article"/);
  assert.doesNotMatch(dayPage,/name==="Article"&&day===1/);
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


test("student dashboard exposes real reward leaderboard progress and profile panels without Achievements",()=>{
  const page=read("app/dashboard/page.tsx");
  const panels=read("app/components/challenge-hub-panels.tsx");
  assert.match(page,/LeaderboardPanel/);
  assert.match(page,/ProgressPanel/);
  assert.match(page,/ProfilePanel/);
  assert.match(page,/RewardModal/);
  assert.match(page,/task-coin-badge/);
  assert.doesNotMatch(page,/Achievements/);
  assert.doesNotMatch(panels,/AchievementsPanel/);
  assert.doesNotMatch(page,/>MY MODULES</);
  assert.match(panels,/action:"claim_daily_reward"/);
  assert.match(panels,/action:"update_profile"/);
  assert.match(panels,/action:"logout_all"/);
  assert.match(panels,/action=leaderboard/);
});

test("challenge sidebar no longer duplicates the My Modules list",()=>{
  const sidebar=read("app/components/challenge-sidebar.tsx");
  assert.doesNotMatch(sidebar,/MY MODULES/);
  assert.match(sidebar,/Day \{String\(day\)\.padStart/);
});

test("completion reward paths remain preview-safe",()=>{
  const reading=read("app/api/challenge-reading/route.ts");
  const article=read("app/api/challenge-article/route.ts");
  const vocab=read("app/api/challenge-vocab/route.ts");
  const writing=read("app/api/challenge-writing/route.js");
  assert.match(reading,/preview:true/);
  assert.match(article,/isPreview\(user\)/);
  assert.match(vocab,/isPreview\(student\)/);
  assert.match(writing,/student\.username === PREVIEW_USERNAME/);
});

test("student API provides reward center leaderboard and editable profile actions",()=>{
  const backend=read("api/ark60.py");
  assert.match(backend,/action=="reward_center"/);
  assert.match(backend,/rpc\/ark60_reward_center/);
  assert.match(backend,/action=="leaderboard"/);
  assert.match(backend,/rpc\/ark60_leaderboard_snapshot/);
  assert.match(backend,/action=="claim_daily_reward"/);
  assert.match(backend,/rpc\/ark60_claim_daily_reward/);
  assert.match(backend,/action=="update_profile"/);
  assert.match(backend,/date_of_birth,gender,english_level,exam_date/);
});


test("study-time heartbeat ignores hidden and idle tabs",()=>{
  const heartbeat=read("app/components/study-time-heartbeat.tsx");
  assert.match(heartbeat,/document\.visibilityState!==\"visible\"/);
  assert.match(heartbeat,/Date\.now\(\)-lastActivity>45000/);
  assert.match(heartbeat,/pointerdown/);
  assert.match(heartbeat,/keydown/);
});

test("admin leaderboard and study-time views use live metrics",()=>{
  const admin=read("app/admin/page.tsx");
  const backend=read("api/ark60.py");
  assert.match(backend,/action==\"admin_leaderboard\"/);
  assert.match(admin,/action=admin_leaderboard/);
  assert.match(admin,/view===\"Leaderboard\"/);
  assert.match(admin,/view===\"Study time\"/);
  assert.match(admin,/completed_tasks/);
  assert.match(admin,/active_seconds/);
});


test("profile supports partial saves and awards bonus only when complete",()=>{
  const backend=read("api/ark60.py");
  const block=backend.slice(backend.indexOf('if action=="update_profile":'),backend.indexOf('if action=="admin_login":'));
  assert.match(block,/if gender and gender not in/);
  assert.match(block,/if level and level not in/);
  assert.match(block,/if dob:/);
  assert.match(block,/if exam:/);
  assert.match(block,/complete=bool\(/);
  assert.match(block,/if complete and user\.get\("username"\)!="rustam7"/);
});

test("reward and profile polish keeps preview mode explicit",()=>{
  const page=read("app/dashboard/page.tsx");
  const hub=read("app/components/challenge-hub-panels.tsx");
  assert.match(page,/Preview mode/);
  assert.match(page,/\+1 coin/);
  assert.match(hub,/Complete a task to start your coin history/);
  assert.match(hub,/COINS EARNED/);
  assert.match(hub,/Save changes/);
  assert.match(hub,/Sign out on all devices/);
});


test("Dashboard and 60-Day Plan are distinct live views",()=>{
  const page=read("app/dashboard/page.tsx");
  assert.match(page,/view==="Dashboard"\?<></);
  assert.match(page,/view==="60-Day Plan"\?<></);
  assert.match(page,/TODAY'S PLAN/);
  assert.match(page,/Challenge calendar/);
  assert.doesNotMatch(page,/view==="Dashboard"\|\|view==="60-Day Plan"/);
});

test("student sidebar keeps only reward and profile at the bottom",()=>{
  const page=read("app/dashboard/page.tsx");
  assert.match(page,/sidebar-reward-btn/);
  assert.match(page,/sidebar-profile-tile/);
  assert.doesNotMatch(page,/One day at a time/);
  assert.doesNotMatch(page,/className="back-login"/);
});

test("dashboard topbar removes clock and duplicate profile and adds theme control",()=>{
  const page=read("app/dashboard/page.tsx");
  assert.doesNotMatch(page,/time-chip/);
  assert.doesNotMatch(page,/profile-chip/);
  assert.match(page,/theme-toggle/);
  assert.match(page,/ark60-theme/);
  assert.match(page,/Switch to dark mode/);
});

test("full Welcome title uses typewriter animation",()=>{
  const page=read("app/dashboard/page.tsx");
  const css=read("app/globals.css");
  assert.match(page,/const full="Welcome, "\+stats\.student\.first_name\+"\."/);
  assert.match(page,/setTypedWelcome\(full\.slice\(0,index\)\)/);
  assert.match(page,/typewriter-caret/);
  assert.match(css,/ark-caret-blink/);
});

test("calendar dots reflect published module requirements",()=>{
  const page=read("app/dashboard/page.tsx");
  assert.match(page,/required\.includes\(m\.name\.toLowerCase\(\)\)\?m\.tone:"muted"/);
  assert.match(page,/dot-small muted/);
});
