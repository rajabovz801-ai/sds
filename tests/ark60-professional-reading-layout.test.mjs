import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read=(path)=>fs.readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Article presents all sections as one scrollable reading flow",()=>{
  const page=read("app/day/[day]/article/page.tsx");
  assert.match(page,/pages\.map\(\(section,i\)=>/);
  assert.match(page,/data-article-section=\{section\.page\}/);
  assert.match(page,/new IntersectionObserver/);
  assert.match(page,/action:"page",day,page:/);
  assert.doesNotMatch(page,/<nav className="aa-pages"/);
  assert.doesNotMatch(page,/Next page|Previous/);
});

test("Speaking and Listening intro cards share a centered, responsive frame",()=>{
  const speaking=read("app/day/[day]/speaking/speaking.css");
  const listening=read("app/day/[day]/listening/listening.css");
  assert.match(speaking,/\.sp-content--intro/);
  assert.match(speaking,/\.sp-intro\{[^}]*margin:0 auto/s);
  assert.match(listening,/\.ls-shell--intro/);
  assert.match(listening,/\.ls-start-card\{[^}]*margin:auto/s);
});
