import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=(path)=>fs.readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("dashboard resumes only a validated last challenge page saved on this device",()=>{
  const helperPath=new URL("../lib/ark60-resume.ts",import.meta.url);
  assert.ok(fs.existsSync(helperPath),"challenge resume validator exists");
  const helper=read("lib/ark60-resume.ts");
  const presence=read("app/components/student-presence.tsx");
  const dashboard=read("app/dashboard/page.tsx");
  assert.match(helper,/CHALLENGE_RESUME_STORAGE_KEY/);
  assert.match(helper,/parseChallengeResume/);
  assert.match(helper,/^export function isChallengeResumePath/m);
  assert.match(presence,/localStorage\.setItem\(CHALLENGE_RESUME_STORAGE_KEY/);
  assert.match(dashboard,/parseChallengeResume\(localStorage\.getItem\(CHALLENGE_RESUME_STORAGE_KEY\)\)/);
  assert.match(dashboard,/Continue your last lesson/);
  assert.match(dashboard,/resumeLocation\.href/);
});

test("dashboard retry fetches challenge data again without a full page reload",()=>{
  const dashboard=read("app/dashboard/page.tsx");
  assert.match(dashboard,/setRetryCount/);
  assert.match(dashboard,/onClick=\{\(\)=>setRetryCount/);
  assert.doesNotMatch(dashboard,/window\.location\.reload\(\)/);
});

test("resume card remains usable on narrow screens",()=>{
  const css=read("app/globals.css");
  assert.match(css,/\.resume-card/);
  assert.match(css,/\.resume-card__action/);
  assert.match(css,/@media\(max-width:700px\)[\s\S]*\.resume-card/);
  assert.match(css,/min-height:44px/);
});
