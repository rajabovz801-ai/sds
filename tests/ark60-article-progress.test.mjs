import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeArticleSections,normalizeArticleProgress,articleParagraphs} from '../lib/ark60-article.ts';
const sections=Array.from({length:5},(_,i)=>({page:45+i,heading:'Heading',paragraphs:['Text.'],callouts:[]}));
test('book page numbers become contiguous reader positions without losing source information',()=>{
 const normalized=normalizeArticleSections(sections);assert.deepEqual(normalized.map(x=>x.page),[1,2,3,4,5]);assert.deepEqual(normalized.map(x=>x.source_page),[45,46,47,48,49]);assert.equal(sections[0].page,45);
});
test('existing article completion and legacy book-page progress survive normalization',()=>{
 const p=normalizeArticleProgress({last_page:46,visited_pages:[45,46,46,99],completed_at:'2026-10-01'},sections);
 assert.deepEqual(p.visited_pages,[1,2]);assert.equal(p.last_page,2);assert.equal(p.completed_at,'2026-10-01');
 assert.deepEqual(normalizeArticleProgress({last_page:2,visited_pages:[1,2]},sections).visited_pages,[1,2]);
 assert.equal(normalizeArticleProgress({last_page:99},sections).last_page,1);
});
test('long source paragraphs are split at sentence boundaries with every word preserved',()=>{
 const paragraph=Array.from({length:28},(_,i)=>`Dr. Smith studies sleep in the U.S. and explains finding number ${i}.`).join(' ');
 const result=articleParagraphs(paragraph);assert.ok(result.length>1);assert.equal(result.join(' ').replace(/\s+/g,' '),paragraph.replace(/\s+/g,' '));assert.ok(result.every(p=>/[.!?]$/.test(p)));
 assert.deepEqual(articleParagraphs('A short original paragraph.'),['A short original paragraph.']);
});
