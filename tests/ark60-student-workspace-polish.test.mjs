import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=(path)=>fs.readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("student workspace applies page-specific layout scopes without changing navigation",()=>{
  const page=read("app/dashboard/page.tsx");
  assert.match(page,/workspace-"\+view\.toLowerCase\(\)\.replaceAll\(" ","-"\)/);
  for(const name of ["Dashboard","60-Day Plan","Progress","Leaderboard"]){
    assert.ok(page.includes('name:"'+name+'"'));
  }
});

test("student workspace polish is scoped to the four requested pages",()=>{
  const css=read("app/globals.css");
  assert.match(css,/\.workspace-dashboard\{max-width:1350px/);
  assert.match(css,/\.workspace-60-day-plan\{max-width:1450px/);
  assert.match(css,/\.workspace-progress\{max-width:1150px/);
  assert.match(css,/\.workspace-leaderboard\{max-width:1100px/);
  assert.match(css,/Student workspace polish — visual only/);
});

test("Progress keeps tasks and study-time data while using the compact report class",()=>{
  const panels=read("app/components/challenge-hub-panels.tsx");
  const block=panels.slice(panels.indexOf("export function ProgressPanel"),panels.indexOf("export function ProfilePanel"));
  assert.match(block,/progress-v2/);
  assert.match(block,/Completed tasks/);
  assert.match(block,/Total study time/);
  assert.match(block,/Reading/);
  assert.match(block,/Speaking/);
});

test("Leaderboard uses one board container and keeps real ranking semantics",()=>{
  const panels=read("app/components/challenge-hub-panels.tsx");
  const block=panels.slice(panels.indexOf("export function LeaderboardPanel"),panels.indexOf("export function ProgressPanel"));
  assert.match(block,/lb-board/);
  assert.match(block,/This week/);
  assert.match(block,/Last 30 days/);
  assert.match(block,/All time/);
  assert.match(block,/b\.coins-a\.coins\|\|b\.active_seconds-a\.active_seconds/);
  assert.doesNotMatch(block,/completed_tasks|Tasks|practice count/i);
  const sortLine=block.match(/sort\(\(a,b\)=>[^\n]+/)?.[0]||"";
  assert.doesNotMatch(sortLine,/status|online|idle|offline/);
});

test("Leaderboard live strip reuses existing presence status only",()=>{
  const panels=read("app/components/challenge-hub-panels.tsx");
  const block=panels.slice(panels.indexOf("export function LeaderboardPanel"),panels.indexOf("export function ProgressPanel"));
  assert.match(block,/row\.status==="online"/);
  assert.match(block,/online now/);
  assert.doesNotMatch(block,/new WebSocket|EventSource|presence heartbeat/i);
});
