import test from 'node:test';
import assert from 'node:assert/strict';
import {moduleCompletion,canResume,formatUzDate} from '../lib/challenge-workspace.ts';
const completed=[{day_number:1,module:'reading'},{day_number:1,module:'reading'},{day_number:2,module:'reading'},{day_number:3,module:'reading'}];
const required={'1':['reading','listening'],'2':['reading']};
test('completion counts only distinct published requirements',()=>{
 assert.deepEqual(moduleCompletion('reading',required,completed),{done:2,total:2,percent:100});
 assert.deepEqual(moduleCompletion('listening',required,completed),{done:0,total:1,percent:0});
 assert.deepEqual(moduleCompletion('writing',required,completed),{done:0,total:0,percent:0});
});
test('resume rejects finished days and modules but allows unfinished published tasks',()=>{
 assert.equal(canResume({day:1,area:'Reading'},required,completed),false);
 assert.equal(canResume({day:1,area:'Day'},required,completed),true);
 assert.equal(canResume({day:2,area:'Day'},required,completed),false);
 assert.equal(canResume({day:1,area:'Listening'},required,completed),true);
 assert.equal(canResume({day:3,area:'Day'},required,completed),false);
});
test('Uzbek dates do not depend on incomplete host ICU month data',()=>{
 assert.equal(formatUzDate('2026-10-26T19:30:00Z'),'27-oktabr 2026');
 assert.equal(formatUzDate('2026-10-26'),'26-oktabr 2026');
 assert.equal(formatUzDate('invalid'),'—');
});
