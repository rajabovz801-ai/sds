import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {adminViewFromSearch,adminViewUrl,parseReviewBand,mergeReviewDrafts} from '../lib/admin-inbox.ts';
test('admin section URLs restore all inboxes and clear stale notification ids',()=>{
 assert.equal(adminViewFromSearch('?section=writing&id=w1'),'Writing inbox');
 assert.equal(adminViewFromSearch('?section=speaking'),'Speaking inbox');
 assert.equal(adminViewFromSearch('?section=bad'),'Overview');
 assert.equal(adminViewUrl('Speaking inbox','sp/1'),'/admin?section=speaking&id=sp%2F1');
 assert.equal(adminViewUrl('Reading results'),'/admin?section=reading');
});
test('review bands reject empty, whitespace, malformed and out-of-range input; zero remains valid',()=>{
 for(const v of [undefined,'',' ','-1','9.5','6.25','NaN','abc'])assert.equal(parseReviewBand(v),null,String(v));
 for(const v of ['0','0.5','6.5','9'])assert.equal(parseReviewBand(v),Number(v));
});
test('server refresh preserves unsaved drafts but removes deleted submissions',()=>{
 assert.deepEqual(mergeReviewDrafts({a:'6',b:'7'},{a:'8',b:'5',deleted:'9'},new Set(['a','deleted'])),{a:'8',b:'7'});
});
test('all five reports share sidebar and notification routes',()=>{
 const root=fs.readFileSync('app/admin/page.tsx','utf8');
 assert.match(root,/<AdminWriting\/>/);assert.match(root,/<AdminSpeaking\/>/);
 assert.doesNotMatch(root,/window\.location\.assign\("\/admin\/(writing|speaking)"\)/);
 assert.match(root,/adminViewUrl/);assert.match(root,/popstate/);
});
test('report requests are canceled when selection changes or the report closes',()=>{
 for(const module of ['reading','listening','writing','speaking']){
  const source=fs.readFileSync(`app/admin/${module}/page.tsx`,'utf8');
  assert.match(source,/signal:controller.signal/,module+' fetch signal');
  assert.match(source,/\.abort\(\)/,module+' cleanup');
 }
 for(const module of ['listening','speaking']){
  const source=fs.readFileSync(`app/admin/${module}/page.tsx`,'utf8');
  const open=source.slice(source.indexOf(' async function open('),source.indexOf('\n }',source.indexOf(' async function open(')));
  assert.ok(open.indexOf('setSelected(null)')<open.indexOf('await fetch('),module+' clears old student before fetch');
 }
});
