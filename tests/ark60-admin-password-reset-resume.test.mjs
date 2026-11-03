import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=path=>fs.readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('student passwords can only be reset after admin authentication and target status check',()=>{
 const api=read('api/ark60.py');
 const section=api.split('if action=="reset_student_password":')[1]?.split('if action=="delete_student":')[0];
 assert.ok(section,'reset action exists');
 assert.match(section,/actor=require_admin\(request\)/);
 assert.match(section,/target\[0\]\["status"\]!="active"/);
 assert.match(section,/hash_password\(temporary\)/);
 assert.match(section,/ark60_sessions/);
 assert.doesNotMatch(section,/return.*new_password/);
 assert.doesNotMatch(section,/payload=\{.*"first_name"/);
});
test('student reset UI keeps the same student ID and requires confirmation',()=>{
 const ui=read('app/admin/page.tsx');
 assert.match(ui,/action:"reset_student_password",student_id:resetTarget.id,new_password:resetPassword/);
 assert.match(ui,/Reset student password/);
 assert.match(ui,/Confirm reset/);
 assert.match(ui,/Previous login sessions will be revoked/);
});
test('cross device resume tracks lesson routes and ignores dashboard visits',()=>{
 const api=read('api/ark60.py');
 const tracker=read('app/components/lesson-resume-tracker.tsx');
 const layout=read('app/day/[day]/layout.tsx');
 assert.match(api,/resume_area/);
 assert.match(api,/resume_location/);
 assert.match(api,/if day is not None and area in/);
 assert.match(tracker,/StudentPresence/);
 assert.match(layout,/LessonResumeTracker/);
});
test('resume fallback finds the next incomplete task from the previous progress',async()=>{
 const {suggestChallengeResume}=await import('../lib/ark60-resume.ts');
 const needed={'25':['listening','reading','writing'],'26':['reading','listening']};
 const done=['listening','reading','writing'].map(module=>({day_number:25,module}));
 assert.equal(suggestChallengeResume(needed,done,34)?.href,'/day/26/reading');
 assert.equal(suggestChallengeResume({'25':['listening','reading','writing']},[{day_number:25,module:'listening'}],34)?.href,'/day/25/mock');
});
