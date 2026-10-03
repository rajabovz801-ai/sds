import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration=fs.readFileSync("supabase/migrations/20261004_oct4_full_mock_materials.sql","utf8");
const listeningApi=fs.readFileSync("app/api/challenge-listening/route.ts","utf8");
const listeningPage=fs.readFileSync("app/day/[day]/listening/page.tsx","utf8");
const auth=fs.readFileSync("lib/ark60-content-auth.ts","utf8");
const dashboard=fs.readFileSync("app/dashboard/page.tsx","utf8");
const dayPage=fs.readFileSync("app/day/[day]/page.tsx","utf8");

test("4 Oct mock stages the supplied Listening material and alternatives",()=>{
 assert.match(migration,/Full Mock · Listening · Volume 10 Test 2/);
 assert.match(migration,/Volume_10_Test_2_Listening\.mp3/);
 assert.match(migration,/"total_questions":40/);
 assert.match(migration,/"28-30":\{"questions":\[28,29,30\],"correct":\["A","C","F"\]\}/);
 for(const alternative of ["eight","at the next seminar","26th of November","chemistry laboratory","the professor"])assert.ok(migration.includes(alternative),alternative);
 assert.match(migration,/volume10-test2-store-plan\.svg/);
});

test("4 Oct mock stages three supplied Reading passages with 40 questions",()=>{
 assert.equal((migration.match(/insert into public\.ark60_reading_passages/g)||[]).length,3);
 for(const title of ["A Brief History of Glassmaking","The return of the black-footed ferret","Rights for apes"])assert.ok(migration.includes(title),title);
 for(const answer of ["shiny surface","Siberian polecat","NOT GIVEN","mosaic glass"])assert.ok(migration.includes(answer),answer);
 assert.match(migration,/values\(4,1,/);
 assert.match(migration,/values\(4,2,/);
 assert.match(migration,/values\(4,3,/);
});

test("4 Oct mock stages both Writing tasks under one 60 minute payload",()=>{
 assert.match(migration,/Full Mock · Writing Task 1 \+ Task 2/);
 assert.match(migration,/"mock":true,"duration_seconds":3600/);
 assert.match(migration,/marriage trends and the ages at which people got married in Australia between 1960 and 2000/);
 assert.match(migration,/governments in other nations provide financial support for these costs/);
 assert.match(migration,/"recommended_seconds":1200/);
 assert.match(migration,/"recommended_seconds":2400/);
});

test("Listening renderer and server accept three-answer source questions without changing grading groups",()=>{
 assert.ok(listeningApi.includes('block.kind==="choose_two"||block.kind==="choose_many"'));
 assert.ok(listeningPage.includes('block.kind==="choose_two"||block.kind==="choose_many"'));
 assert.ok(listeningPage.includes("Number(block.max_selections||2)"));
});

test("4 Oct direct routes stay locked before 10:00 Tashkent except Rustam preview",()=>{
 assert.ok(auth.includes("if(isPreview(user))return true"));
 assert.ok(auth.includes("n===4&&Date.now()<Date.UTC(2026,9,4,5,0,0)"));
});

test("Full Mock student plan is LRW only",()=>{
 const mockStart=dashboard.indexOf("const mockModules");
 const mockEnd=dashboard.indexOf("];",mockStart);
 const mockBlock=dashboard.slice(mockStart,mockEnd);
 assert.ok(mockBlock.includes('name:"Listening"'));
 assert.ok(mockBlock.includes('name:"Reading"'));
 assert.ok(mockBlock.includes('name:"Writing"'));
 assert.ok(!mockBlock.includes('name:"Speaking"'));
 assert.ok(dayPage.includes("Three exam sections on your scheduled mock day."));
 assert.ok(dayPage.includes('sunday?[regular[1],regular[0],regular[4]]:regular'));
});
