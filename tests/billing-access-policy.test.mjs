import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
function load(){const m={exports:{}};new Function('exports','module',ts.transpileModule(fs.readFileSync('lib/billing/access-policy.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(m.exports,m);return m.exports;}
const launch=Date.parse('2026-10-19T00:00:00+05:00');
const base={enforced:true,challenge_until:null,mock_dates:[],trial_eligible:false,pending:false,had_paid:false};
test('before launch billing cannot close existing study days',()=>{assert.equal(load().membershipDayAllowed(19,{...base,enforced:false},launch-1),true)});
test('existing unpaid learners cannot use old or new challenge days',()=>{for(const d of [1,2,15,19])assert.equal(load().membershipDayAllowed(d,base,launch),false)});
test('new learners get only the first two study days, not two calendar days',()=>{const s={...base,trial_eligible:true};assert.equal(load().membershipDayAllowed(1,s,launch+86400000),true);assert.equal(load().membershipDayAllowed(2,s,launch+86400000),true);assert.equal(load().membershipDayAllowed(3,s,launch),false);assert.equal(load().membershipDayAllowed(25,s,launch),false)});
test('pending does not grant access and expiry is exclusive',()=>{assert.equal(load().membershipDayAllowed(19,{...base,pending:true},launch),false);assert.equal(load().membershipDayAllowed(19,{...base,challenge_until:new Date(launch+1).toISOString()},launch),true);assert.equal(load().membershipDayAllowed(19,{...base,challenge_until:new Date(launch).toISOString()},launch),false)});
test('Challenge never grants a mock and ticket is specific to date',()=>{const s={...base,challenge_until:'2026-11-01T00:00:00Z',mock_dates:['2026-10-25']};assert.equal(load().membershipDayAllowed(25,s,launch),true);assert.equal(load().membershipDayAllowed(18,s,launch),false);assert.equal(load().membershipDayAllowed(32,s,launch),false)});
test('state messaging distinguishes trial, pending, scheduled, expiry and active access',()=>{const p=load();assert.equal(p.membershipState({...base,trial_eligible:true}), 'trial');assert.equal(p.membershipState({...base,pending:true}), 'pending');assert.equal(p.membershipState({...base,had_paid:true}), 'expired');assert.equal(p.membershipState({...base,scheduled_start:'2026-10-19T00:00:00+05:00'}),'scheduled');assert.equal(p.membershipState({...base,challenge_until:'2026-11-01T00:00:00Z'}),'active');});
