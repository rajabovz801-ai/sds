import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,ownerExperienceAllowed,competitionRanks,practiceOutcome,weeklyProgress} from '../lib/experience/core.ts';

test('owner lab accepts only the existing active owner account',()=>{
 assert.equal(ownerExperienceAllowed({username:'rustam7',status:'active'}),true);
 for(const user of [null,{username:'Rustam',status:'active'},{username:'rustam7',status:'pending'},{username:'student',status:'active',preview:true}])assert.equal(ownerExperienceAllowed(user),false);
});
test('catalog has all six categories and safe unique prices',()=>{
 assert.equal(new Set(catalog.map(x=>x.id)).size,catalog.length);
 assert.deepEqual([...new Set(catalog.map(x=>x.category))].sort(),['avatar','companion','cover','frame','theme','title']);
 assert.ok(catalog.every(x=>Number.isInteger(x.price)&&x.price>0&&x.price<1000));
});
test('equal XP shares a place and spending wallet never participates',()=>{
 assert.deepEqual(competitionRanks([520,480,410,240,240,240,180]),[1,2,3,4,4,4,7]);
});
test('practice normalizes case and punctuation, never rewards empty answers',()=>{
 assert.equal(practiceOutcome('  Reliable. ','reliable'),true);
 assert.equal(practiceOutcome('',''),false);
 assert.equal(practiceOutcome('wrong','reliable'),false);
});
test('weekly completion deduplicates module per day',()=>{
 const rows=[{day:12,module:'reading'},{day:12,module:'reading'},{day:13,module:'listening'},{day:2,module:'reading'}];
 assert.equal(weeklyProgress(rows,12).total,2);
});
