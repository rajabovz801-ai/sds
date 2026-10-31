import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultMockDay,membershipProgress} from '../lib/admin-display.ts';
test('mock defaults follow Tashkent course date and valid explicit selection',()=>{
 assert.equal(defaultMockDay(new Date('2026-10-31T18:00:00Z')),25);
 assert.equal(defaultMockDay(new Date('2026-10-31T19:00:00Z')),32);
 assert.equal(defaultMockDay(new Date('2026-09-01T00:00:00Z')),4);
 assert.equal(defaultMockDay(new Date('2027-01-01T00:00:00Z')),60);
 assert.equal(defaultMockDay(new Date('2026-10-31T18:00:00Z'),'18'),18);
 assert.equal(defaultMockDay(new Date('2026-10-31T18:00:00Z'),'19'),25);
});
test('subscription progress preserves scheduled and expired periods',()=>{
 const start='2026-10-01T00:00:00Z',end='2026-10-08T00:00:00Z';
 assert.deepEqual(membershipProgress(start,end,Date.parse(start)-1000),{percent:100,tone:'scheduled',label:'Boshlanishi kutilmoqda'});
 assert.deepEqual(membershipProgress(start,end,Date.parse(end)),{percent:0,tone:'expired',label:'Muddati tugagan'});
 assert.equal(membershipProgress(start,end,Date.parse(start)+86400000).label,'6 kun 0 soat qoldi');
 assert.equal(membershipProgress(start,end,Date.parse(end)-3600000).tone,'ending');
 assert.equal(membershipProgress('bad',end,Date.now()),null);
 assert.equal(membershipProgress(end,start,Date.now()),null);
});
test('scheduled mock grants stay outside active filter',async()=>{
 const {grantDisplayState}=await import('../lib/admin-display.ts');
 const now=Date.parse('2026-10-31T10:00:00Z');
 assert.equal(grantDisplayState({starts_at:'2026-11-01T04:00:00Z',expires_at:null,mock_on:'2026-11-01'},now),'scheduled');
 assert.equal(grantDisplayState({starts_at:'2026-10-25T04:00:00Z',expires_at:null,mock_on:'2026-10-25'},now),'expired');
});
test('silent refresh waits for slow in-flight result and explicit changes abort it',async()=>{
 const {beginAdminRequest}=await import('../lib/admin-display.ts');
 const first=beginAdminRequest(null,false);
 assert.ok(first);
 assert.equal(beginAdminRequest(first,true),null);
 assert.equal(first.signal.aborted,false);
 const next=beginAdminRequest(first,false);
 assert.equal(first.signal.aborted,true);
 assert.ok(next);
});
test('dark mode expiry fill contrasts with track',async()=>{
 const fs=await import('node:fs');
 const css=fs.readFileSync('app/night-theme.css','utf8');
 assert.match(css,/bill-expiry\.ending \[role=progressbar\]>span\s*\{\s*background:\s*#E8C56A/i);
});
