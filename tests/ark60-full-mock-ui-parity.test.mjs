import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page=fs.readFileSync("app/day/[day]/mock/page.tsx","utf8");
const worksheet=fs.readFileSync("app/day/[day]/reading/worksheet.css","utf8");
const css=fs.readFileSync("app/day/[day]/mock/mock.css","utf8");

test("Full Mock Listening uses the shared Part 1-4 question navigator",()=>{
 assert.ok(page.includes("<ListeningPartNavigation"));
 assert.ok(page.includes("onQuestion={goLQuestion}"));
 assert.ok(page.includes("lCurrentQuestion"));
 assert.ok(page.includes("goLQuestion"));
 assert.ok(!page.includes("mock-l-sections"));
});

test("Full Mock Reading uses daily CDI structure and Part 1-3 bottom navigation",()=>{
 for(const cls of ['className="cr-instructions"','className="cr-mobile-tabs"','className="cr-split"','className="cr-pane cr-passage"','className="cr-pane cr-questions"','className="cr-footer mock-reading-footer"'])assert.ok(page.includes(cls),cls);
 assert.ok(page.includes('label="Reading parts" parts={[1,2,3]}'));
 assert.ok(worksheet.includes("Times New Roman"));
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
 assert.ok(worksheet.includes('font:400 17px/1.6 "Times New Roman",Times,serif!important'));
 assert.ok(!css.includes('.mock-reading-shell .cr-passage{'));
 assert.ok(worksheet.includes("font:500 16px/1.52"));
 assert.ok(worksheet.includes(".cr-inline-gap"));
 assert.ok(css.includes(".mock-part-nav button.active{background:#142740"));
});
