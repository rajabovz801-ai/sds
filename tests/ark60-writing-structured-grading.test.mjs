import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api=fs.readFileSync("app/api/challenge-mock/route.ts","utf8");
const page=fs.readFileSync("app/day/[day]/mock/page.tsx","utf8");

test("Writing grader uses Responses Structured Outputs",()=>{
 assert.ok(api.includes('type:"json_schema"'));
 assert.ok(api.includes('name:"ielts_writing_assessment"'));
 assert.ok(api.includes('strict:true'));
 assert.ok(api.includes('schema:WRITING_SCHEMA'));
 assert.ok(api.includes('responseOutputText'));
});

test("failed Writing assessments self-heal without losing saved essays",()=>{
 assert.ok(api.includes("retryFailedAssessments"));
 assert.ok(api.includes('eq("stage","assessing")'));
 assert.ok(api.includes('writing_task1'));
 assert.ok(api.includes('writing_task2'));
 assert.ok(api.includes('completeWriting'));
});

test("admin polling retries failed assessments in small batches",()=>{
 assert.ok(api.includes('action==="admin_list"'));
 assert.ok(api.includes("retryFailedAssessments(src,day,2)"));
});

test("student assessing screen polls until result is completed",()=>{
 assert.ok(page.includes('if(stage!=="assessing")return'));
 assert.ok(page.includes('window.setInterval(check,5000)'));
 assert.ok(page.includes('obj?.mock?.stage==="completed"'));
});
