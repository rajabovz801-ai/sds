import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=(path)=>fs.readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("presence is isolated from study time",()=>{
  const backend=read("api/ark60.py");
  const component=read("app/components/student-presence.tsx");
  assert.match(backend,/action=="presence"/);
  const block=backend.slice(backend.indexOf('if action=="presence":'),backend.indexOf('if action=="heartbeat":'));
  assert.match(block,/ark60_presence/);
  assert.doesNotMatch(block,/active_seconds|ark60_study_sessions/);
  assert.match(component,/25000/);
});

test("admin overview uses live activity and no visible Content manager",()=>{
  const admin=read("app/admin/page.tsx");
  assert.match(admin,/admin_live_activity/);
  assert.match(admin,/Live Student Activity/);
  const sections=admin.slice(admin.indexOf("const sections"),admin.indexOf("const chosen"));
  assert.doesNotMatch(sections,/Content manager/);
  assert.match(admin,/pending_writing/);
  assert.match(admin,/pending_speaking/);
});

test("Listening admin and student route are day-aware for published Listening days",()=>{
  const admin=read("app/admin/listening/page.tsx");
  const api=read("app/api/challenge-listening/route.ts");
  assert.match(admin,/selectedDay/);
  assert.doesNotMatch(admin,/admin_list&day=1/);
  assert.match(api,/available_days/);
  assert.doesNotMatch(api,/if\(day!==DAY/);
});

test("Writing admin separates active Writing time from task timer",()=>{
  const api=read("app/api/challenge-writing/route.js");
  const admin=read("app/admin/writing/page.tsx");
  assert.match(api,/active_writing_seconds/);
  assert.match(api,/ark60_study_sessions/);
  assert.match(api,/ark60_writing_visits/);
  assert.match(api,/writing_visits/);
  assert.match(admin,/Active Writing Time/);
  assert.match(admin,/Task Timer Used/);
});

test("Speaking inbox keeps cleanup and filters expired rows",()=>{
  const api=read("app/api/challenge-speaking/route.ts");
  const cleanup=read("supabase/functions/ark60-speaking-cleanup/index.ts");
  assert.match(api,/expires_at/);
  assert.match(api,/\.gt\("expires_at"/);
  assert.match(cleanup,/audio_expired:true/);
  assert.match(cleanup,/BUCKET="ark60-speaking-audio"/);
});
