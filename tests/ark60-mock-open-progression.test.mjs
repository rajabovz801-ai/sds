import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {execFileSync} from 'node:child_process';

const mod={exports:{}};
new Function('exports','module',ts.transpileModule(fs.readFileSync('lib/ark60-day-access.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(mod.exports,mod);
const {challengeDayUnlocked:open}=mod.exports;
const required=Object.fromEntries(Array.from({length:11},(_,i)=>[i+1,[4,11].includes(i+1)?['listening','reading','writing']:['reading','listening','article','vocabulary','writing','speaking']]));
const allDone=Object.entries(required).flatMap(([day,modules])=>modules.map(module=>({day_number:Number(day),module})));
const progress={required_by_day:required,completed:allDone,completed_mock_days:[4,11]};

test('Sunday mock is open despite missing previous assignments, but never before its date',()=>{
 assert.equal(open(11,{required_by_day:required,completed:[]},'2026-10-11'),true);
 assert.equal(open(11,{required_by_day:required,completed:[]},'2026-10-10'),false);
 assert.equal(open(4,{completed:[]},'2026-10-04',Date.UTC(2026,9,4,4,59)),false);
});
test('October 12 requires both all prior assignments and the completed full mock',()=>{
 assert.equal(open(12,progress,'2026-10-12'),true);
 assert.equal(open(12,{...progress,completed:allDone.filter(x=>!(x.day_number===2&&x.module==='article'))},'2026-10-12'),false);
 assert.equal(open(12,{...progress,completed_mock_days:[4]},'2026-10-12'),false);
 assert.equal(open(12,{...progress,completed:allDone.filter(x=>x.day_number!==11)},'2026-10-12'),false);
 assert.equal(open(12,progress,'2026-10-11'),false);
});
test('Python API applies the same mock exception and strict following-day requirements',()=>{
 const script=`import ast, json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
tree=ast.parse(Path('api/ark60.py').read_text())
funcs=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ['completed_mock_days','completion_with_submitted_mocks','day_unlocked_for_user']]
state={'today':date(2026,10,11),'done':${JSON.stringify(allDone)},'mocks':[4,11],'pending':[]}
required=json.loads(${JSON.stringify(JSON.stringify(required))})
calls=[]
def db(method,table,params=None,payload=None):
 calls.append((table,params))
 if table=='rpc/ark60_student_dashboard_summary': return [{'required_by_day':required,'completed':state['done']}]
 assert table=='ark60_mock_attempts'
 assert params['student_id']=='eq.student'
 return [{'day_number':d,'stage':'completed'} for d in state['mocks']]+state['pending']
scope={'START':date(2026,10,1),'timedelta':timedelta,'datetime':datetime,'timezone':timezone,'today':lambda:state['today'],'now':lambda:datetime(2026,10,12,tzinfo=timezone.utc),'db':db}
exec(compile(ast.Module(body=funcs,type_ignores=[]),'<test>','exec'),scope)
user={'id':'student','username':'student'}
state['done']=[]
assert scope['day_unlocked_for_user'](user,11)
assert not calls
state['today']=date(2026,10,12)
state['done']=json.loads(${JSON.stringify(JSON.stringify(allDone))})
assert scope['day_unlocked_for_user'](user,12)
state['mocks']=[4]
assert not scope['day_unlocked_for_user'](user,12)
state['pending']=[{'day_number':11,'stage':'assessing','listening_submitted_at':'2026-10-11T01:00:00Z','reading_submitted_at':'2026-10-11T02:00:00Z','writing_submitted_at':'2026-10-11T03:00:00Z'}]
assert scope['day_unlocked_for_user'](user,12)
state['pending'][0]['writing_submitted_at']=None
assert not scope['day_unlocked_for_user'](user,12)
state['pending']=[]
state['mocks']=[4,11]
state['done']=[x for x in state['done'] if not (x['day_number']==2 and x['module']=='article')]
assert not scope['day_unlocked_for_user'](user,12)
state['pending']=[{'day_number':11,'stage':'assessing','listening_submitted_at':'2026-10-11T01:00:00Z','reading_submitted_at':'2026-10-11T02:00:00Z','writing_submitted_at':'2026-10-11T03:00:00Z'}]
assert not scope['day_unlocked_for_user'](user,12)
summary={'completed':[]}
extra=scope['completion_with_submitted_mocks'](summary,[11])
assert {(x['day_number'],x['module']) for x in extra}=={(11,'listening'),(11,'reading'),(11,'writing')}
assert all(x['review_status']=='pending' for x in extra)
print('PASS')`;
 assert.equal(execFileSync('python3',['-c',script],{encoding:'utf8'}).trim(),'PASS');
});
