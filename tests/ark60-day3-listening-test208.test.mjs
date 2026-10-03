import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const path=new URL("../supabase/migrations/20261003_day3_listening_test208.sql",import.meta.url);
const sql=fs.readFileSync(path,"utf8");
const a=sql.indexOf("$json$")+6;
const b=sql.lastIndexOf("$json$");
const payload=JSON.parse(sql.slice(a,b));

test("Day 3 Listening publishes TEST 208 with supplied MP3",()=>{
  assert.match(sql,/values\(3,'listening','IELTS Listening Test 208','published'/);
  assert.equal(payload.test_code,"TEST-208");
  assert.equal(payload.audio_url,"https://ia903208.us.archive.org/0/items/test-208-100-percent-mp-3/TEST_208_100_PERCENT_MP3.mp3");
  assert.equal(payload.sections.length,4);
  assert.equal(payload.total_questions,40);
});

test("TEST 208 has all 40 official answer slots and alternatives",()=>{
  assert.equal(Object.keys(payload.answer_key).length,40);
  assert.deepEqual(payload.answer_key["1"],["Northern"]);
  assert.ok(payload.answer_key["3"].includes("250"));
  assert.deepEqual(payload.answer_key["15"],["B"]);
  assert.deepEqual(payload.answer_key["30"],["D"]);
  assert.deepEqual(payload.answer_key["33"],["holiday","holidays"]);
  assert.deepEqual(payload.answer_key["38"],["behaviour","behavior"]);
  assert.deepEqual(payload.answer_key["40"],["photograph"]);
});

test("TEST 208 either-order groups match the official key",()=>{
  assert.deepEqual(payload.pair_groups["11-12"].correct,["C","E"]);
  assert.deepEqual(payload.pair_groups["13-14"].correct,["B","E"]);
  assert.deepEqual(payload.pair_groups["21-22"].correct,["B","D"]);
  assert.deepEqual(payload.pair_groups["23-24"].correct,["D","E"]);
});

test("TEST 208 only uses Listening block types supported by the existing renderer",()=>{
  const kinds=payload.sections.flatMap(section=>section.blocks.map(block=>block.kind));
  for(const kind of kinds) assert.ok(["notes","choose_two","mcq","matching","notes_groups"].includes(kind),kind);
});
