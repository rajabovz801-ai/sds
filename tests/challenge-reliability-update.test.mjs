import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8');
const study=await import('../lib/study-activity.ts').catch(()=>({}));
const retry=await import('../lib/transient-write.ts').catch(()=>({}));
test('cash Mock validator accepts an ISO date and rejects malformed dates',()=>{
 const source=read('app/api/admin/billing/route.ts');
 const pattern=source.match(/!\/(.*?)\/.test\(input.mock_on\)/)[1];
 const validator=new RegExp(pattern);
 assert.equal(validator.test('2026-11-01'),true);
 assert.equal(validator.test('01/11/2026'),false);
 assert.equal(validator.test('2026-1-1'),false);
});
test('selected personal mock link uses selected day rather than Day 18',()=>{
 const source=read('app/dashboard/page.tsx');
 assert.doesNotMatch(source,/personalMockEntry&&<a[^>]+href="\/day\/18\/mock"/);
 assert.match(source,/href=\{moduleHref\(chosen.n,"Listening"\)\}/);
});
test('Reading with no materials has no invented two-practice denominator',()=>{
 const source=read('app/day/[day]/reading/page.tsx');
 assert.doesNotMatch(source,/items.length\|\|2/);
 assert.match(source,/items.length>1\?/);
});
test('visible focused reading is counted beyond the old 45-second idle limit',()=>{
 assert.equal(typeof study.shouldCountStudy,'function');
 assert.equal(study.shouldCountStudy({visible:true,focused:true,lastActivity:0,now:120000,mediaPlaying:false}),true);
 assert.equal(study.shouldCountStudy({visible:true,focused:true,lastActivity:0,now:300001,mediaPlaying:false}),false);
});
test('playing media continues counting but hidden/unfocused/disabled study never counts',()=>{
 assert.equal(typeof study.shouldCountStudy,'function');
 const active={visible:true,focused:true,lastActivity:0,now:600000,mediaPlaying:true};
 assert.equal(study.shouldCountStudy(active),true);
 for(const delta of [{visible:false},{focused:false},{enabled:false}])assert.equal(study.shouldCountStudy({...active,...delta}),false);
});
test('idempotent Listening sync retries transient failures once',async()=>{
 assert.equal(typeof retry.withTransientRetry,'function');
 let calls=0;const result=await retry.withTransientRetry(async()=>{calls++;if(calls===1)throw {message:'502 Bad Gateway'};return 'saved'});
 assert.equal(result,'saved');assert.equal(calls,2);
});
test('retry is bounded and does not retry validation failures',async()=>{
 assert.equal(typeof retry.withTransientRetry,'function');
 let calls=0;await assert.rejects(retry.withTransientRetry(async()=>{calls++;throw Error('502 Bad Gateway')}));assert.equal(calls,2);
 calls=0;await assert.rejects(retry.withTransientRetry(async()=>{calls++;throw Error('invalid input')}));assert.equal(calls,1);
});
test('heartbeat is serialized per student and excludes absent intervals',()=>{
 const files=fs.readdirSync('supabase/migrations').filter(x=>x.endsWith('_challenge_reliability.sql'));
 assert.equal(files.length,1);
 const sql=read('supabase/migrations/'+files[0]);
 assert.match(sql,/pg_advisory_xact_lock/);
 assert.match(sql,/v_elapsed > 45/);
 assert.match(sql,/p_reset/);
 assert.match(sql,/revoke all on function public.ark60_record_study_heartbeat/);
 assert.doesNotMatch(sql,/from planned_required/);
 assert.match(sql,/protected_mock_required/);
});
test('Reading counts focused study before the optional exam timer starts',()=>{
 assert.doesNotMatch(read('app/day/[day]/reading/page.tsx'),/module="reading" enabled=\{timer.is_running\}/);
});
test('completed Vocabulary result screens do not count as studying',()=>{
 assert.match(read('app/day/[day]/vocabulary/page.tsx'),/module="vocabulary" enabled=\{panel==="study"\|\|\(panel==="quiz"&&attempt\?\.status==="in_progress"\)\}/);
});
test('separate SQL function definitions are terminated',()=>{
 const sql=read('supabase/migrations/'+fs.readdirSync('supabase/migrations').find(x=>x.endsWith('_challenge_reliability.sql')));
 assert.match(sql,/\$function\$;\s*-- Only the server/);
});
test('an interaction after idle expiry resets the baseline before counting resumes',()=>{
 assert.match(read('app/components/study-time-heartbeat.tsx'),/if\(stamp-lastActivity>STUDY_IDLE_MS\)\{activityEpoch\+\+;needsReset=true\}/);
});
