import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=(path)=>fs.readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Full Mock API is day-aware for every scheduled Sunday",()=>{
  const api=read("app/api/challenge-mock/route.ts");
  assert.match(api,/function validMockDay\(value:any\)/);
  assert.match(api,/getUTCDay\(\)===0/);
  assert.match(api,/source\(day\)/);
  assert.match(api,/ensureAttempt\(student\.id,day\)/);
  assert.match(api,/eq\("day_number",day\)/);
  assert.doesNotMatch(api,/const DAY=4/);
  assert.doesNotMatch(api,/const MOCK_START=/);
});

test("Full Mock page sends its route day on every mutation and uses dynamic date copy",()=>{
  const page=read("app/day/[day]/mock/page.tsx");
  assert.match(page,/action:"start",day/);
  assert.match(page,/action:"save_"\+kind,day/);
  assert.match(page,/action:"submit_listening",day/);
  assert.match(page,/action:"submit_reading",day/);
  assert.match(page,/action:"submit_writing",day/);
  assert.match(page,/mockDateText/);
  assert.doesNotMatch(page,/4 OCTOBER/);
  assert.doesNotMatch(page,/DAY 04 · IELTS FULL MOCK/);
});

test("Dashboard and direct module routes recognize recurring Sunday mocks",()=>{
  const dashboard=read("app/dashboard/page.tsx");
  const listening=read("app/api/challenge-listening/route.ts");
  const reading=read("app/api/challenge-reading/route.ts");
  const backend=read("api/ark60.py");
  assert.match(dashboard,/DAYS\[day-1\]\?\.mock/);
  assert.match(listening,/isMockDay\(day\)/);
  assert.match(reading,/isMockDay\(day\)/);
  assert.match(backend,/available=\["listening","reading","writing"\] if d\.weekday\(\)==6/);
});
