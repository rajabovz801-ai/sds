import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const daily=fs.readFileSync("app/day/[day]/listening/page.tsx","utf8");
const mock=fs.readFileSync("app/day/[day]/mock/page.tsx","utf8");

test("daily Listening paints native yellow highlights like Reading",()=>{
 assert.ok(daily.includes("::highlight(ark-listening-yellow){background:#ffe58a;color:inherit}"));
 assert.ok(daily.includes('new Highlight('));
 assert.ok(daily.includes('applyHighlight("yellow")'));
 assert.ok(daily.includes('applyHighlight("erase")'));
});

test("Full Mock Listening paints its native highlight while Listening is active",()=>{
 const start=mock.indexOf('if(stage==="listening")return');
 const end=mock.indexOf('if(stage==="reading")',start);
 const block=mock.slice(start,end);
 assert.ok(block.includes("::highlight(ark-mock-yellow){background:#ffe58a;color:inherit}"));
 assert.ok(block.includes('onMouseUp={showHighlight}'));
 assert.ok(block.includes('applyHighlight("yellow")'));
 assert.ok(block.includes('applyHighlight("erase")'));
});

test("Listening highlight fix does not alter answer autosave or submission flow",()=>{
 assert.ok(daily.includes('queueSave(next)'));
 assert.ok(daily.includes('action:"save"'));
 assert.ok(daily.includes('action:"submit"'));
 assert.ok(mock.includes('action:"save_listening"'));
 assert.ok(mock.includes('action:"submit_listening"'));
});
