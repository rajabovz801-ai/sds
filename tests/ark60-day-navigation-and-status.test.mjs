import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {readingPassageForDay} from "../lib/ark60-reading-plan.ts";

const read=(path)=>fs.readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("day plan and Reading picker use one shared passage schedule",()=>{
  const plan=read("lib/ark60-reading-plan.ts");
  const day=read("app/day/[day]/page.tsx");
  const reading=read("app/day/[day]/reading/page.tsx");
  let regularIndex=0;
  for(let n=1;n<=60;n++){
    const sunday=new Date(Date.UTC(2026,9,n)).getUTCDay()===0;
    assert.equal(readingPassageForDay(n),sunday?null:(regularIndex++%3)+1);
  }
  for(const n of [0,61,1.5,NaN])assert.equal(readingPassageForDay(n),null);
  assert.match(day,/readingPassageForDay\(day\)/);
  assert.match(reading,/readingPassageForDay\(day\)/);
  assert.doesNotMatch(day,/P2_DAYS|P3_DAYS/);
  assert.doesNotMatch(reading,/P2_DAYS|P3_DAYS/);
});

test("day page gives mobile users navigation when the desktop sidebar is hidden",()=>{
  const page=read("app/day/[day]/page.tsx");
  const css=read("app/globals.css");
  assert.match(page,/className="ch-mobile-nav"/);
  assert.match(page,/href="\/dashboard"/);
  assert.match(css,/@media\(max-width:850px\)[\s\S]*\.ch-mobile-nav\{display:flex/);
});

test("availability checks expose errors and a retry instead of silently showing locked materials",()=>{
  const page=read("app/day/[day]/page.tsx");
  assert.match(page,/if\(!response\.ok\)throw new Error/);
  assert.match(page,/setAvailability\(current=>\(\{\.\.\.current,\[key\]:"error"\}\)\)/);
  assert.match(page,/Could not check material availability/);
  assert.match(page,/setAvailabilityRetry\(value=>value\+1\)/);
  assert.match(page,/Checking material availability/);
});

test("legacy mock dashboard CSS is removed while global resets remain",()=>{
  const css=read("app/globals.css");
  assert.match(css,/\*\{box-sizing:border-box\}/);
  assert.match(css,/html,body\{margin:0/);
  assert.doesNotMatch(css,/\.auth-shell\{|\.app-shell\{|\.hero-card\{|\.module-grid\{|\.day-page\{|\.admin-kpis\{/);
});

test("Custom Highlight API rules load from a stylesheet that bypasses Next CSS parsing",()=>{
  const layout=read("app/layout.tsx");
  const css=read("public/ark-highlight-api.css");
  assert.match(layout,/\/ark-highlight-api\.css/);
  assert.match(css,/::highlight\(aa-yellow\)/);
  assert.match(css,/::highlight\(aa-green\)/);
  assert.match(css,/::highlight\(ark-listening-yellow\)/);
});

test("Reading and Writing schedules continue through the full 60-day challenge",()=>{
  const plan=read("lib/ark60-reading-plan.ts");
  const day=read("app/day/[day]/page.tsx");
  const writing=read("app/api/challenge-writing/route.js");
  assert.match(plan,/day > 60/);
  assert.match(plan,/isSunday\(day\)/);
  assert.match(plan,/regularDayIndex/);
  assert.match(day,/Array\.from\(\{length:60\}/);
  assert.match(writing,/Array\.from\(\{ length: 60 \}/);
  assert.match(writing,/getUTCDay\(\) !== 0/);
});

test("Writing card stays locked until that day's Writing material is actually published",()=>{
  const day=read("app/day/[day]/page.tsx");
  assert.match(day,/challenge-writing\?action=availability&day=/);
  assert.match(day,/setPublishedWriting/);
  assert.match(day,/name==="Writing"&&WRITING_DAYS\.has\(day\)&&publishedWriting/);
  assert.match(day,/\["Reading","Article","Vocabulary","Speaking","Listening","Writing"\]/);
});
