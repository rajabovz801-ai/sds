import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const api=fs.readFileSync("app/api/challenge-mock/route.ts","utf8");
const page=fs.readFileSync("app/day/[day]/mock/page.tsx","utf8");
const day=fs.readFileSync("app/day/[day]/page.tsx","utf8");
const dashboard=fs.readFileSync("app/dashboard/page.tsx","utf8");
const runtime=fs.readFileSync("supabase/migrations/20261004_full_mock_runtime.sql","utf8");

test("Full Mock enforces Listening → Reading → Writing → completed",()=>{
 assert.ok(api.includes('stage:"reading"'));
 assert.ok(api.includes('stage:"writing"'));
 assert.ok(api.includes('stage:"completed"'));
 assert.ok(page.includes('Listening → Reading → Writing'));
 assert.ok(page.includes('Submit Listening'));
 assert.ok(page.includes('Submit Reading'));
 assert.ok(page.includes('Submit Writing'));
});

test("Reading and Writing use one 60 minute countdown each",()=>{
 assert.ok(api.includes("reading_remaining:3600"));
 assert.ok(api.includes("writing_remaining:3600"));
 assert.ok(page.includes("useState(3600)"));
 assert.ok(page.includes("reading_remaining||3600"));
 assert.ok(page.includes("writing_remaining||3600"));
 assert.ok(page.includes("60 minutes total"));
});

test("Section results remain hidden until final mock result",()=>{
 assert.ok(api.includes("hidden_result:graded"));
 assert.ok(page.includes("setPreviewListening(obj.hidden_result)"));
 assert.ok(page.includes("setPreviewReading(obj.hidden_result)"));
 assert.ok(page.includes("Section scores stay hidden until the Writing assessment is finished."));
 assert.ok(page.includes("FULL MOCK RESULT"));
});

test("Writing grading uses server-only OpenAI configuration and no client API key",()=>{
 assert.ok(api.includes("process.env.OPENAI_API_KEY"));
 assert.ok(api.includes('process.env.OPENAI_WRITING_MODEL||"gpt-5-mini"'));
 assert.ok(api.includes("https://api.openai.com/v1/responses"));
 assert.ok(!page.includes("OPENAI_API_KEY"));
});

test("4 Oct is gated at 10:00 Tashkent and teacher preview bypass remains",()=>{
 assert.ok(api.includes("Date.UTC(2026,9,4,5,0,0)"));
 assert.ok(dashboard.includes("day===4&&now<Date.UTC(2026,9,4,5,0,0)"));
 assert.ok(day.includes("day===4&&now<Date.UTC(2026,9,4,5,0,0)"));
 assert.ok(api.includes("isPreview(student)"));
});

test("Full Mock runtime stores partial work and three section scores",()=>{
 for(const field of ["listening_answers","listening_score","reading_answers","reading_score","writing_task1","writing_task2","writing_band","writing_assessment"])assert.ok(runtime.includes(field),field);
 assert.ok(runtime.includes("unique(student_id,day_number)"));
});

test("All Sunday mock cards use one sequenced route and Speaking stays absent",()=>{
 assert.ok(dashboard.includes('if(DAYS[day-1]?.mock)return "/day/"+day+"/mock"'));
 assert.ok(day.includes('const href=sunday?"/day/"+day+"/mock"'));
 const mockStart=dashboard.indexOf("const mockModules");
 const mockEnd=dashboard.indexOf("];",mockStart);
 assert.ok(!dashboard.slice(mockStart,mockEnd).includes('name:"Speaking"'));
});
