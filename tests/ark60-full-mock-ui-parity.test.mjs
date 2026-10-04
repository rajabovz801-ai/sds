import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page=fs.readFileSync("app/day/[day]/mock/page.tsx","utf8");
const css=fs.readFileSync("app/day/[day]/mock/mock.css","utf8");

test("Full Mock Listening keeps the accepted Section 1-4 question navigator",()=>{
 assert.ok(page.includes('className="ls-number-groups"'));
 assert.ok(page.includes("SECTION {sec}"));
 assert.ok(page.includes("lCurrentQuestion"));
 assert.ok(page.includes("goLQuestion"));
 assert.ok(!page.includes("mock-l-sections"));
});

test("Full Mock Reading uses daily CDI structure and Part 1-3 bottom navigation",()=>{
 for(const cls of ['className="cr-instructions"','className="cr-mobile-tabs"','className="cr-split"','className="cr-pane cr-passage"','className="cr-pane cr-questions"','className="cr-footer mock-reading-footer"'])assert.ok(page.includes(cls),cls);
 assert.ok(page.includes("PART {part}"));
 assert.ok(page.includes("Times New Roman"));
});

test("Full Mock Reading highlight uses non-reflow native Highlight API",()=>{
 assert.ok(page.includes('new Highlight('));
 assert.ok(page.includes('ark-mock-yellow'));
 assert.ok(page.includes('applyHighlight("erase")'));
 assert.ok(page.includes('::highlight(ark-mock-yellow){background:#ffe58a'));
});

test("Full Mock Writing keeps the daily Writing split-pane classes",()=>{
 for(const cls of ['className="writing-stage"','className="writing-task-pane"','className="writing-answer-pane"','className="writing-editor-wrap"'])assert.ok(page.includes(cls),cls);
 assert.ok(page.includes("Writing Task 1"));
 assert.ok(page.includes("Writing Task 2"));
 assert.ok(css.includes(".mock-writing-tabs .writing-task-chip.active"));
});

test("Reading font and controls match the accepted accessible exam sizing",()=>{
 assert.ok(css.includes('font:16px/1.88 "Times New Roman",Times,serif'));
 assert.ok(css.includes(".cr-question-head span{padding-top:2px;font-size:16px"));
 assert.ok(css.includes(".cr-gap{display:block"));
 assert.ok(css.includes(".mock-part-nav button.active{background:#142740"));
});
