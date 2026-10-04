import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page=fs.readFileSync("app/admin/mock/page.tsx","utf8");
const admin=fs.readFileSync("app/admin/page.tsx","utf8");
const api=fs.readFileSync("app/api/challenge-mock/route.ts","utf8");

test("admin Full Mock results show section scores as they arrive",()=>{
 for(const s of ["Listening /40","L Band","Reading /40","R Band","Writing","Mock Overall","Status"])assert.ok(page.includes(s),s);
 assert.ok(page.includes('r.listening_score!=null'));
 assert.ok(page.includes('r.reading_score!=null'));
 assert.ok(page.includes('r.writing_band!=null'));
});

test("admin Full Mock page refreshes live without exposing scores to student UI",()=>{
 assert.ok(page.includes("setInterval"));
 assert.ok(page.includes("5000"));
 assert.ok(page.includes("/api/challenge-mock?action=admin_list"));
 assert.ok(api.includes('result:row.stage==="completed"'));
});

test("admin navigation links to Full Mock results",()=>{
 assert.ok(admin.includes('name:"Full Mock results"'));
 assert.ok(admin.includes('window.location.assign("/admin/mock")'));
});

test("Writing detail exposes Task 1, Task 2 and AI criteria to admin",()=>{
 assert.ok(page.includes("writing_task1"));
 assert.ok(page.includes("writing_task2"));
 assert.ok(page.includes("task_achievement"));
 assert.ok(page.includes("task_response"));
 assert.ok(page.includes("coherence_cohesion"));
 assert.ok(page.includes("lexical_resource"));
 assert.ok(page.includes("grammar"));
});
