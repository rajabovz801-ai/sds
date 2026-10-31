import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const mock=readFileSync(new URL("../app/day/[day]/mock/page.tsx",import.meta.url),"utf8");
test("Day 32 choose-two 21–22 prints original question stem above options",()=>{
 assert.match(mock,/group\[0\]\.answer_group\?<div className="cr-options">\{day===32&&group\[0\]\.number===21&&<p/);
 assert.match(mock,/mock-reading-day32-choose-two-stem/);
 assert.match(mock,/\{group\[0\]\.text\}<\/p>/);
 assert.match(mock,/\(group\[0\]\.options\|\|\[\]\)\.map/);
});
