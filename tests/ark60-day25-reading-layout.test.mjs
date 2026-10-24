import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=path=>fs.readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Day 25 only has justified Reading paragraphs; regular Reading and older mocks are unchanged",()=>{
 const page=read("app/day/[day]/mock/page.tsx");
 const css=read("app/day/[day]/mock/mock.css");
 assert.match(page,/day===25\?" mock-reading-day25":""/);
 assert.match(css,/\.mock-reading-shell\.mock-reading-day25\.cr-shell:not\(\.cr-overview\) \.cr-passage p\s*\{\s*text-align:\s*justify;/);
 assert.match(css,/text-align-last:\s*start;/);
 assert.match(css,/white-space:\s*normal;/);
});

test("Day 25 mobile mock preserves separate scrolling panes above the footer",()=>{
 const css=read("app/day/[day]/mock/mock.css");
 assert.match(css,/@media \(max-width: 800px\)\s*\{[\s\S]*?\.mock-reading-shell\.mock-reading-day25\.cr-shell:not\(\.cr-overview\) \.cr-split/);
 assert.match(css,/height:\s*calc\(100dvh - 56px - 73px - 40px - 60px\) !important/);
 assert.match(css,/\.mock-reading-shell\.mock-reading-day25\.cr-shell:not\(\.cr-overview\) \.cr-pane\s*\{[^}]*overflow-y:\s*auto/);
});
