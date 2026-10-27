/** Local fixture-only browser smoke test. Run after npm run build; requires Playwright. */
const {spawn}=require('child_process');
const {chromium:pw}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const browserArgs=JSON.parse(process.env.ADMIN_BROWSER_ARGS||'["--no-sandbox","--disable-dev-shm-usage"]');
const assert=require('assert/strict'),fs=require('fs');
const root=require('path').resolve(__dirname,'..');
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3100'],{cwd:root,stdio:['ignore','pipe','pipe']});
const admin={id:'admin-test',display_name:'Test Admin',username:'admin',role:'super_admin',status:'active'};
const student={id:'s1',first_name:'Test',last_name:'Student',username:'test',status:'active',target_band:7,membership_label:'Muddati tugagan'};
const reading=[1,2,3].map(ordinal=>({student_id:'s1',passage_id:'p'+ordinal,day_number:4,ordinal,score:ordinal,total:13,elapsed_seconds:60,submitted_at:new Date().toISOString(),student,review:{items:[{number:1,submitted:'a',correct:['a'],status:'correct'}]}}));
const writing=[{id:'w1',student,day_number:19,submitted_at:new Date().toISOString(),review_status:'pending',band:null,payload:{task_type:'task1',word_count:1,ai_status:'error'},writing_visits:[]}];
const expires=new Date(Date.now()+2*3600000).toISOString();
const speaking=[{id:'sp1',student_id:'s1',student,day_number:17,submitted_at:new Date().toISOString(),expires_at:expires,review_status:'pending',band:null,audio_expired:false,answer_count:1,total_audio_seconds:1}];
const wav=Buffer.alloc(44+16000);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(16000,40);
speaking.push({...speaking[0],id:'sp2',student:{...student,first_name:'Second'},expires_at:new Date(Date.now()+5*3600000).toISOString()});
const audioUrl='data:audio/wav;base64,'+wav.toString('base64');
function payload(url){const action=url.searchParams.get('action');
 if(url.pathname==='/api/ark60'){
  if(action==='admin_me')return {admin};
  if(action==='admin_dashboard')return {admin,students:[student],total_students:1,active_today:1,today_seconds:600,pending_writing:1,pending_speaking:1,pending_requests:0};
  if(action==='admin_live_activity')return {activity:[{student_id:'s1',full_name:'Test Student',username:'test',status:'offline',current_area:'Dashboard',day_number:19,last_seen_at:new Date().toISOString(),today_seconds:600,total_seconds:600}]};
  if(action==='admin_admins')return {admins:[admin]};
  return {};
 }
 if(url.pathname==='/api/challenge-reading')return {available_days:[{day_number:4,passage_count:3}],attempts:reading,passages:reading.map(r=>({id:r.passage_id,day_number:4,ordinal:r.ordinal,title:'Passage '+r.ordinal,status:'published'}))};
 if(url.pathname==='/api/challenge-writing')return {submissions:writing};
 if(url.pathname==='/api/challenge-speaking')return action==='admin_detail'?{submission:{...speaking.find(r=>r.id===url.searchParams.get("id")),content:{payload:{part1:{topic:'Art'}}},answers:[{id:'a1',part_number:1,question_key:'q1',question_text:'Do you like art?',duration_seconds:1,audio_url:audioUrl}]}}:{submissions:speaking};
 if(url.pathname==='/api/challenge-listening')return {available_days:[{day_number:1,title:'IELTS Listening Test',submission_count:0}],submissions:[]};
 if(url.pathname==='/api/challenge-mock')return {attempts:[{id:'m1',student_id:'s1',student,day_number:18,stage:'completed',listening_score:29,listening_band:6.5,reading_score:29,reading_band:6.5,writing_band:4,started_at:new Date().toISOString()}]};
 if(url.pathname==='/api/mock-access')return {students:[student],codes:[]};
 if(url.pathname==='/api/admin/billing')return {orders:[],cards:[],stats:{active_students:1},students:[student],events:[],access:[{id:'a1',student_id:'s1',plan_key:'challenge',starts_at:new Date(Date.now()-86400000).toISOString(),expires_at:expires,revoked_at:null}],limited:false};
 return {};
}
let output='',started=false;
child.stdout.on('data',async d=>{output+=d;if(!started&&output.includes('Ready')){started=true;let browser;try{
 browser=await pw.launch({executablePath:process.env.ADMIN_BROWSER_EXECUTABLE||undefined,args:browserArgs,headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/**',async route=>{assert.equal(route.request().method(),'GET','Smoke tests must not mutate records');await route.fulfill({json:payload(new URL(route.request().url()))})});
 fs.mkdirSync('/tmp/admin-qa',{recursive:true});
 for(const route of ['reading','listening','writing','speaking','mock']){
  await page.goto('http://127.0.0.1:3100/admin/'+route);await page.waitForTimeout(250);
  await page.screenshot({path:'/tmp/admin-qa/'+route+'-desktop.png',fullPage:true});
  const font=await page.locator('.admin-back span').evaluate(e=>getComputedStyle(e).fontFamily);assert.match(font,/Arial/);
  const h1=await page.locator('h1').first().evaluate(e=>getComputedStyle(e).fontSize);assert.equal(h1,'28px',route+' h1 size');
  if(route==='reading'){await page.getByText('6/39',{exact:true}).waitFor();assert.equal(await page.locator('th').filter({hasText:'Passage 3'}).count(),1)}
  if(route==='writing'){await page.getByText('AI error',{exact:true}).first().waitFor();await page.getByPlaceholder('Search student, day or task…').fill('no-such-student');await page.getByText('Select a Writing submission',{exact:true}).waitFor()}
  if(route==='speaking'){await page.getByText('Audio ready',{exact:true}).waitFor();await page.getByRole('button',{name:'Play all answers'}).click();await page.getByRole('button',{name:'Stop playback'}).click();await page.getByRole('button',{name:'Play all answers'}).waitFor()}
  if(route==='mock')assert.equal(await page.locator('.ma-access-details').getAttribute('open'),null);
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);await page.screenshot({path:'/tmp/admin-qa/'+route+'-mobile.png',fullPage:true});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);assert.equal(overflow,false,route+' mobile page overflow');
  await page.setViewportSize({width:1440,height:1000});console.log('PASS',route,'desktop/mobile');
 }
 await page.goto('http://127.0.0.1:3100/admin/speaking?id=sp2');await page.locator('.sa-detail h2').filter({hasText:'Second Student'}).waitFor();console.log('PASS Speaking notification selects the requested submission');
 await page.goto('http://127.0.0.1:3100/admin');await page.getByRole('heading',{name:'Course control centre'}).waitFor();await page.screenshot({path:'/tmp/admin-qa/overview.png',fullPage:true});
 for(const name of ['Students','To‘lovlar','Admins','Leaderboard','Study time']){
  await page.locator('.learning-nav').getByRole('button',{name,exact:true}).click();await page.waitForTimeout(150);await page.screenshot({path:'/tmp/admin-qa/'+name.replaceAll('‘','')+'.png',fullPage:true});
  if(name==='Students'){await page.getByPlaceholder('Name or username…').fill('test');await page.getByText('Subscription: Muddati tugagan').waitFor()}
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);await page.screenshot({path:'/tmp/admin-qa/'+name.replaceAll('‘','')+'-mobile.png',fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),false,name+' mobile overflow');await page.setViewportSize({width:1440,height:1000});
  if(name==='Students'){await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);assert.ok(await page.locator('.learning-sidebar').evaluate(e=>e.getBoundingClientRect().right)<=0,'closed sidebar must be offscreen');await page.getByRole('button',{name:'Open navigation',exact:true}).click();await page.getByRole('button',{name:'Close navigation',exact:true}).first().click();await page.waitForTimeout(300);await page.setViewportSize({width:1440,height:1000})}
  if(name==='To‘lovlar'){await page.getByRole('button',{name:'Naqd to‘lov qabul qilish',exact:true}).click();await page.getByText('Muddatni ko‘rish uchun o‘quvchini tanlang').waitFor()}
 }
 assert.deepEqual(errors,[]);console.log('PASS admin views; zero browser exceptions');
 }catch(e){console.error(e);process.exitCode=1}finally{await browser?.close();child.kill()}}});
child.stderr.on('data',d=>process.stderr.write(d));setTimeout(()=>{child.kill();process.exitCode=1},90000).unref();
