import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAttendanceAdmin,isAdminCommand,todayInTashkent,validDay,moveMonth,monthKeyboard,
  summarizeAttendance,renderAttendanceHTML,compactSummary
} from '../lib/attendance-report-core.mjs';

test('only both explicitly authorized Telegram IDs can enter /admin',()=>{
  assert.equal(isAttendanceAdmin('5170628705'),true);
  assert.equal(isAttendanceAdmin(1060535083),true);
  assert.equal(isAttendanceAdmin('5170628706'),false);
  assert.equal(isAttendanceAdmin(''),false);
  assert.equal(isAttendanceAdmin(null),false);
});

test('only /admin opens this panel',()=>{
  assert.equal(isAdminCommand('/admin'),true);
  assert.equal(isAdminCommand(' /admin  '),true);
  assert.equal(isAdminCommand('/admin@TeddyBot'),true);
  assert.equal(isAdminCommand('/admib'),false);
  assert.equal(isAdminCommand('/admin extra'),false);
  assert.equal(isAdminCommand('/administrator'),false);
});

test('Tashkent date, safe calendar and month navigation',()=>{
  assert.equal(todayInTashkent(new Date('2026-09-27T20:30:00Z')),'2026-09-28');
  assert.equal(validDay('2026-02-30'),false);
  assert.equal(validDay('2026-09-28'),true);
  assert.equal(moveMonth('2026-01',-1),'2025-12');
  assert.equal(moveMonth('2026-12',1),'2027-01');
  const markup=monthKeyboard('2026-09','2026-09-28');
  const all=markup.inline_keyboard.flat();
  assert.ok(all.some(x=>x.callback_data==='att:day:2026-09-27'));
  assert.ok(all.some(x=>x.callback_data==='att:day:2026-09-28'));
  assert.ok(!all.some(x=>x.callback_data==='att:day:2026-09-29'));
});

test('all groups are included; departure and auto events preserved',()=>{
  const sessions=[
    {id:'s1',group_id:'g1',status:'closed'},
    {id:'s2',group_id:'g2',status:'closed'}
  ];
  const groups=[
    {id:'g1',name:'IELTS',late_grace_min:5,teacher:'Rustam'},
    {id:'g2',name:'CEFR',late_grace_min:5,teacher:'Rustam'}
  ];
  const students=[
    {id:'st1',name:'Jasmina'},
    {id:'st2',name:'Asliddin'},
    {id:'st3',name:'Javohir'}
  ];
  const attendance=[
    {session_id:'s1',student_id:'st1',checked_in:'2026-09-28T04:00:00Z',checked_out:'2026-09-28T05:30:00Z',late_min:0},
    {session_id:'s1',student_id:'st2',checked_in:null,checked_out:null,late_min:0},
    {session_id:'s2',student_id:'st3',checked_in:'2026-09-28T08:10:00Z',checked_out:'2026-09-28T09:00:00Z',late_min:10}
  ];
  const auto=[{session_id:'s1',student_id:'st1'}];
  const report={date:'2026-09-28',...summarizeAttendance(sessions,groups,students,attendance,auto)};
  assert.deepEqual(report.totals,{total:3,present:2,absent:1,pending:0,late:1,auto:1});
  assert.equal(report.groups.length,2);
  assert.equal(report.percent,67);
  assert.equal(report.groups.find(g=>g.name==='IELTS').rows.find(r=>r.name==='Jasmina').auto,true);
  const html=renderAttendanceHTML(report);
  assert.match(html,/Jasmina/);
  assert.match(html,/Asliddin/);
  assert.match(html,/Javohir/);
  assert.match(html,/CEFR/);
  assert.match(html,/Avtomatik ketdi/);
  assert.match(compactSummary(report),/IELTS/);
});

test('report HTML escapes unsafe student and group names',()=>{
  const groups=[{id:'g1',name:'<img src=x onerror=alert(1)>',late_grace_min:5}];
  const records=[{session_id:'s1',student_id:'x',checked_in:null,checked_out:null,late_min:0}];
  const result={date:'2026-09-28',...summarizeAttendance([{id:'s1',group_id:'g1',status:'closed'}],
    groups,[{id:'x',name:'Alice<script>alert(1)</script>'}],records)};
  const html=renderAttendanceHTML(result);
  assert.ok(!html.includes('<script>alert(1)'));
  assert.ok(!html.includes('<img src=x onerror=alert(1)>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('&lt;img'));
});