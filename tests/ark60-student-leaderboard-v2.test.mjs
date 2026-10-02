import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=(path)=>fs.readFileSync(new URL("../"+path,import.meta.url),"utf8");

function leaderboardBlock(){
  const source=read("app/components/challenge-hub-panels.tsx");
  return source.slice(source.indexOf("export function LeaderboardPanel"),source.indexOf("export function ProgressPanel"));
}

test("student leaderboard uses real week, 30-day, and all-time periods",()=>{
  const panel=leaderboardBlock();
  const backend=read("api/ark60.py");
  assert.match(panel,/This week/);
  assert.match(panel,/Last 30 days/);
  assert.match(panel,/All time/);
  assert.match(panel,/action=leaderboard&period=/);
  assert.match(backend,/period not in \{"week","30d","all"\}/);
  assert.match(backend,/local_today-timedelta\(days=local_today\.weekday\(\)\)/);
  assert.match(backend,/local_today-timedelta\(days=29\)/);
});

test("student leaderboard ranks coins first and study time only breaks ties",()=>{
  const panel=leaderboardBlock();
  const migration=read("supabase/migrations/20261002_student_leaderboard_period.sql");
  assert.match(panel,/b\.coins-a\.coins\|\|b\.active_seconds-a\.active_seconds/);
  assert.match(migration,/coalesce\(c\.coins,0\) desc,[\s\S]*coalesce\(t\.active_seconds,0\) desc/);
});

test("student leaderboard shows presence but never sorts by presence",()=>{
  const panel=leaderboardBlock();
  const backend=read("api/ark60.py");
  assert.match(panel,/Online/);
  assert.match(panel,/Idle/);
  assert.match(panel,/Offline/);
  assert.match(backend,/ark60_presence/);
  assert.match(backend,/item\["status"\]=status/);
  const sortLine=panel.match(/sort\(\(a,b\)=>[^\n]+/)?.[0]||"";
  assert.doesNotMatch(sortLine,/status|online|idle|offline/);
});

test("student leaderboard removes Tasks and uses podium plus compact table",()=>{
  const panel=leaderboardBlock();
  assert.doesNotMatch(panel,/TASKS|Tasks|completed_tasks|practice/i);
  assert.match(panel,/lb-podium/);
  assert.match(panel,/lb-table-wrap/);
  assert.match(panel,/#\{current\.rank\}/);
});

test("period aggregation uses coin event dates and study dates without changing award logic",()=>{
  const migration=read("supabase/migrations/20261002_student_leaderboard_period.sql");
  const backend=read("api/ark60.py");
  assert.match(migration,/ark60_coin_events/);
  assert.match(migration,/e\.created_at >=/);
  assert.match(migration,/ark60_study_sessions/);
  assert.match(migration,/ss\.study_date >= p_start/);
  assert.match(backend,/rpc\/ark60_student_leaderboard_period/);
  assert.match(backend,/action=="claim_daily_reward"/);
  assert.match(backend,/rpc\/ark60_claim_daily_reward/);
});
