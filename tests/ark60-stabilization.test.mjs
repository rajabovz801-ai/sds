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
  assert.match(dayBlock,/day_unlocked_for_user\(user,day\)/);
  assert.match(dayBlock,/"preview":user\.get\("username"\)=="rustam7"/);
});

test("challenge mutation routes reject oversized declared payloads",()=>{
  for(const path of [
    "app/api/challenge-reading/route.ts",
    "app/api/challenge-vocab/route.ts",
    "app/api/challenge-article/route.ts",
    "app/api/challenge-writing/route.js",
    "app/api/challenge-listening/route.ts",
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
  assert.match(page,/view==="Dashboard"/);
  assert.match(page,/view==="60-Day Plan"/);
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


test("Speaking is published only for Days 1 to 3 and uses the exact supplied source text",()=>{
  const api=read("app/api/challenge-speaking/route.ts");
  const migration=read("supabase/migrations/20260930_ark60_speaking_days_1_3.sql");
  assert.match(api,/SPEAKING_DAYS=new Set\(\[1,2,3\]\)/);
  assert.match(migration,/Do you think you spend too much time on social media\?/);
  assert.match(migration,/What do people often do on social media\?/);
  assert.match(migration,/Describe an occasion when you got up extremely early\./);
  assert.match(migration,/Are you the kind of person who sticks to dreams\?/);
  assert.match(migration,/Do you think you are an ambitious person\?/);
  assert.match(migration,/Are you an ambitious person\?/);
  assert.match(migration,/Describe a new law you would like to introduce in your country\./);
  assert.match(migration,/Would you use mirrors to decorate your room\?/);
  assert.match(migration,/Describe a person you know who loves to grow plants \(vegetables, fruits, flowers\)\./);
  assert.match(migration,/How do people feel when they eat vegetables that they grew on their own\?/);
});

test("Speaking route validates date, owner, canonical question and payload size",()=>{
  const api=read("app/api/challenge-speaking/route.ts");
  assert.match(api,/await isDayUnlocked\(day,student\)/);
  assert.match(api,/\.eq\("student_id",student\.id\)/);
  assert.match(api,/contentQuestionList\(content\.payload\)\.find\(q=>q\.key===questionKey\)/);
  assert.match(api,/MAX_AUDIO_BYTES=8\*1024\*1024/);
  assert.match(api,/Unsupported audio format/);
  assert.match(api,/Invalid Speaking question/);
  assert.doesNotMatch(api,/student_id=String\(form/);
});

test("Speaking preview never persists real audio, attempts or submissions",()=>{
  const api=read("app/api/challenge-speaking/route.ts");
  assert.match(api,/if\(isPreview\(student\)\)\{\n    return json\(\{ok:true,preview:true,answer:/);
  assert.match(api,/preview-speaking-/);
  assert.match(api,/if\(isPreview\(student\)\)return json\(\{ok:true,preview:true,submission:/);
});

test("Part 2 preparation is server persisted and cannot restart for a real attempt",()=>{
  const api=read("app/api/challenge-speaking/route.ts");
  const page=read("app/day/[day]/speaking/page.tsx");
  assert.match(api,/part2_preparation_started_at/);
  assert.match(api,/\.is\("part2_preparation_started_at",null\)/);
  assert.match(api,/already_started:true/);
  assert.match(page,/part2_preparation_expires_at/);
  assert.match(page,/Preparation is running — this timer cannot be restarted/);
});

test("Speaking submit requires the complete canonical question-key set and awards through ark60_submissions",()=>{
  const api=read("app/api/challenge-speaking/route.ts");
  const migration=read("supabase/migrations/20260930_ark60_speaking_days_1_3.sql");
  assert.match(api,/ark60_submit_speaking_attempt/);
  assert.match(migration,/Complete every Speaking answer before submitting/);
  assert.match(migration,/insert into public\.ark60_submissions/);
  assert.match(migration,/'speaking'/);
  assert.match(migration,/now\(\)\+interval '72 hours'/);
});

test("Speaking audio uses a private bounded bucket and short lived signed playback",()=>{
  const api=read("app/api/challenge-speaking/route.ts");
  const migration=read("supabase/migrations/20260930_ark60_speaking_days_1_3.sql");
  assert.match(migration,/ark60-speaking-audio/);
  assert.match(migration,/false,8388608/);
  assert.match(api,/createSignedUrl\(answer\.storage_path,120\)/);
  assert.match(api,/answer\.student_id!==student\.id/);
  assert.match(api,/Admin sign-in required/);
});

test("Speaking cleanup is hourly, authenticated and only targets expired Speaking audio",()=>{
  const fn=read("supabase/functions/ark60-speaking-cleanup/index.ts");
  const migration=read("supabase/migrations/20260930_ark60_speaking_cleanup.sql");
  assert.match(fn,/speaking_cleanup_token/);
  assert.match(fn,/x-ark-cleanup-token/);
  assert.match(fn,/ark60_speaking_attempts/);
  assert.match(fn,/ark60_speaking_answers/);
  assert.match(fn,/BUCKET="ark60-speaking-audio"/);
  assert.match(fn,/\.lte\("expires_at",now\)/);
  assert.match(fn,/audio_expired:true/);
  assert.match(migration,/ark60-speaking-cleanup-hourly/);
  assert.match(migration,/'7 \* \* \* \*'/);
  assert.doesNotMatch(fn,/\.emptyBucket\(/);
});

test("Speaking student UI has per-question recording, waveform, review and active study tracking",()=>{
  const page=read("app/day/[day]/speaking/page.tsx");
  const css=read("app/day/[day]/speaking/speaking.css");
  assert.match(page,/MediaRecorder/);
  assert.match(page,/getUserMedia/);
  assert.match(page,/canvasRef/);
  assert.match(page,/Record again/);
  assert.match(page,/Save answer/);
  assert.match(page,/Submit Full Speaking/);
  assert.match(page,/StudyTimeHeartbeat day=\{day\} module="speaking"/);
  assert.match(css,/@media\(max-width:720px\)/);
  assert.match(css,/@media\(max-width:410px\)/);
});

test("Speaking admin inbox supports exact-question audio review and band feedback",()=>{
  const admin=read("app/admin/speaking/page.tsx");
  const rootAdmin=read("app/admin/page.tsx");
  assert.match(rootAdmin,/Speaking inbox/);
  assert.match(rootAdmin,/\/admin\/speaking/);
  assert.match(admin,/Play all answers/);
  assert.match(admin,/audio controls/);
  assert.match(admin,/Overall Speaking Band/);
  assert.match(admin,/Teacher feedback/);
  assert.match(admin,/Audio expired/);
});

test("Speaking reviews appear in student notifications",()=>{
  const notifications=read("app/notifications/page.tsx");
  assert.match(notifications,/challenge-speaking\?action=notifications/);
  assert.match(notifications,/Full Speaking reviewed/);
  assert.match(notifications,/speaking\?\"speaking\":\"writing\"/);
});


test("Speaking intro uses compact ARK challenge hierarchy without duplicate brand title",()=>{
  const page=read("app/day/[day]/speaking/page.tsx");
  const css=read("app/day/[day]/speaking/speaking.css");
  assert.doesNotMatch(page,/ARK IELTS SPEAKING/);
  assert.match(page,/DAY \{pad\(day\)\} · FULL SPEAKING/);
  assert.match(page,/sp-preview-banner/);
  assert.match(page,/No real submission or coin will be saved/);
  assert.match(page,/className="sp-back"/);
  assert.match(page,/stage==="intro"\|\|stage==="part1"/);
  assert.match(css,/\.sp-start\{width:340px/);
  assert.match(css,/\.sp-intro\{max-width:650px/);
  assert.match(css,/\.sp-back \.ark-back-icon/);
});


test("Speaking back button keeps the expanding hover animation",()=>{
  const css=read("app/day/[day]/speaking/speaking.css");
  assert.match(css,/transition:width \.48s cubic-bezier/);
  assert.match(css,/width:calc\(100% - 6px\)!important/);
  assert.match(css,/background:#173c62!important/);
  assert.match(css,/fill:#fff!important/);
});


test("Day 1 Listening uses the supplied Test 206 source and audio exactly",()=>{
  const migration=read("supabase/migrations/20260930_day1_listening_test206.sql");
  assert.match(migration,/IELTS Listening Test 206/);
  assert.match(migration,/https:\/\/ia600504\.us\.archive\.org\/32\/items\/test-206\/TEST%20206\.mp3/);
  assert.match(migration,/Oyster Bay Sailing Club Courses/);
  assert.match(migration,/Working as a makeup trainee/);
  assert.match(migration,/Which TWO features of the lecture on ocean biodiversity had the greatest impact on the students\?/);
  assert.match(migration,/Sources of rubber/);
  assert.match(migration,/"1":\["10","ten"\]/);
  assert.match(migration,/"8":\["café","cafe"\]/);
  assert.match(migration,/"21":\["B","D"\]/);
  assert.match(migration,/"23":\["C","E"\]/);
  assert.match(migration,/"31":\["metal","metals"\]/);
  assert.match(migration,/"40":\["soil"\]/);
});

test("challenge Listening has no name ID Telegram or external reporting flow",()=>{
  const page=read("app/day/[day]/listening/page.tsx");
  const api=read("app/api/challenge-listening/route.ts");
  assert.doesNotMatch(page,/studentName|studentId|Telegram|Rajabov_Zuhriddin|Bilimly/);
  assert.doesNotMatch(api,/telegram|GOOGLE_SCRIPT|listening-report|student_name|student_id\s*=\s*String\(body/);
  assert.match(page,/Start Listening/);
  assert.match(page,/Review answers/);
  assert.match(page,/Your answer:/);
  assert.match(page,/Correct:/);
});

test("Listening answer key stays server-side until submission",()=>{
  const api=read("app/api/challenge-listening/route.ts");
  assert.match(api,/const \{answer_key:_a,pair_groups:_p,\.\.\.safe\}=payload\|\|\{\}/);
  assert.match(api,/safePayload\(content\.payload\)/);
  assert.match(api,/grade\(content\.payload/);
  assert.doesNotMatch(read("app/day/[day]/listening/page.tsx"),/answer_key/);
});

test("Listening persists in-progress answers and resumes one-time audio from server start time",()=>{
  const api=read("app/api/challenge-listening/route.ts");
  const page=read("app/day/[day]/listening/page.tsx");
  assert.match(api,/action==="save"/);
  assert.match(api,/ark60_listening_attempts/);
  assert.match(page,/queueSave/);
  assert.match(page,/Date\.now\(\)-Date\.parse\(startedAt\)/);
  assert.match(page,/audio\.currentTime=offset/);
  assert.match(page,/Audio playback needs your permission/);
  assert.doesNotMatch(page,/controls/);
});

test("Listening completion is preview-safe and awards through the existing submission trigger",()=>{
  const api=read("app/api/challenge-listening/route.ts");
  assert.match(api,/if\(isPreview\(student\)\)\{/);
  assert.match(api,/preview:true,result/);
  assert.match(api,/ark60_submissions/);
  assert.match(api,/module:MODULE/);
  assert.match(api,/review_status:"reviewed"/);
  assert.match(api,/onConflict:"student_id,day_number,module"/);
});

test("Listening admin results expose all answers with official correct answers",()=>{
  const admin=read("app/admin/listening/page.tsx");
  const root=read("app/admin/page.tsx");
  assert.match(root,/Listening results/);
  assert.match(root,/\/admin\/listening/);
  assert.match(admin,/selected\.review\.map/);
  assert.match(admin,/Your answer:/);
  assert.match(admin,/Correct:/);
  assert.match(admin,/Band/);
  assert.match(admin,/Section \{i\+1\}/);
});

test("Day 1 and Dashboard route Listening into the real challenge module",()=>{
  const day=read("app/day/[day]/page.tsx");
  const dashboard=read("app/dashboard/page.tsx");
  assert.match(day,/challenge-listening\?action=availability/);
  assert.match(day,/name==="Listening"&&publishedListening&&day===1/);
  assert.match(day,/name==="Listening"\?"\/day\/"\+day\+"\/listening"/);
  assert.match(dashboard,/if\(name==="Listening"\)return "\/day\/"\+day\+"\/listening"/);
});

test("Listening grading supports either-order pairs and official alternatives",()=>{
  const api=read("app/api/challenge-listening/route.ts");
  assert.match(api,/usedByGroup/);
  assert.match(api,/!used\.has\(given\)/);
  assert.match(api,/bandFor\(score\)/);
  assert.match(api,/partScores=\[1,11,21,31\]/);
});


test("Listening restores readable exam typography and boxed gap-fill fields",()=>{
  const css=read("app/day/[day]/listening/listening.css");
  assert.match(css,/\.ls-question-paper\{padding:26px 30px 48px;font-size:16px;line-height:1\.5\}/);
  assert.match(css,/\.ls-source-table\{font-size:15\.5px/);
  assert.match(css,/\.ls-mcq h3\{font-size:16\.5px/);
  assert.match(css,/\.ls-option span,\.ls-check span\{font-size:15\.8px/);
  assert.match(css,/\.ls-gap-wrap input\{[\s\S]*width:155px;[\s\S]*height:34px;[\s\S]*border:1px solid #aeb8c6;[\s\S]*font-size:15\.5px/);
  assert.match(css,/\.ls-number-groups button\{[\s\S]*height:28px;[\s\S]*min-width:21px;[\s\S]*font-size:11px/);
});

test("Listening uses the same native highlight engine as the working Reading test",()=>{
  const reading=read("app/day/[day]/reading/page.tsx");
  const page=read("app/day/[day]/listening/page.tsx");
  const css=read("app/day/[day]/listening/listening.css");
  assert.match(reading,/window\.CSS\?\.highlights/);
  assert.match(reading,/new Highlight\(/);
  assert.match(page,/window\.CSS\?\.highlights/);
  assert.match(page,/new Highlight\(/);
  assert.match(page,/highlights\.set\(key/);
  assert.match(page,/range\.cloneRange\(\)/);
  assert.match(page,/onMouseUp=\{showHighlightMenu\}/);
  assert.match(page,/onTouchEnd=\{\(\)=>setTimeout\(showHighlightMenu,100\)\}/);
  assert.match(page,/\.ls-qnum,input,textarea,select,button,\.ls-bottom-nav,\.ls-topbar/);
  assert.match(css,/::highlight\(ark-listening-yellow\)\{[\s\S]*background:#ffe58a;[\s\S]*color:inherit;/);
});


test("Listening uses stronger paper and bottom navigation contrast",()=>{
  const css=read("app/day/[day]/listening/listening.css");
  assert.match(css,/\.ls-shell\{background:#eef2f6\}/);
  assert.match(css,/\.ls-question-paper\{background:#fffdf9/);
  assert.match(css,/\.ls-source-table th\{background:#f1f4f7\}/);
  assert.match(css,/\.ls-number-groups>div\{[\s\S]*background:#f1f4f8;[\s\S]*border-color:#d4dce5/);
  assert.match(css,/\.ls-number-groups button\{[\s\S]*background:#e9eef3;[\s\S]*color:#2c4055;[\s\S]*border:1px solid #d3dce5/);
  assert.match(css,/\.ls-number-groups button\.current\{[\s\S]*background:#173b61;[\s\S]*color:#fff/);
});


test("Listening active paper is pinned to the left without the old centered gutter",()=>{
  const page=read("app/day/[day]/listening/page.tsx");
  const css=read("app/day/[day]/listening/listening.css");
  assert.match(page,/paperRef=useRef<HTMLElement\|null>/);
  assert.doesNotMatch(page,/highlightRects/);
  assert.doesNotMatch(page,/ls-highlight-layer/);
  assert.match(css,/\.ls-workspace\{[\s\S]*width:100%;[\s\S]*max-width:none;[\s\S]*margin:10px 0 105px;[\s\S]*padding:0 14px/);
  assert.match(css,/\.ls-question-paper\{[\s\S]*width:100%;[\s\S]*box-sizing:border-box/);
});


test("future challenge days require all earlier published days to be complete",()=>{
  const auth=read("lib/ark60-content-auth.ts");
  const backend=read("api/ark60.py");
  assert.match(auth,/export async function isDayUnlocked/);
  assert.match(auth,/rpc\/ark60_student_dashboard_summary/);
  assert.match(auth,/required_by_day/);
  assert.match(auth,/completed/);
  assert.match(backend,/def day_unlocked_for_user\(/);
  assert.match(backend,/rpc\/ark60_student_dashboard_summary/);
  assert.match(backend,/day_unlocked_for_user\(user,day\)/);
});

test("all student challenge modules enforce the sequential day lock on the server",()=>{
  for(const path of [
    "app/api/challenge-reading/route.ts",
    "app/api/challenge-listening/route.ts",
    "app/api/challenge-article/route.ts",
    "app/api/challenge-vocab/route.ts",
    "app/api/challenge-speaking/route.ts",
    "app/api/challenge-writing/route.js",
  ]){
    const source=read(path);
    assert.match(source,/isDayUnlocked/);
    assert.match(source,/await isDayUnlocked\(/);
  }
});

test("dashboard and day page show later days locked until previous published work is complete",()=>{
  const dashboard=read("app/dashboard/page.tsx");
  const day=read("app/day/[day]/page.tsx");
  assert.match(dashboard,/function progressUnlocked\(/);
  assert.match(dashboard,/progressUnlocked\(d\.n,stats/);
  assert.match(day,/progressUnlocked/);
  assert.match(day,/action=me/);
});


test("Reading keeps the 20-minute passage timer manual while active study time starts on open",()=>{
  const page=read("app/day/[day]/reading/page.tsx");
  const openBlock=page.slice(page.indexOf("async function openPassage"),page.indexOf("async function submit",page.indexOf("async function openPassage")));
  assert.doesNotMatch(openBlock,/action:"start"/);
  assert.match(page,/async function setRunning/);
  assert.match(page,/StudyTimeHeartbeat day=\{day\} module="reading"/);
});

test("Reading submit remains safe for students already using an old tab without a timer row",()=>{
  const api=read("app/api/challenge-reading/route.ts");
  const submitBlock=api.slice(api.indexOf('if(b.action!=="submit")'),api.indexOf("// Freeze the server clock",api.indexOf('if(b.action!=="submit")')));
  assert.match(submitBlock,/resolution=ignore-duplicates/);
  assert.doesNotMatch(submitBlock,/Start the passage before submitting/);
});


test("Listening gap-fill inputs keep focus while typing",()=>{
  const page=read("app/day/[day]/listening/page.tsx");
  assert.doesNotMatch(page,/function Gap\(\{q\}:\{q:number\}\)/);
  assert.match(page,/function renderGap\(q:number\)/);
  assert.match(page,/renderGap\(Number\(t\.q\)\)/);
});
