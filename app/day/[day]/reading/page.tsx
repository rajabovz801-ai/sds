"use client";
import Link from "next/link";
import {useParams} from "next/navigation";
import {useEffect,useRef,useState} from "react";
import {BookOpen,CheckCircle2,LockKeyhole,ChevronRight,ArrowLeft,Clock3,Highlighter,Send,Play,Pause,Maximize2,Minimize2,Eraser} from "lucide-react";

type Q={number:number,type:"tfng"|"gap"|"mcq",text:string,options?:string[],instruction?:string};
type Passage={id:string,day_number:number,ordinal:number,title:string,text:string,questions:Q[],question_source:string};
type ListItem={id:string,ordinal:number,title:string,completed:{score:number,total:number,elapsed_seconds:number}|null,locked:boolean};
type Result={score:number,total:number,elapsed_seconds:number,answers?:{number:number,correct:string|string[]}[]};
type TimerState={active_seconds:number,running:boolean,server_now?:string};
type SelectionPopup={x:number,y:number};
function elapsed(sec:number){return String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0")}
export default function ChallengeReading(){
 const {day:slug}=useParams<{day:string}>();const day=Number(slug);
 const [items,setItems]=useState<ListItem[]>([]),[draftCount,setDraftCount]=useState(0);
 const [passage,setPassage]=useState<Passage|null>(null),[answers,setAnswers]=useState<Record<string,string>>({});
 const [result,setResult]=useState<Result|null>(null),[timerState,setTimerState]=useState<TimerState|null>(null),[syncedAt,setSyncedAt]=useState(0),[now,setNow]=useState(Date.now());
 const [tab,setTab]=useState<"passage"|"questions">("passage"),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [selectionPopup,setSelectionPopup]=useState<SelectionPopup|null>(null),[fullScreen,setFullScreen]=useState(false);
 const passageRef=useRef<HTMLDivElement>(null),questionsRef=useRef<HTMLDivElement>(null);
 const activeId=useRef<string>("");const isPreview=useRef(false);const selectionRangeRef=useRef<Range|null>(null);
 async function loadList(){const res=await fetch("/api/challenge-reading?action=list&day="+day,{cache:"no-store"});const obj=await res.json();if(!res.ok)throw new Error(obj.error||"Unable to load");setItems(obj.passages||[]);setDraftCount(obj.draft_count||0);isPreview.current=!!obj.preview;}
 useEffect(()=>{let alive=true;(async()=>{try{await loadList()}catch(e){if(alive)setError(String(e))}})();return()=>{alive=false}},[day]);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),250);return()=>clearInterval(timer)},[]);
 useEffect(()=>{const sync=()=>setFullScreen(!!document.fullscreenElement);document.addEventListener("fullscreenchange",sync);return()=>document.removeEventListener("fullscreenchange",sync)},[]);
 const activeSeconds=timerState?Math.min(1200,timerState.active_seconds+(timerState.running?Math.max(0,Math.floor((now-syncedAt)/1000)):0)):0;
 const left=Math.max(0,1200-activeSeconds);
 useEffect(()=>{if(timerState?.running&&passage&&!result&&left===0&&!busy)void submit(true)},[left,timerState?.running,passage,result,busy]);
 function syncClock(value:TimerState){setTimerState(value);setSyncedAt(Date.now());setNow(Date.now())}
 function clearSelection(){window.getSelection()?.removeAllRanges();selectionRangeRef.current=null;setSelectionPopup(null)}
 function removeHighlights(){
  const marks=window.CSS?.highlights;if(!marks)return;
  marks.delete("ark-reading-yellow");marks.delete("ark-reading-green");clearSelection();
 }
 async function changeClock(){
  if(!passage||busy||result||activeSeconds>=1200)return;
  const action=timerState?.running?"pause":"resume";setBusy(true);setError("");
  try{
   const res=await fetch("/api/challenge-reading",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,day,passage_id:passage.id})});
   const data=await res.json();if(!res.ok)throw new Error(data.error||"Unable to update timer");
   syncClock(data.timer);
  }catch(e){setError(String(e))}finally{setBusy(false)}
 }
 function enterFullScreen(){const target=document.documentElement;if(!document.fullscreenElement&&target.requestFullscreen)void target.requestFullscreen().catch(()=>{});}
 async function leavePassage(){
  if(passage&&timerState?.running)try{await fetch("/api/challenge-reading",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"pause",day,passage_id:passage.id}),keepalive:true})}catch{}
  removeHighlights();setPassage(null);setResult(null);setTimerState(null);
  if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});
 }
 async function openPassage(p:ListItem){
  if(p.locked||busy)return;if(!p.completed)enterFullScreen();setBusy(true);setError("");setResult(null);setAnswers({});setTimerState(null);removeHighlights();
  try{
   const res=await fetch("/api/challenge-reading?action=passage&day="+day+"&id="+encodeURIComponent(p.id),{cache:"no-store"});const obj=await res.json();if(!res.ok)throw new Error(obj.error||"Unable to open");
   setPassage(obj.passage);activeId.current=p.id;
   if(obj.completed){setResult(obj.completed);syncClock({active_seconds:obj.completed.elapsed_seconds,running:false});}
   else if(obj.started_at){syncClock(obj.timer)}
   else{const sr=await fetch("/api/challenge-reading",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"start",day,passage_id:p.id})});const start=await sr.json();if(!sr.ok)throw new Error(start.error||"Could not start");syncClock(start.timer);}
  }catch(e){setError(String(e))}finally{setBusy(false)}
 }
 async function submit(auto=false){
  if(!passage||busy||result)return;
  if(!auto&&!confirm("Submit this passage? You cannot change your answers afterward."))return;
  setBusy(true);setError("");
  try{
   const res=await fetch("/api/challenge-reading",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"submit",day,passage_id:passage.id,answers})});
   const obj=await res.json();if(!res.ok)throw new Error(obj.error||"Could not save result");setResult(obj.result);syncClock({active_seconds:obj.result.elapsed_seconds,running:false});await loadList();
  }catch(e){setError(String(e))}finally{setBusy(false)}
 }
 // CSS Custom Highlight ranges never wrap, split or modify the source text.
 function showSelection(which:"passage"|"questions"){
  const container=which==="passage"?passageRef.current:questionsRef.current;
  const sel=window.getSelection();if(!container||!sel||sel.isCollapsed||!sel.rangeCount){setSelectionPopup(null);return}
  const r=sel.getRangeAt(0);if(!container.contains(r.commonAncestorContainer)||!sel.toString().trim()){setSelectionPopup(null);return}
  const node=r.commonAncestorContainer;const element=(node.nodeType===Node.ELEMENT_NODE?node:node.parentElement) as Element|null;
  if(element?.closest("button,input,select,textarea,.cr-question-head b")){setSelectionPopup(null);return}
  selectionRangeRef.current=r.cloneRange();const box=r.getBoundingClientRect();
  setSelectionPopup({x:Math.max(118,Math.min(window.innerWidth-118,(box.left+box.right)/2)),y:Math.max(100,box.top-10)});
 }
 function paintSelection(tone:"yellow"|"green"|"erase"){
  const range=selectionRangeRef.current,marks=window.CSS?.highlights;
  if(!range||!marks){if(!marks)setError("Please use a current Chrome, Edge or Safari for highlighting.");clearSelection();return}
  const overlaps=(a:Range,b:Range)=>a.compareBoundaryPoints(Range.END_TO_START,b)>0&&a.compareBoundaryPoints(Range.START_TO_END,b)<0;
  for(const key of ["ark-reading-yellow","ark-reading-green"]){
   const existing=marks.get(key);if(!existing)continue;
   const keep=Array.from(existing).filter((r)=>!(r instanceof Range&&overlaps(r,range)));
   if(keep.length)marks.set(key,new Highlight(...keep));else marks.delete(key);
  }
  if(tone!=="erase"){
   const key="ark-reading-"+tone;const previous=marks.get(key);
   marks.set(key,new Highlight(...(previous?Array.from(previous):[]),range.cloneRange()));
  }
  clearSelection();
 }
 const total=passage?.questions.length||0,answered=Object.values(answers).filter(Boolean).length;
 const questionGroups:(Q[])[]=[];
 if(passage){for(const q of passage.questions){const last=questionGroups[questionGroups.length-1];if(!last||last[0]?.instruction!==q.instruction)questionGroups.push([q]);else last.push(q);}}
 const rows=passage?.text.split(/\n\s*\n/).filter(Boolean)||[];
 return <main className="cr-shell">
  <header className="cr-header"><div className="cr-identity"><Link href={"/day/"+day} className="cr-back"><ArrowLeft size={17}/> Day {day}</Link><strong>ARK EDUCATION <span>· READING CDI</span></strong></div><div className="cr-time-center"><Clock3 size={17}/><strong className="cr-time-digits">{passage?(result?elapsed(result.elapsed_seconds):elapsed(left)):"20:00"}</strong>{passage&&!result&&<button className={"cr-clock-action "+(timerState?.running?"pause":"start")} disabled={busy||left===0} onClick={changeClock}>{timerState?.running?<><Pause size={14} fill="currentColor"/> Pause</>:<><Play size={14} fill="currentColor"/> {activeSeconds?"Resume":"Start"}</>}</button>}</div><div className="cr-header-right">{passage&&<button className="cr-fullscreen" onClick={()=>document.fullscreenElement?void document.exitFullscreen().catch(()=>{}):enterFullScreen()} title={fullScreen?"Exit fullscreen":"Fullscreen"}>{fullScreen?<Minimize2 size={18}/>:<Maximize2 size={18}/>}<span>{fullScreen?"Exit":"Fullscreen"}</span></button>}</div></header>
  {!passage?<section className="cr-picker">
   <span className="cr-kicker">DAY {String(day).padStart(2,"0")} · IELTS READING</span>
   <h1>Today’s Reading</h1><p>Each passage has a 20-minute timer that runs only after you press Start. Pause or resume whenever needed.</p>
   {items.map(p=><article key={p.id} className={"cr-tile "+(p.locked?"cr-locked":"")}><span className="cr-tile-icon">{p.completed?<CheckCircle2 size={27}/>:p.locked?<LockKeyhole size={27}/>:<BookOpen size={27}/>}</span><div><small>PASSAGE {p.ordinal} · {p.completed?"COMPLETED":p.locked?"LOCKED":"20 MINUTES"}</small><h2>{p.title}</h2>{p.completed&&<p>Score: {p.completed.score}/{p.completed.total} · Time: {elapsed(p.completed.elapsed_seconds)}</p>}</div><button disabled={p.locked||busy} onClick={()=>openPassage(p)}>{p.completed?"View":p.locked?"Locked":"Start"} <ChevronRight size={17}/></button></article>)}
   {!items.length&&!error&&<div className="cr-empty">No published reading materials for this day yet.</div>}
   {draftCount>0&&<p className="cr-draft">{draftCount} passage(s) pending answer-key verification.</p>}
  </section>:<>
   <div className="cr-instructions"><div><small>PASSAGE {passage.ordinal} · DAY {day}</small><h1>{passage.title}</h1><p>Questions {passage.questions[0]?.number}–{passage.questions[total-1]?.number} · Select text to highlight · Timer starts manually</p></div><div className="cr-tools"><Highlighter size={16}/><span>Select text for highlight</span></div></div>
   <div className="cr-mobile-tabs"><button className={tab==="passage"?"active":""} onClick={()=>setTab("passage")}>Passage</button><button className={tab==="questions"?"active":""} onClick={()=>setTab("questions")}>Questions</button></div>
   <div className="cr-split"><section style={{display:tab==="questions"?"var(--cr-hide-passage)":"block"}} className="cr-pane cr-passage" ref={passageRef} onMouseUp={()=>showSelection("passage")} onTouchEnd={()=>setTimeout(()=>showSelection("passage"),80)}><h2>{passage.title}</h2>{rows.map((para,i)=><p key={i}>{para}</p>)}</section>
   <section style={{display:tab==="passage"?"var(--cr-hide-questions)":"block"}} className="cr-pane cr-questions" ref={questionsRef} onMouseUp={()=>showSelection("questions")} onTouchEnd={()=>setTimeout(()=>showSelection("questions"),80)}>
    {questionGroups.map((group,gi)=><section className="cr-qgroup" key={gi}><div className="cr-qgroup-head"><h3>Questions {group[0].number}{group.length>1?"–"+group[group.length-1].number:""}</h3>{group[0].instruction&&<p>{group[0].instruction}</p>}</div>
     {group.map(q=><div className="cr-question" key={q.number} id={"question-"+q.number}><div className="cr-question-head"><b>{q.number}</b><span>{q.text}</span></div>
      {q.type==="tfng"?<div className="cr-options">{["TRUE","FALSE","NOT GIVEN"].map(opt=><label key={opt}><input type="radio" disabled={!!result} checked={answers[q.number]===opt} onChange={()=>setAnswers(a=>({...a,[q.number]:opt}))}/><span className="cr-radio"/>{opt}</label>)}</div>:q.type==="mcq"?<div className="cr-options">{(q.options||[]).map(opt=><label key={opt}><input type="radio" disabled={!!result} checked={answers[q.number]===opt[0]} onChange={()=>setAnswers(a=>({...a,[q.number]:opt[0]}))}/><span className="cr-radio"/>{opt}</label>)}</div>:<input className="cr-gap" type="text" placeholder="Your answer" autoComplete="off" spellCheck={false} disabled={!!result} value={answers[q.number]||""} onChange={e=>setAnswers(a=>({...a,[q.number]:e.target.value}))}/>}
      {result?.answers&&<small className="cr-correct">Correct answer: {String(result.answers.find(a=>a.number===q.number)?.correct??"")}</small>}
     </div>)}</section>)}</section></div>
   <footer className="cr-footer"><button className="cr-back-btn" onClick={()=>void leavePassage()}>← Passages</button><div className="cr-number-strip" aria-label="Question navigation">{passage.questions.map(q=><button key={q.number} className={answers[q.number]?"answered":""} onClick={()=>{setTab("questions");setTimeout(()=>document.getElementById("question-"+q.number)?.scrollIntoView({behavior:"smooth",block:"center"}),20)}}>{q.number}</button>)}</div><span className="cr-answer-count">{result?"Completed":answered+" / "+total}</span>{result?<button className="cr-submit" onClick={()=>{setAnswers({});void leavePassage()}}>Score {result.score}/{result.total} · Continue <ChevronRight size={16}/></button>:<button className="cr-submit" disabled={busy} onClick={()=>submit(false)}><Send size={15}/> {busy?"Submitting…":"Submit"}</button>}</footer>
  </>}
  {selectionPopup&&passage&&!result&&<div className="cr-selection-popover" style={{left:selectionPopup.x,top:selectionPopup.y}} onMouseDown={e=>e.preventDefault()}><button title="Highlight yellow" aria-label="Highlight yellow" onClick={()=>paintSelection("yellow")}><span className="cr-highlight-swatch yellow"/></button><button title="Highlight mint" aria-label="Highlight mint" onClick={()=>paintSelection("green")}><span className="cr-highlight-swatch green"/></button><span className="cr-selection-divider"/><button title="Remove selected highlight" aria-label="Remove selected highlight" onClick={()=>paintSelection("erase")}><Eraser size={17}/></button></div>}
  {error&&<div className="cr-error" role="alert">{error}<button onClick={()=>setError("")}>×</button></div>}
  <style jsx global>{`
  ::highlight(ark-reading-yellow){background:#ffe785;color:inherit}
  ::highlight(ark-reading-green){background:#b5f0cd;color:inherit}
  .cr-shell{--cr-hide-passage:block;--cr-hide-questions:block;min-height:100vh;background:#fff;font:15px/1.55 Arial,"Lato",sans-serif;color:#121820;display:flex;flex-direction:column}
  .cr-header{height:62px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e7e9ed;padding:0 23px;gap:15px}
  .cr-header strong{letter-spacing:.08em;font-size:12px}.cr-header strong span{color:#7c8593;font-weight:500}.cr-back{display:flex;gap:7px;align-items:center;text-decoration:none;color:#4a5360;font-size:12px}.cr-timer{display:flex;align-items:center;gap:7px;font-weight:800;font-variant-numeric:tabular-nums}
  .cr-picker{width:min(840px,calc(100% - 30px));margin:48px auto}.cr-kicker,.cr-instructions small{color:#d73541;font-size:12px;font-weight:800;letter-spacing:.08em}.cr-picker h1{font-size:34px;letter-spacing:-.03em;margin:8px 0}.cr-picker>p{color:#647083;margin:0 0 28px}.cr-tile{border:1px solid #e5e8ed;border-radius:14px;display:flex;align-items:center;gap:20px;padding:24px;margin:15px 0;box-shadow:0 4px 20px #10182807}.cr-tile-icon{width:50px;height:50px;border-radius:12px;background:#f0f2f8;color:#4e5d80;display:grid;place-items:center;flex-shrink:0}.cr-tile>div:nth-child(2){flex:1}.cr-tile small{color:#758095;font-size:11px;font-weight:700}.cr-tile h2{margin:5px 0;font-size:20px}.cr-tile p{margin:0;color:#16815c}.cr-tile button,.cr-submit{border:0;border-radius:8px;background:#1a202b;color:white;display:flex;align-items:center;gap:5px;padding:11px 16px;font-weight:700;cursor:pointer}.cr-tile button:disabled{background:#e4e8ee;color:#8190a3;cursor:not-allowed}.cr-draft,.cr-empty{color:#8d6740!important;margin-top:18px!important}.cr-instructions{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 24px;border-bottom:1px solid #e5e8ee;background:#f7f8fa}.cr-instructions h1{font-size:19px;margin:0 0 2px}.cr-instructions p{color:#586777;margin:0;font-size:13px}.cr-tools{display:flex;gap:6px}.cr-tools button{background:#fff;border:1px solid #dce2e9;padding:8px 9px;display:flex;align-items:center;gap:6px;border-radius:6px;font-size:12px;cursor:pointer}.cr-tools .cr-on{border-color:#e9bd44;background:#fff7dd}.cr-color{display:inline-block;width:12px;height:12px;border-radius:3px}.cr-color.yellow{background:#ffe785}.cr-color.green{background:#b5f0cd}
  .cr-split{height:calc(100vh - 62px - 82px - 62px);display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:14px 20px;background:#fff}.cr-pane{border:1px solid #e0e5ed;border-radius:7px;overflow-y:auto;min-height:0;padding:25px 28px;scrollbar-color:#aeb9c8 #fff;scrollbar-width:thin}.cr-passage{font:16px/1.8 Georgia,"Times New Roman",serif}.cr-passage h2{font:700 23px/1.25 Arial,sans-serif;margin:0 0 25px}.cr-passage p{margin:0 0 23px;white-space:pre-wrap}.cr-questions{font-size:15px}.cr-qgroup{margin:0 0 30px}.cr-qgroup-head{margin:0 0 22px}.cr-qgroup-head h3{font-size:20px;margin:0 0 8px}.cr-qgroup-head p{font-size:14px;line-height:1.55;margin:0;color:#4f5a69;max-width:760px}.cr-question{padding:0 0 21px;margin:0 0 21px;border-bottom:1px solid #ecedf0}.cr-question-head{display:flex;align-items:flex-start;gap:12px}.cr-question-head b{border:1px solid #d8dee8;border-radius:4px;padding:4px 10px}.cr-question-head span{padding-top:4px;white-space:pre-line}.cr-options{display:grid;gap:12px;margin:16px 0 0 42px}.cr-options label{display:flex;align-items:center;gap:10px;cursor:pointer;position:relative}.cr-options input{position:absolute;opacity:0;pointer-events:none}.cr-radio{width:18px;height:18px;border:1.5px solid #ef535b;border-radius:50%;display:grid;place-items:center;flex:0 0 18px}.cr-options input:checked+.cr-radio:after{content:"";width:8px;height:8px;border-radius:50%;background:#ef535b}.cr-gap{display:block;margin:14px 0 0 43px;border:1px solid #b4bdc9;border-radius:5px;padding:7px 10px;min-width:190px;font-weight:600}.cr-correct{display:block;margin:10px 0 0 42px;color:#167a50}.cr-footer{position:sticky;bottom:0;min-height:62px;padding:8px 22px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid #e3e7ed;background:white;gap:12px}.cr-number-strip{display:flex;gap:4px;overflow-x:auto;max-width:min(52vw,650px);scrollbar-width:none}.cr-number-strip::-webkit-scrollbar{display:none}.cr-number-strip button{width:29px;height:29px;flex:0 0 29px;border:1px solid #dbe0e5;border-radius:4px;background:#fff;font-size:12px;cursor:pointer}.cr-number-strip button.answered{border-color:#687586;background:#f2f4f7;font-weight:800}.cr-answer-count{font-size:12px;color:#647083;white-space:nowrap}.cr-back-btn{border:0;background:none;color:#536071;cursor:pointer}.cr-error{position:fixed;right:20px;bottom:78px;max-width:400px;border:1px solid #ffc1c1;background:#fff1f1;color:#9c2020;padding:15px;border-radius:9px;box-shadow:0 9px 30px #0001}.cr-error button{float:right;background:none;border:0;font-size:22px;margin-left:12px}.cr-mobile-tabs{display:none}
  @media(max-width:780px){.cr-header{padding:0 12px;height:58px}.cr-header strong span{display:none}.cr-instructions{padding:10px 12px;align-items:flex-start}.cr-instructions h1{font-size:16px}.cr-instructions p{font-size:12px}.cr-tools button{font-size:0}.cr-tools button span{font-size:0}.cr-tools .cr-color{font-size:0}.cr-mobile-tabs{display:flex;gap:5px;background:#eff1f4;padding:5px 10px}.cr-mobile-tabs button{flex:1;border:0;border-radius:6px;padding:7px;background:transparent}.cr-mobile-tabs .active{background:white;font-weight:800}.cr-split{height:calc(100dvh - 58px - 100px - 46px - 62px);display:block;padding:7px 10px}.cr-shell:has(.cr-mobile-tabs .active:first-child){--cr-hide-questions:none;--cr-hide-passage:block}.cr-shell:has(.cr-mobile-tabs .active:last-child){--cr-hide-passage:none;--cr-hide-questions:block}.cr-pane{height:100%;padding:20px 15px}.cr-picker{margin:28px auto}.cr-tile{padding:14px;gap:11px}.cr-tile-icon{width:38px;height:38px}.cr-tile h2{font-size:15px}.cr-tile button{padding:7px 9px}.cr-footer{padding:6px 8px;gap:7px}.cr-back-btn{display:none}.cr-answer-count{display:none}.cr-number-strip{max-width:calc(100vw - 126px)}.cr-submit{padding:9px 10px;font-size:12px}.cr-passage{font-size:16px}}

  /* Premium, restrained exam UI. Selection highlights are paint-only and cannot shift text. */
  .cr-shell{font-family:var(--ark-geist),Inter,"Segoe UI",sans-serif}
  .cr-header{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:16px;position:relative;z-index:15;background:#fff}
  .cr-identity{display:flex;align-items:center;gap:22px;min-width:0}.cr-identity strong{white-space:nowrap}.cr-header-right{display:flex;justify-content:flex-end}
  .cr-time-center{display:flex;align-items:center;justify-content:center;gap:10px;color:#283344;white-space:nowrap}
  .cr-time-digits{font-family:var(--ark-geist),Inter,"Segoe UI",sans-serif;font-size:20px!important;font-variant-numeric:tabular-nums;letter-spacing:-.035em!important}
  .cr-clock-action{display:inline-flex;align-items:center;gap:5px;border:1px solid #c9d3e2;background:#f5f8fc;border-radius:7px;padding:6px 11px;font:700 12px var(--ark-geist),sans-serif;cursor:pointer;color:#253449}
  .cr-clock-action.start{background:#193c65;border-color:#193c65;color:white}.cr-clock-action:disabled{opacity:.5;cursor:not-allowed}
  .cr-fullscreen{display:flex;align-items:center;gap:7px;border:1px solid #e0e6ef;border-radius:7px;padding:8px 10px;background:#fff;color:#42546b;font-size:12px;cursor:pointer}
  .cr-instructions{background:#f9fbfd}.cr-instructions small,.cr-kicker{color:#aa7a32}.cr-instructions h1{font-family:var(--ark-geist),Inter,sans-serif;font-weight:750;letter-spacing:-.025em}
  .cr-tools{display:flex;align-items:center;gap:8px;font:500 12px var(--ark-geist),sans-serif;color:#66768c}
  .cr-passage{font:17px/1.76 var(--ark-literata),Georgia,"Times New Roman",serif;letter-spacing:.002em}
  .cr-passage h2{font:700 23px/1.3 var(--ark-geist),Inter,sans-serif}
  .cr-questions,.cr-qgroup-head,.cr-footer{font-family:var(--ark-geist),Inter,"Segoe UI",sans-serif}
  .cr-qgroup-head h3{letter-spacing:-.03em}.cr-selection-popover{position:fixed;transform:translate(-50%,-100%);display:flex;align-items:center;gap:5px;z-index:80;background:#243348;border:1px solid #41516a;border-radius:9px;padding:6px;box-shadow:0 8px 26px #0a1c3260;user-select:none}
  .cr-selection-popover button{width:35px;height:33px;display:grid;place-items:center;border:0;border-radius:5px;background:transparent;color:#fff;cursor:pointer}
  .cr-selection-popover button:hover{background:#3d4e65}.cr-highlight-swatch{width:19px;height:19px;border-radius:4px;border:2px solid #fff}.cr-highlight-swatch.yellow{background:#ffe785}.cr-highlight-swatch.green{background:#b5f0cd}
  .cr-selection-divider{height:23px;width:1px;background:#627187;margin:0 2px}
  .cr-number-strip button:focus-visible,.cr-clock-action:focus-visible,.cr-selection-popover button:focus-visible{outline:3px solid #6ba6ef;outline-offset:2px}
  @media(max-width:780px){
   .cr-header{grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:5px;padding:0 9px}
   .cr-identity{gap:5px}.cr-identity strong{font-size:10px;letter-spacing:.01em}.cr-identity .cr-back{display:none}
   .cr-time-center{gap:5px}.cr-time-center>svg{display:none}.cr-time-digits{font-size:16px!important}
   .cr-clock-action{font-size:11px;padding:6px 7px}
   .cr-fullscreen{padding:7px}.cr-fullscreen span{display:none}.cr-instructions{align-items:center}.cr-instructions p{max-width:260px}
   .cr-tools span{display:none}.cr-passage{font-size:16px}
  }
  @media(max-width:365px){.cr-identity strong{font-size:9px}.cr-header-right{max-width:35px}.cr-clock-action{padding:5px}.cr-time-center{gap:4px}}
  `}</style>
 </main>;
}