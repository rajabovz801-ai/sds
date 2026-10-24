import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read=path=>fs.readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Day 25 only uses justified Reading paragraphs, leaving older mocks and daily Reading untouched",()=>{
 const page=read("app/day/[day]/mock/page.tsx");
 const css=read("app/day/[day]/mock/mock.css");
 assert.match(page,/day===25\?" mock-reading-day25":""/);
 assert.match(css,/\.mock-reading-shell\.mock-reading-day25\.cr-shell:not\(\.cr-overview\) \.cr-passage p\s*\{\s*text-align:\s*justify;/);
 assert.match(css,/text-align-last:\s*start;/);
 assert.match(css,/white-space:\s*normal;/);
});
test("Day 25 change does not override pre-existing mobile scrolling geometry",()=>{
 const css=read("app/day/[day]/mock/mock.css");
 assert.doesNotMatch(css,/\.mock-reading-shell\.mock-reading-day25[^\n]*\.cr-split/);
 assert.doesNotMatch(css,/\.mock-reading-shell\.mock-reading-day25[^\n]*\.cr-pane\s*\{/);
 assert.match(css,/\.mock-reading-shell \.cr-mobile-tabs\{display:none\}/);
});
