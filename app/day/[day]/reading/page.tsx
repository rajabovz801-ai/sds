"use client";
import AnimatedBackButton from "../../../components/animated-back-button";
import ChallengeSidebar from "../../../components/challenge-sidebar";
import {useParams} from "next/navigation";
import {useEffect,useRef,useState} from "react";
import {BookOpen,CheckCircle2,LockKeyhole,ChevronRight,Clock3,Highlighter,Send,Play,Pause,Maximize2,Minimize2,Eraser} from "lucide-react";
import ReadingAnalysis, {type ReadingReview} from "./ReadingAnalysis";

type Q={number:number,type:"tfng"|"gap"|"mcq"|"select",text:string,options?:string[],instruction?:string,pair_group?:string};
const P2_DAYS=new Set([2,6,9,13,16]);
const P3_DAYS=new Set([3,7,10,14,17]);
const optionValue=(value:string)=>value.trim().match(/^([ivx]+|[A-Z])(?:[.): ]|$)/i)?.[1]||value.trim();
type Passage={id:string,day_number:number,ordinal:number,title:string,text:string,questions:Q[],question_source:string};
type ListItem={id:string,ordinal:number,title:string,completed:{score:number,total:number,elapsed_seconds:number}|null,locked:boolean};
type Result={score:number,total:number,elapsed_seconds:number,answers?:{number:number,correct:string|string[]}[]};
function elapsed(sec:number){return String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0")}
type ServerTimer={started_at:string|null;active_seconds:number;resumed_at:string|null;is_running:boolean;elapsed_seconds:number};
const initialTimer:ServerTimer={started_at:null,active_seconds:0,resumed_at:null,is_running:false,elapsed_seconds:0};
function usedSeconds(timer:ServerTimer,now:number){return Math.min(1200,Math.max(0,Number(timer.active_seconds)||0)+(timer.is_running&&timer.resumed_at?Math.max(0,Math.floor((now-Date.parse(timer.resumed_at))/1000)):0));}
export default function ChallengeReading(){
 const {day:slug}=useParams<{day:string}>();const day=Number(slug);
 const [items,setItems]=useState<ListItem[]>([]),[draftCount,setDraftCount]=useState(0);
 const [passage,setPassage]=useState<Passage|null>(null),[answers,setAnswers]=useState<Record<string,string>>({});
 const [review,setReview]=useState<ReadingReview|null>(null);
 const [result,setResult]=useState<Result|null>(null),[timer,setTimer]=useState<ServerTimer>(initialTimer),[now,setNow]=useState(Date.now());
 const [tab,setTab]=useState<"passage"|"questions">("passage"),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [selectionMenu,setSelectionMenu]=useState<{x:number,y:number}|null>(null),[fullScreen,setFullScreen]=useState(false);
 const passageRef=useRef<HTMLDivElement>(null),questionsRef=useRef<HTMLDivElement>(null),selectionRef=useRef<Range|null>(null);
 const activeId=useRef<string>("");const isPreview=useRef(false);
 async function loadList(){const res=await fetch("/api/challenge-reading?action=list&day="+day,{cache:"no-store"});const obj=await res.json();if(!res.ok)throw new Error(obj.error||"Unable to load");setItems(obj.passages||[]);setDraftCount(obj.draft_count||0);isPreview.current=!!obj.preview;}
 useEffect(()=>{let alive=true;(async()=>{try{await loadList()}catch(e){if(alive)setError(String(e))}})();return()=>{alive=false}},[day]);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[]);
 useEffect(()=>{const fn=()=>setFullScreen(!!document.fullscreenElement);document.addEventListener("fullscreenchange",fn);return()=>document.removeEventListener("fullscreenchange",fn)},[]);
 useEffect(()=>{if(!timer.is_running||!passage||result||busy)return;if(usedSeconds(timer,now)>=1200)submit(true)},[now,timer,passage,result,busy]);
 async function setRunning(action:"start"|"pause"){
  if(!passage||busy||result)return;setBusy(true);setError("");
  try{const res=await fetch("/api/challenge-reading",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:action==="start"?(timer.started_at?"resume":"start"):"pause",day,passage_id:passage.id})});const obj=await res.json();if(!res.ok)throw new Error(obj.error||"Could not update timer");setTimer(obj.timer);setNow(Date.now())}
  catch(e){setError(String(e))}finally{setBusy(false)}
 }
 async function goBack(){if(passage&&!result&&timer.is_running){await setRunning("pause")};setPassage(null);setResult(null);setReview(null);setTimer(initialTimer);clearHighlights()}
 async function toggleFullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{setError("Your browser does not allow fullscreen here. Use your browser's fullscreen control.")}}
 function clearHighlights(){const h=window.CSS?.highlights;if(h){h.delete("ark-reading-yellow");h.delete("ark-reading-green")}selectionRef.current=null;setSelectionMenu(null)}
 function showHighlightMenu(){
  const s=window.getSelection();if(!s||s.isCollapsed||!s.rangeCount)return;
  const r=s.getRangeAt(0);if(!passageRef.current?.contains(r.commonAncestorContainer)&&!questionsRef.current?.contains(r.commonAncestorContainer))return;
  const rect=r.getBoundingClientRect();selectionRef.current=r.cloneRange();
  setSelectionMenu({x:Math.min(window.innerWidth-112,Math.max(112,rect.left+rect.width/2)),y:Math.max(66,rect.top-54)});
 }
 function applyHighlight(shade:"yellow"|"erase"){
  const range=selectionRef.current,h=window.CSS?.highlights;
  if(!range||!h){setError("Please use an updated Chrome, Edge or Safari for text highlighting.");return}
  if(shade==="erase"){
   for(const key of ["ark-reading-yellow","ark-reading-green"]){const old=h.get(key);if(!old)continue;const keep=Array.from(old).filter(r=>!(r instanceof Range&&r.compareBoundaryPoints(Range.END_TO_START,range)>0&&r.compareBoundaryPoints(Range.START_TO_END,range)<0));if(keep.length)h.set(key,new Highlight(...keep));else h.delete(key)}
  }else{
   const key="ark-reading-yellow";
   const old=h.get(key);h.set(key,old?new Highlight(...Array.from(old),range.cloneRange()):new Highlight(range.cloneRange()));
  }
  window.getSelection()?.removeAllRanges();selectionRef.current=null;setSelectionMenu(null);
 }
 async function openPassage(p:ListItem){
  if(p.locked||busy)return;
  // Fullscreen must be requested in the actual click gesture, before the first await.
  if(!document.fullscreenElement)document.documentElement.requestFullscreen().catch(()=>{});
  clearHighlights();setBusy(true);setError("");setResult(null);setReview(null);setAnswers({});setTimer(initialTimer);setSelectionMenu(null);
  try{
   const res=await fetch("/api/challenge-reading?action=passage&day="+day+"&id="+encodeURIComponent(p.id),{cache:"no-store"});const obj=await res.json();if(!res.ok)throw new Error(obj.error||"Unable to open");
   setPassage(obj.passage);activeId.current=p.id;
   if(obj.completed){setResult(obj.completed);setReview(obj.review||null);setTimer(initialTimer)}
   else setTimer(obj.timer||initialTimer);
  }catch(e){setError(String(e))}finally{setBusy(false)}
 }
 async function submit(auto=false){
  if(!passage||busy||result)return;
  if(!auto&&!confirm("Submit this passage? You cannot change your answers afterward."))return;
  setBusy(true);setError("");
  try{
   const res=await fetch("/api/challenge-reading",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"submit",day,passage_id:passage.id,answers})});
   const obj=await res.json();if(!res.ok)throw new Error(obj.error||"Could not save result");setResult(obj.result);setReview(obj.review||null);setTimer(t=>({...t,is_running:false,active_seconds:obj.result.elapsed_seconds||t.active_seconds,resumed_at:null}));clearHighlights();await loadList();
  }catch(e){setError(String(e))}finally{setBusy(false)}
 }
 // Native CSS highlights never wrap or split text nodes, so layout stays unchanged.
 const total=passage?.questions.length||0,answered=Object.values(answers).filter(Boolean).length;
 const questionGroups:(Q[])[]=[];
 if(passage){for(const q of passage.questions){const last=questionGroups[questionGroups.length-1];if(!last||last[0]?.instruction!==q.instruction)questionGroups.push([q]);else last.push(q);}}
 const left=1200-usedSeconds(timer,now);
 const rows=passage?.text.replace(/\\n\\n/g,"\n\n").split(/\n\s*\n/).filter(p=>p.trim().length>8)||[];
 async function continueAfterReview(){const next=items.find(p=>p.ordinal===2);if(passage?.ordinal===1&&next&&!next.locked){await openPassage(next)}else await goBack()}
 return <main className={"cr-shell "+(!passage?"cr-overview":"")}>
  {!passage&&<ChallengeSidebar day={day} active="Reading"/>}
  <header className="cr-header">
   <div className="cr-head-start">{passage?<AnimatedBackButton onClick={goBack} ariaLabel="Back to passages"/>:<AnimatedBackButton href={"/day/"+day} ariaLabel="Back to study day"/>}</div>
   <div className="cr-head-center">{passage&&!result?<div className="cr-timer-controls"><span className="cr-time"><Clock3 size={17}/>{elapsed(left)}</span><button className={timer.is_running?"cr-pause":"cr-play"} disabled={busy||left===0} onClick={()=>setRunning(timer.is_running?"pause":"start")}>{timer.is_running?<Pause size={14}/>:<Play size={14}/>} {timer.is_running?"Pause":timer.started_at?"Resume":"Start"}</button></div>:<strong>ARK EDUCATION <span>· READING CDI</span></strong>}</div>
   <div className="cr-head-end">{passage?<><span className="cr-head-practice">PRACTICE {String(passage.ordinal).padStart(2,"0")}</span><button className="cr-fullscreen" aria-label={fullScreen?"Exit fullscreen":"Enter fullscreen"} onClick={toggleFullscreen}>{fullScreen?<Minimize2 size={18}/>:<Maximize2 size={18}/>}</button></>:<span className="cr-head-day">DAY {String(day).padStart(2,"0")} <b>· READING</b></span>}</div>
  </header>
  {!passage?<section className="cr-picker">
   <div className="cr-picker-intro"><div className="cr-picker-copy"><span className="cr-kicker">DAY {String(day).padStart(2,"0")} · IELTS READING</span><h1>Today’s Reading</h1><p>Two focused {P3_DAYS.has(day)?"Passage 3":P2_DAYS.has(day)?"Passage 2":"Passage 1"} practices. Finish the first to unlock the second; review your answers after submission.</p><div className="cr-picker-chips"><span><BookOpen size={14}/>{items.length} practices</span><span><Clock3 size={14}/>20 min each</span><span><CheckCircle2 size={14}/>{items.filter(p=>p.completed).length} completed</span>{isPreview.current&&<span className="cr-preview-chip">Teacher preview</span>}</div></div><div className="cr-picker-progress"><span>DAILY PROGRESS</span><strong>{items.filter(p=>p.completed).length}<small>/{items.length||2}</small></strong><div className="cr-progress-rail"><i style={{width:(items.length?items.filter(p=>p.completed).length/items.length*100:0)+"%"}}/></div><small>{items.length&&items.every(p=>p.completed)?"Both practices completed":"Your submitted results are saved"}</small></div></div>
   {items.length===2&&items.every(p=>!!p.completed)&&<div className="cr-daily-completed"><CheckCircle2 size={20}/><div><b>Daily Reading completed</b><p>{items.reduce((n,p)=>n+(p.completed?.score||0),0)}/{items.reduce((n,p)=>n+(p.completed?.total||0),0)} correct · Total active time {elapsed(items.reduce((n,p)=>n+(p.completed?.elapsed_seconds||0),0))}</p></div></div>}
   <div className="cr-practice-list">{items.map(p=><article key={p.id} className={"cr-tile "+(p.locked?"cr-locked":p.completed?"cr-complete":"cr-ready")}><span className="cr-tile-icon">{p.completed?<CheckCircle2 size={22}/>:p.locked?<LockKeyhole size={22}/>:<BookOpen size={22}/>}</span><div className="cr-tile-body"><div className="cr-tile-meta"><small>PRACTICE {String(p.ordinal).padStart(2,"0")} · IELTS PASSAGE {P3_DAYS.has(day)?3:P2_DAYS.has(day)?2:1}</small><span className={"cr-state "+(p.completed?"done":p.locked?"locked":"ready")}>{p.completed?"Completed":p.locked?"Locked":"Available"}</span></div><h2>{p.title}</h2><p>{p.completed?<><CheckCircle2 size={14}/> {p.completed.score}/{p.completed.total} correct <span className="cr-tile-sep">·</span> <Clock3 size={14}/>{elapsed(p.completed.elapsed_seconds)} active time</>:p.locked?"Complete Practice 01 to unlock this test.":<><Clock3 size={14}/>20 minutes <span className="cr-tile-sep">·</span> Saved results & detailed analysis</>}</p></div><button disabled={p.locked||busy} aria-label={(p.completed?"View analysis for ":p.locked?"Locked: ":"Start ")+p.title} onClick={()=>openPassage(p)}>{p.completed?"View Analysis":p.locked?"Locked":"Start"} <ChevronRight size={17}/></button></article>)}</div>
   {!items.length&&!error&&<div className="cr-empty">No published reading materials for this day yet.</div>}
   {draftCount>0&&<p className="cr-draft">{draftCount} passage(s) pending answer-key verification.</p>}
  </section>:result&&review?<ReadingAnalysis passage={passage} review={review} onBack={goBack} onNext={continueAfterReview} nextAvailable={passage.ordinal===1&&!!items.find(p=>p.ordinal===2&&!p.locked)} nextTitle={items.find(p=>p.ordinal===2)?.title}/>:result?<section className="cr-review-loading"><h2>Loading your saved analysis…</h2><p>Your result is recorded. Reopen this practice to load the full explanation.</p><AnimatedBackButton onClick={goBack} ariaLabel="Back to practices"/></section>:<>
   <div className="cr-instructions"><div><small>PRACTICE {String(passage.ordinal).padStart(2,"0")} · DAY {day}</small><h1>{passage.title}</h1><p>{total} questions <span>·</span> 20 minutes <span>·</span> {timer.is_running?"Timer running":timer.started_at?"Paused · Resume to continue":"Press Start when you are ready"}</p></div><div className="cr-tools"><span className="cr-highlight-guide"><Highlighter size={15}/> Select text for yellow highlight</span></div></div>
   <div className="cr-mobile-tabs"><button className={tab==="passage"?"active":""} onClick={()=>setTab("passage")}>Passage</button><button className={tab==="questions"?"active":""} onClick={()=>setTab("questions")}>Questions</button></div>
   <div className="cr-split"><section style={{display:tab==="questions"?"var(--cr-hide-passage)":"block"}} className="cr-pane cr-passage" ref={passageRef} onMouseUp={showHighlightMenu} onTouchEnd={()=>setTimeout(showHighlightMenu,100)}><h2>{passage.title}</h2>{rows.map((para,i)=><p key={i}>{para}</p>)}</section>
   <section style={{display:tab==="passage"?"var(--cr-hide-questions)":"block"}} className="cr-pane cr-questions" ref={questionsRef} onMouseUp={showHighlightMenu} onTouchEnd={()=>setTimeout(showHighlightMenu,100)}>
    {questionGroups.map((group,gi)=><section className="cr-qgroup" key={gi}><div className="cr-qgroup-head"><h3>Questions {group[0].number}{group.length>1?"–"+group[group.length-1].number:""}</h3>{group[0].instruction&&<p>{group[0].instruction}</p>}</div>
     {group.map(q=><div className="cr-question" key={q.number} id={"question-"+q.number}><div className="cr-question-head"><b>{q.number}</b><span>{q.text}</span></div>
      {q.type==="select"?<select className="cr-gap cr-select" aria-label={"Answer to question "+q.number} disabled={!!result} value={answers[q.number]||""} onChange={e=>setAnswers(a=>({...a,[q.number]:e.target.value}))}><option value="">Select your answer</option>{(q.options||[]).map(opt=><option key={opt} value={optionValue(opt)} disabled={!!q.pair_group&&passage.questions.some(other=>other.number!==q.number&&other.pair_group===q.pair_group&&answers[other.number]===optionValue(opt))}>{opt}</option>)}</select>:q.type==="tfng"?<div className="cr-options">{(q.options?.length?q.options:["TRUE","FALSE","NOT GIVEN"]).map(opt=><label key={opt}><input type="radio" disabled={!!result} checked={answers[q.number]===opt} onChange={()=>setAnswers(a=>({...a,[q.number]:opt}))}/><span className="cr-radio"/>{opt}</label>)}</div>:q.type==="mcq"?<div className="cr-options">{(q.options||[]).map(opt=><label key={opt}><input type="radio" disabled={!!result} checked={answers[q.number]===opt[0]} onChange={()=>setAnswers(a=>({...a,[q.number]:opt[0]}))}/><span className="cr-radio"/>{opt}</label>)}</div>:<input className="cr-gap" type="text" placeholder="Your answer" autoComplete="off" spellCheck={false} disabled={!!result} value={answers[q.number]||""} onChange={e=>setAnswers(a=>({...a,[q.number]:e.target.value}))}/>}
     </div>)}</section>)}</section></div>
   <footer className="cr-footer"><span className="cr-footer-label">QUESTION NAVIGATION</span><div className="cr-number-strip" aria-label="Question navigation">{passage.questions.map(q=><button key={q.number} className={answers[q.number]?"answered":""} onClick={()=>{setTab("questions");setTimeout(()=>document.getElementById("question-"+q.number)?.scrollIntoView({behavior:"smooth",block:"center"}),20)}}>{q.number}</button>)}</div><span className="cr-answer-count">{answered+" / "+total+" answered"}</span><button className="cr-submit" disabled={busy||!timer.started_at} onClick={()=>submit(false)}><Send size={15}/> {busy?"Submitting…":"Submit"}</button></footer>
  </>}
  {selectionMenu&&passage&&!result&&<div className="cr-highlight-menu" style={{left:selectionMenu.x,top:selectionMenu.y}} onMouseDown={e=>e.preventDefault()} role="toolbar" aria-label="Highlight selected text"><button aria-label="Yellow highlight" title="Highlight yellow" onClick={()=>applyHighlight("yellow")}><i className="swatch yellow"/></button><span className="cr-menu-sep"/><button aria-label="Remove highlight" title="Remove highlight" onClick={()=>applyHighlight("erase")}><Eraser size={17}/></button></div>}
  {error&&<div className="cr-error" role="alert">{error}<button onClick={()=>setError("")}>×</button></div>}
  <style jsx global>{`
  ::highlight(ark-reading-yellow){background:#ffe58a;color:inherit}
  .cr-qgroup-head p{white-space:pre-line}
  .cr-select{cursor:pointer;background:white;max-width:calc(100% - 43px);font-size:14px;line-height:1.5;min-height:42px}
  .cr-daily-completed{display:flex;align-items:center;gap:12px;border:1px solid #cde9d8;background:#f0faf4;border-radius:10px;padding:16px 18px;margin:18px 0;color:#267b53}.cr-daily-completed b{font-size:13px}.cr-daily-completed p{font-size:12px;color:#58936e;margin:4px 0 0}.cr-review-loading{padding:40px 20px;max-width:600px;margin:auto}.cr-review-loading button{padding:11px 15px;border:none;border-radius:8px;background:#6252d9;color:#fff}
  .cr-shell{--cr-hide-passage:block;--cr-hide-questions:block;min-height:100vh;background:#fff;font:15px/1.55 Arial,"Lato",sans-serif;color:#121820;display:flex;flex-direction:column}
  .cr-header{height:62px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e7e9ed;padding:0 23px;gap:15px}
  .cr-header strong{letter-spacing:.08em;font-size:12px}.cr-header strong span{color:#7c8593;font-weight:500}.cr-back{display:flex;gap:7px;align-items:center;text-decoration:none;color:#4a5360;font-size:12px}.cr-timer{display:flex;align-items:center;gap:7px;font-weight:800;font-variant-numeric:tabular-nums}
  .cr-picker{width:min(840px,calc(100% - 30px));margin:48px auto}.cr-kicker,.cr-instructions small{color:#d73541;font-size:12px;font-weight:800;letter-spacing:.08em}.cr-picker h1{font-size:34px;letter-spacing:-.03em;margin:8px 0}.cr-picker>p{color:#647083;margin:0 0 28px}.cr-tile{border:1px solid #e5e8ed;border-radius:14px;display:flex;align-items:center;gap:20px;padding:24px;margin:15px 0;box-shadow:0 4px 20px #10182807}.cr-tile-icon{width:50px;height:50px;border-radius:12px;background:#f0f2f8;color:#4e5d80;display:grid;place-items:center;flex-shrink:0}.cr-tile>div:nth-child(2){flex:1}.cr-tile small{color:#758095;font-size:11px;font-weight:700}.cr-tile h2{margin:5px 0;font-size:20px}.cr-tile p{margin:0;color:#16815c}.cr-tile button,.cr-submit{border:0;border-radius:8px;background:#1a202b;color:white;display:flex;align-items:center;gap:5px;padding:11px 16px;font-weight:700;cursor:pointer}.cr-tile button:disabled{background:#e4e8ee;color:#8190a3;cursor:not-allowed}.cr-draft,.cr-empty{color:#8d6740!important;margin-top:18px!important}.cr-instructions{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 24px;border-bottom:1px solid #e5e8ee;background:#f7f8fa}.cr-instructions h1{font-size:19px;margin:0 0 2px}.cr-instructions p{color:#586777;margin:0;font-size:13px}.cr-tools{display:flex;gap:6px}.cr-tools button{background:#fff;border:1px solid #dce2e9;padding:8px 9px;display:flex;align-items:center;gap:6px;border-radius:6px;font-size:12px;cursor:pointer}.cr-tools .cr-on{border-color:#e9bd44;background:#fff7dd}.cr-color{display:inline-block;width:12px;height:12px;border-radius:3px}.cr-color.yellow{background:#ffe785}.cr-color.green{background:#b5f0cd}
  .cr-split{height:calc(100vh - 62px - 82px - 62px);display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:14px 20px;background:#fff}.cr-pane{border:1px solid #e0e5ed;border-radius:7px;overflow-y:auto;min-height:0;padding:25px 28px;scrollbar-color:#aeb9c8 #fff;scrollbar-width:thin}.cr-passage{font:16px/1.8 Georgia,"Times New Roman",serif}.cr-passage h2{font:700 23px/1.25 Arial,sans-serif;margin:0 0 25px}.cr-passage p{margin:0 0 23px;white-space:pre-wrap}.cr-questions{font-size:15px}.cr-qgroup{margin:0 0 30px}.cr-qgroup-head{margin:0 0 22px}.cr-qgroup-head h3{font-size:20px;margin:0 0 8px}.cr-qgroup-head p{font-size:14px;line-height:1.55;margin:0;color:#4f5a69;max-width:760px}.cr-question{padding:0 0 21px;margin:0 0 21px;border-bottom:1px solid #ecedf0}.cr-question-head{display:flex;align-items:flex-start;gap:12px}.cr-question-head b{border:1px solid #d8dee8;border-radius:4px;padding:4px 10px}.cr-question-head span{padding-top:4px;white-space:pre-line}.cr-options{display:grid;gap:12px;margin:16px 0 0 42px}.cr-options label{display:flex;align-items:center;gap:10px;cursor:pointer;position:relative}.cr-options input{position:absolute;opacity:0;pointer-events:none}.cr-radio{width:18px;height:18px;border:1.5px solid #ef535b;border-radius:50%;display:grid;place-items:center;flex:0 0 18px}.cr-options input:checked+.cr-radio:after{content:"";width:8px;height:8px;border-radius:50%;background:#ef535b}.cr-gap{display:block;margin:14px 0 0 43px;border:1px solid #b4bdc9;border-radius:5px;padding:7px 10px;min-width:190px;font-weight:600}.cr-correct{display:block;margin:10px 0 0 42px;color:#167a50}.cr-footer{position:sticky;bottom:0;min-height:62px;padding:8px 22px;display:flex;align-items:center;justify-content:space-between;border-top:1px solid #e3e7ed;background:white;gap:12px}.cr-number-strip{display:flex;gap:4px;overflow-x:auto;max-width:min(52vw,650px);scrollbar-width:none}.cr-number-strip::-webkit-scrollbar{display:none}.cr-number-strip button{width:29px;height:29px;flex:0 0 29px;border:1px solid #dbe0e5;border-radius:4px;background:#fff;font-size:12px;cursor:pointer}.cr-number-strip button.answered{border-color:#687586;background:#f2f4f7;font-weight:800}.cr-answer-count{font-size:12px;color:#647083;white-space:nowrap}.cr-back-btn{border:0;background:none;color:#536071;cursor:pointer}.cr-error{position:fixed;right:20px;bottom:78px;max-width:400px;border:1px solid #ffc1c1;background:#fff1f1;color:#9c2020;padding:15px;border-radius:9px;box-shadow:0 9px 30px #0001}.cr-error button{float:right;background:none;border:0;font-size:22px;margin-left:12px}.cr-mobile-tabs{display:none}
  @media(max-width:780px){.cr-header{padding:0 12px;height:58px}.cr-header strong span{display:none}.cr-instructions{padding:10px 12px;align-items:flex-start}.cr-instructions h1{font-size:16px}.cr-instructions p{font-size:12px}.cr-tools button{font-size:0}.cr-tools button span{font-size:0}.cr-tools .cr-color{font-size:0}.cr-mobile-tabs{display:flex;gap:5px;background:#eff1f4;padding:5px 10px}.cr-mobile-tabs button{flex:1;border:0;border-radius:6px;padding:7px;background:transparent}.cr-mobile-tabs .active{background:white;font-weight:800}.cr-split{height:calc(100dvh - 58px - 100px - 46px - 62px);display:block;padding:7px 10px}.cr-shell:has(.cr-mobile-tabs .active:first-child){--cr-hide-questions:none;--cr-hide-passage:block}.cr-shell:has(.cr-mobile-tabs .active:last-child){--cr-hide-passage:none;--cr-hide-questions:block}.cr-pane{height:100%;padding:20px 15px}.cr-picker{margin:28px auto}.cr-tile{padding:14px;gap:11px}.cr-tile-icon{width:38px;height:38px}.cr-tile h2{font-size:15px}.cr-tile button{padding:7px 9px}.cr-footer{padding:6px 8px;gap:7px}.cr-back-btn{display:none}.cr-answer-count{display:none}.cr-number-strip{max-width:calc(100vw - 126px)}.cr-submit{padding:9px 10px;font-size:12px}.cr-passage{font-size:16px}}
  
  /* Matched to 60-Day Challenge: Manrope, restrained borders, purple and gold. */
  .cr-shell{font-family:Manrope,Inter,ui-sans-serif,system-ui,sans-serif;background:#fafbff;color:#24263b}
  .cr-header{position:relative;display:grid;grid-template-columns:1fr minmax(230px,1fr) 1fr;background:#fff;border-bottom-color:#e9e8f4;height:72px;z-index:6}
  .cr-head-start{justify-self:start}.cr-head-center{justify-self:center}.cr-head-end{justify-self:end;display:flex;align-items:center;gap:14px;font-size:11px;letter-spacing:.11em;color:#73708d}.cr-head-end b{color:#302d4f}
  .cr-head-center strong{font-size:11px;letter-spacing:.14em;color:#3b3654}
  .cr-head-center strong span{color:#9691b0}
  .cr-head-start{min-width:0}
  .cr-timer-controls{display:flex;align-items:center;justify-content:center;gap:15px}
  .cr-time{display:flex;gap:9px;align-items:center;font-size:21px;font-weight:800;font-variant-numeric:tabular-nums;color:#292641;letter-spacing:-.04em}
  .cr-play,.cr-pause{border:1px solid #e7e4f7;border-radius:8px;padding:9px 13px;display:flex;gap:7px;align-items:center;font-size:12px;font-weight:800;cursor:pointer}.cr-play{background:#6654d9;color:#fff}.cr-pause{background:#fff9e7;color:#795b16;border-color:#f3dfa9}.cr-play:disabled,.cr-pause:disabled{opacity:.55}
  .cr-fullscreen{display:grid;place-items:center;background:#f5f4fc;border:1px solid #e9e7f4;border-radius:7px;padding:8px;color:#6252d9;cursor:pointer}
  .cr-picker{margin:50px auto}.cr-kicker,.cr-instructions small{color:#7260d7}
  .cr-picker h1{font-weight:850;letter-spacing:-.045em;color:#24233e}
  .cr-tile{box-shadow:0 5px 21px #29205008;border-color:#e9e7f1;border-radius:13px}
  .cr-tile-icon{color:#6555d9;background:#f2efff;border-radius:10px}
  .cr-tile button,.cr-submit{background:#6252d9;border-radius:8px}
  .cr-tile small{color:#726f8d;font-weight:850;letter-spacing:.07em}
  .cr-tile h2{color:#282640;letter-spacing:-.025em;font-weight:850}
  .cr-instructions{background:#fff;border-bottom-color:#ebe9f2}
  .cr-instructions h1{font-weight:850;letter-spacing:-.035em;color:#26233f}
  .cr-highlight-guide{display:inline-flex;align-items:center;gap:7px;font-size:11px;color:#77718f;background:#f7f5ff;border:1px solid #ebe7ff;border-radius:9px;padding:8px 12px}
  .cr-split{height:calc(100dvh - 72px - 77px - 74px);padding:13px 16px;gap:13px;background:#fafbff}
  .cr-pane{border-color:#e7e6f1;background:#fff;border-radius:10px;padding:26px 30px}
  .cr-passage{font:16px/1.8 "Palatino Linotype",Palatino,Georgia,serif;letter-spacing:.005em}
  .cr-passage h2{font:800 22px/1.35 Manrope,system-ui,sans-serif;letter-spacing:-.03em}
  .cr-questions{font-family:Manrope,system-ui,sans-serif}
  .cr-qgroup-head h3{color:#2c264c;font-weight:850;letter-spacing:-.02em}
  .cr-question-head b{border-color:#ddd9ee;background:#faf9fe;color:#6655d1}
  .cr-options label{font-size:13px;line-height:1.55}
  .cr-options input:focus-visible+.cr-radio{outline:3px solid #cfc5ff;outline-offset:2px}
  .cr-gap:focus{outline:3px solid #ded6ff;border-color:#8d7bdc}
  .cr-footer{background:#fff;min-height:74px;border-top-color:#e9e7f3}
  .cr-number-strip button.answered{background:#f1edff;border-color:#aa9eea;color:#5545b5}
  .cr-highlight-menu{position:fixed;z-index:100;transform:translateX(-50%);background:#fff;border:1px solid #dcd9ea;box-shadow:0 12px 35px #29204428;border-radius:12px;display:flex;align-items:center;gap:3px;padding:5px}
  .cr-highlight-menu button{width:37px;height:34px;background:#fff;border:0;border-radius:8px;display:grid;place-items:center;cursor:pointer;color:#55506f}
  .cr-highlight-menu button:hover{background:#f5f2ff}
  .cr-highlight-menu .swatch{width:23px;height:17px;border-radius:3px;display:block;border:1px solid #0000000e}
  .cr-highlight-menu .yellow{background:#ffe785}.cr-highlight-menu .green{background:#b5f0cd}
  .cr-menu-sep{height:24px;width:1px;background:#e9e7f2;margin:0 3px}
  @media(max-width:780px){.cr-header{height:62px;padding:0 10px;grid-template-columns:108px minmax(0,1fr) 30px;gap:5px}.cr-head-start .ark-back-control{width:108px;height:44px;font-size:12px}.cr-head-start .ark-back-icon{width:34px;height:36px}.cr-head-start .ark-back-label{transform:translateX(10px)}.cr-head-end>span{display:none}.cr-time{font-size:18px}.cr-timer-controls{gap:7px}.cr-play,.cr-pause{padding:8px 9px;font-size:11px}.cr-highlight-guide{font-size:10px;padding:5px 7px}.cr-split{height:calc(100dvh - 62px - 108px - 46px - 64px)}.cr-pane{padding:19px 14px}.cr-passage{font-size:16px}.cr-picker{margin:24px auto}.cr-picker h1{font-size:27px}.cr-tile{gap:11px}.cr-tile h2{font-size:15px}.cr-head-center strong{font-size:10px}.cr-fullscreen{padding:6px}}

  /* Premium Reading internals, aligned with ARK Challenge */
  .cr-shell{background:#f8f9fd;color:#28263d}
  .cr-header{height:60px;grid-template-columns:minmax(125px,1fr) minmax(0,1fr) minmax(125px,1fr);padding:0 22px;gap:10px}
  .cr-head-start,.cr-head-center,.cr-head-end{min-width:0}
  .cr-head-day,.cr-head-practice{display:inline-flex;align-items:center;gap:5px;border:1px solid #ece9f8;background:#f8f7fd;border-radius:8px;padding:8px 10px;white-space:nowrap;font-size:10px;color:#786d9a;font-weight:800;letter-spacing:.06em}.cr-head-day b{color:#aaa1bb}
  .cr-timer-controls{gap:10px}.cr-time{font-size:20px}.cr-play,.cr-pause{min-height:35px;padding:8px 12px}.cr-fullscreen{width:35px;height:35px;min-width:35px;padding:7px}
  .cr-picker{width:min(960px,calc(100% - 32px));margin:32px auto 54px}.cr-picker-intro{display:grid;grid-template-columns:minmax(0,1fr) 188px;gap:22px;align-items:start;margin-bottom:16px}
  .cr-picker h1{font-size:clamp(28px,3vw,37px);margin:8px 0;line-height:1.15}
  .cr-picker-copy>p{font-size:12px;max-width:590px;line-height:1.7;color:#77748e;margin:0}
  .cr-picker-chips{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-top:16px}
  .cr-picker-chips>span{display:inline-flex;align-items:center;gap:5px;background:#fff;border:1px solid #eae7f5;border-radius:7px;padding:7px 9px;color:#776e90;font-size:10px;font-weight:750}
  .cr-picker-chips .cr-preview-chip{background:#eaf8f0;border-color:#d2eadc;color:#2d805a}
  .cr-picker-progress{background:#fff;border:1px solid #e9e6f3;border-radius:12px;padding:13px 15px;box-shadow:0 5px 20px #2e245007}
  .cr-picker-progress>span{display:block;color:#928ca6;font-size:9px;letter-spacing:.11em;font-weight:850}
  .cr-picker-progress>strong{display:block;font-size:30px;line-height:1.4;color:#322d50;letter-spacing:-.05em}.cr-picker-progress>strong small{font-size:13px;color:#a9a3ba}
  .cr-progress-rail{height:5px;overflow:hidden;border-radius:20px;background:#efebfa}.cr-progress-rail i{display:block;height:100%;border-radius:20px;background:#6655d8;transition:width .2s}
  .cr-picker-progress>small{display:block;font-size:9px;color:#aaa3b9;margin-top:8px}
  .cr-practice-list{display:grid;gap:11px}
  .cr-tile{min-height:108px;margin:0;padding:18px 20px;gap:17px;border-radius:12px;box-shadow:0 4px 18px #2e245006;transition:border-color .18s,box-shadow .18s}
  .cr-tile.cr-ready:hover,.cr-tile.cr-complete:hover{border-color:#b5a9ec;box-shadow:0 8px 24px #6252d916}
  .cr-tile-icon{width:44px;height:44px;border-radius:10px}.cr-tile-icon svg{width:22px;height:22px}
  .cr-tile-body{min-width:0;flex:1}.cr-tile-meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .cr-tile small{font-size:9px;letter-spacing:.09em}
  .cr-state{border-radius:30px;padding:5px 8px;font-size:9px;font-weight:850;letter-spacing:.04em;background:#f1efff;color:#6655cb}
  .cr-state.done{background:#e9f8f0;color:#298155}.cr-state.locked{background:#f5f5f8;color:#9791a3}
  .cr-tile h2{font-size:17px;margin:8px 0 7px}
  .cr-tile p{font-size:11px!important;color:#888399!important;display:flex;align-items:center;gap:5px;flex-wrap:wrap}
  .cr-tile.cr-complete p{color:#32805b!important}.cr-tile-sep{color:#c4bed0;padding:0 3px}
  .cr-tile button{min-height:40px;border-radius:8px;font-size:11px;padding:11px 13px;white-space:nowrap}
  .cr-tile button:not(:disabled):hover,.cr-submit:hover:not(:disabled){background:#5342c6}
  .cr-tile.cr-locked{background:#fcfcfe}.cr-tile.cr-locked button{background:#f4f3f8;color:#a19bae;border:1px solid #e9e7ef}
  .cr-daily-completed{margin:0 0 12px;padding:13px 15px}
  .cr-instructions{min-height:74px;padding:11px 19px}.cr-instructions h1{font-size:18px;margin:3px 0}.cr-instructions p{font-size:11px;color:#8b849e}.cr-instructions p span{color:#bbb3d0;padding:0 4px}
  .cr-highlight-guide{font-size:10px;border-radius:8px}
  .cr-split{height:calc(100dvh - 60px - 74px - 60px);padding:11px 13px;gap:12px}
  .cr-pane{padding:24px 26px;border-radius:11px}.cr-questions{font-size:13px}.cr-question-head span{font-size:13px;line-height:1.7}
  .cr-question-head b{border-radius:6px}.cr-radio{border-color:#8577d7}.cr-options input:checked+.cr-radio:after{background:#6a59d3}
  .cr-footer{min-height:60px;padding:8px 16px;gap:12px}.cr-footer-label{font-size:9px;color:#9d95b4;letter-spacing:.09em;font-weight:850;white-space:nowrap}
  .cr-number-strip{flex:1;justify-content:center;max-width:calc(100vw - 380px);gap:5px}.cr-number-strip button{width:30px;height:30px;flex-basis:30px;border-radius:7px}
  .cr-submit{min-height:36px;font-size:11px;padding:10px 14px;white-space:nowrap}
  @media(max-width:800px){
   .cr-header{height:56px;padding:0 9px;grid-template-columns:110px minmax(0,1fr) 34px;gap:4px}
   .cr-head-start .ark-back-control{width:110px!important;height:36px!important;font-size:11px!important}
   .cr-head-start .ark-back-icon{width:29px!important;height:30px!important}
   .cr-head-start .ark-back-label{font-size:11px!important;transform:translateX(10px)!important}
   .cr-head-center strong{font-size:9px;letter-spacing:.04em}.cr-head-center strong span{display:none}
   .cr-head-day,.cr-head-practice{display:none}.cr-timer-controls{gap:5px}.cr-time{font-size:15px;gap:3px}.cr-time svg{width:13px}
   .cr-play,.cr-pause{min-height:32px;padding:7px 8px;font-size:10px;gap:4px}
   .cr-fullscreen{width:32px;height:32px;min-width:32px;padding:5px}
   .cr-picker{margin:20px auto 38px;width:calc(100% - 22px)}.cr-picker-intro{grid-template-columns:1fr;gap:12px}
   .cr-picker h1{font-size:27px}.cr-picker-chips{margin-top:12px}.cr-picker-progress{display:none}
   .cr-tile{min-height:88px;padding:13px 11px;gap:10px}.cr-tile-icon{width:36px;height:36px}.cr-tile-icon svg{width:19px}
   .cr-tile-meta{gap:5px}.cr-tile small{font-size:8px}.cr-state{font-size:8px;padding:4px 7px}
   .cr-tile h2{font-size:14px;margin:5px 0}.cr-tile p{font-size:10px!important}
   .cr-tile button{min-height:35px;padding:8px;font-size:10px}
   .cr-instructions{min-height:73px;padding:9px 11px}.cr-instructions h1{font-size:15px}.cr-instructions p{font-size:10px}.cr-highlight-guide{display:none}
   .cr-mobile-tabs{height:40px;align-items:center;background:#f6f4fc;padding:4px 8px}
   .cr-mobile-tabs button{height:31px;color:#9089a1;font-size:11px}.cr-mobile-tabs .active{color:#6654d8}
   .cr-split{height:calc(100dvh - 56px - 73px - 40px - 56px);padding:6px 8px}
   .cr-pane{padding:15px 14px}.cr-footer{min-height:56px;padding:6px 8px;gap:6px}
   .cr-footer-label,.cr-answer-count{display:none}.cr-number-strip{justify-content:flex-start;max-width:calc(100vw - 101px)}.cr-number-strip button{width:29px;height:29px;flex-basis:29px}
   .cr-submit{min-height:35px;padding:8px 9px}
  }

  /* The Reading entry is a Dashboard workspace; the actual exam stays distraction-free CDI. */
  .cr-shell{background:#fdfcf9;color:#142338}
  .cr-shell.cr-overview{display:grid;grid-template-columns:250px minmax(0,1fr);grid-template-rows:67px minmax(0,1fr);min-height:100dvh;background:linear-gradient(180deg,#fff,#fffcf8 35%,#fdfcf9)}
  .cr-overview>.ch-sidebar{grid-column:1;grid-row:1/3}
  .cr-overview>.cr-header{grid-column:2;grid-row:1}
  .cr-overview>.cr-picker{grid-column:2;grid-row:2;min-width:0;align-self:start}
  .cr-header{height:67px;padding:0 clamp(13px,2vw,30px);background:#fff;border-bottom:1px solid #e4e9ef}
  .cr-head-center strong{color:#142740}.cr-head-center strong span{color:#95723c}
  .cr-head-day,.cr-head-practice{background:#fff9ed;border-color:#f0e3cf;color:#785a2b}
  .cr-head-day b{color:#92774e}
  .cr-picker{width:min(1110px,calc(100% - 42px));margin:30px auto 65px}
  .cr-kicker,.cr-instructions small{color:#956e30;font-weight:900;letter-spacing:.12em}
  .cr-picker h1{font:700 clamp(35px,3.2vw,48px)/1.13 Georgia,"Times New Roman",serif;color:#142740;letter-spacing:-.05em}
  .cr-picker-copy>p{color:#5b7088;font-size:12px;max-width:700px}
  .cr-picker-intro{grid-template-columns:minmax(0,1fr) 192px;min-height:142px;position:relative;isolation:isolate;align-items:center}
  .cr-picker-intro:before{content:"";position:absolute;z-index:-1;pointer-events:none;right:155px;top:-12px;width:min(57%,530px);height:160px;background:url("/ark-hero-landscape.svg") right top/contain no-repeat;opacity:.55}
  .cr-picker-chips>span{color:#546983;background:#fff;border-color:#e3e8ef}
  .cr-picker-chips>span svg{color:#b08743}
  .cr-picker-chips .cr-preview-chip{background:#eaf6ef;color:#34785a;border-color:#cee7d9}
  .cr-picker-progress{background:linear-gradient(125deg,#fff,#fff9f0);border-color:#f0e4d2;box-shadow:0 5px 17px #1c2e4605}
  .cr-picker-progress>span{color:#8f6e39}
  .cr-picker-progress>strong{color:#142740;font:700 36px Georgia,"Times New Roman",serif}
  .cr-picker-progress>strong small{font:750 13px Manrope,system-ui,sans-serif;color:#7589a2}
  .cr-progress-rail{background:#e7eaf0}.cr-progress-rail i{background:linear-gradient(90deg,#142740,#b48a45)}
  .cr-picker-progress>small{color:#677990}
  .cr-tile{border:1px solid #e3e8ef;background:#fff;box-shadow:0 5px 19px #1c334b07}
  .cr-tile.cr-ready:hover,.cr-tile.cr-complete:hover{border-color:#b8cad9;box-shadow:0 8px 22px #1c334b11}
  .cr-tile-icon{background:#eaf2ff;color:#29517d}
  .cr-tile.cr-complete .cr-tile-icon{background:#eaf7ef;color:#308057}
  .cr-tile small{color:#70849b}
  .cr-state{background:#fff2df;color:#8a6428}.cr-state.done{background:#eaf7ee;color:#29764d}.cr-state.locked{background:#f3f5f8;color:#8190a1}
  .cr-tile h2{color:#142740;font:700 22px Georgia,"Times New Roman",serif}
  .cr-tile p{color:#60758c!important}.cr-tile.cr-complete p{color:#328055!important}
  .cr-tile button,.cr-submit{background:#142740;color:#fff;border:1px solid #142740}
  .cr-tile button:not(:disabled):hover,.cr-submit:hover:not(:disabled){background:#29496a;border-color:#29496a}
  .cr-tile.cr-locked button{background:#f5f7fa!important;color:#7e8b9e;border-color:#e3e8ef}
  .cr-instructions{background:#fff;border-bottom-color:#e4e9ef}
  .cr-instructions h1{color:#172d47}
  .cr-instructions p{color:#5c718b}
  .cr-highlight-guide{background:#fffaf0;border:1px solid #eee2cd;color:#8a6a37}
  .cr-play{background:#142740;border-color:#142740}
  .cr-play:not(:disabled):hover{background:#29496b}
  .cr-pause{background:#fff5df;color:#825e23;border-color:#f1e0b9}
  .cr-time{color:#142740}
  .cr-fullscreen{color:#344f70;background:#f4f7fa;border-color:#e3e8ef}
  .cr-split{background:#f8fafc}
  .cr-pane{border-color:#dde5ed;background:#fff}
  .cr-passage h2{color:#142740}
  .cr-qgroup-head h3{color:#142740}
  .cr-qgroup-head p{color:#536880}
  .cr-question{border-bottom-color:#e7edf2}
  .cr-question-head b{background:#edf3f9;color:#21486d;border-color:#dce6f0}
  .cr-radio{border-color:#66809d}.cr-options input:checked+.cr-radio:after{background:#142740}
  .cr-options input:focus-visible+.cr-radio{outline:3px solid #d8b67d}
  .cr-gap:focus{outline:3px solid #e2d0ab;border-color:#b08c4d}
  .cr-footer{border-top-color:#e1e8ee;background:#fff}
  .cr-footer-label{color:#627996}
  .cr-number-strip button.answered{border-color:#adc2d4;background:#eaf2fa;color:#234a73}
  .cr-mobile-tabs{background:#f1f5f9}
  .cr-mobile-tabs .active{color:#173858}
  @media(min-width:851px) and (max-width:1150px){.cr-shell.cr-overview{grid-template-columns:210px minmax(0,1fr)}}
  @media(max-width:850px){
   .cr-shell.cr-overview{display:flex;flex-direction:column;min-height:100dvh}
   .cr-overview>.ch-sidebar{display:none}
   .cr-overview>.cr-header{width:100%;flex:none}
   .cr-overview>.cr-picker{width:calc(100% - 22px);margin:20px auto 42px}
   .cr-header{height:56px;padding:0 10px}
   .cr-picker-intro{grid-template-columns:1fr;gap:12px;min-height:0}
   .cr-picker-intro:before{right:-50px;width:85%;opacity:.25}
   .cr-picker h1{font-size:32px}
   .cr-picker-progress{display:none}
   .cr-tile h2{font-size:17px}
   .cr-instructions h1{font-size:15px}
   .cr-split{height:calc(100dvh - 56px - 73px - 40px - 56px)}
  }

  /* Shared CDI reading accessibility: applied to every current and future passage. */
  .cr-shell:not(.cr-overview){background:#f5f4ef;color:#172b45}
  .cr-shell:not(.cr-overview) .cr-instructions{background:#fbfaf6;border-bottom:1px solid #d9dfe6}
  .cr-shell:not(.cr-overview) .cr-split{background:#f1f2ef}
  .cr-shell:not(.cr-overview) .cr-pane{background:#fffdf8;border:1px solid #ccd5df;box-shadow:0 3px 13px #1e334b0b}
  .cr-shell:not(.cr-overview) .cr-passage{color:#1c2c3f;line-height:1.88}
  .cr-shell:not(.cr-overview) .cr-passage h2{color:#142740;font-weight:800}
  .cr-shell:not(.cr-overview) .cr-qgroup-head{padding-bottom:12px;border-bottom:1px solid #e1e5e8;margin-bottom:18px}
  .cr-shell:not(.cr-overview) .cr-qgroup-head h3{color:#142740;font-size:19px;font-weight:850;line-height:1.4}
  .cr-shell:not(.cr-overview) .cr-qgroup-head p{font-size:14px;font-weight:550;line-height:1.7;color:#40546b}
  .cr-shell:not(.cr-overview) .cr-question{margin-bottom:19px;padding-bottom:20px;border-bottom:1px solid #dfe5e8}
  .cr-shell:not(.cr-overview) .cr-question-head{gap:12px;align-items:flex-start}
  .cr-shell:not(.cr-overview) .cr-question-head b{min-width:34px;min-height:34px;display:grid;place-items:center;padding:5px 8px;border-radius:7px;background:#eaf2fa;border:1px solid #bfd0e0;color:#142740;font-size:14px;font-weight:850}
  .cr-shell:not(.cr-overview) .cr-question-head span{padding-top:2px;font-size:16px;font-weight:600;line-height:1.75;color:#172b45;letter-spacing:0;white-space:pre-line}
  .cr-shell:not(.cr-overview) .cr-options{margin-top:14px;gap:10px}
  .cr-shell:not(.cr-overview) .cr-options label{font-size:14px;line-height:1.55;font-weight:600;color:#243850;padding:4px 0}
  .cr-shell:not(.cr-overview) .cr-options label:hover{color:#142740}
  .cr-shell:not(.cr-overview) .cr-radio{border-color:#7189a1;background:#fffdf8}
  .cr-shell:not(.cr-overview) .cr-options input:checked+.cr-radio{border-color:#142740}
  .cr-shell:not(.cr-overview) .cr-gap{min-height:44px;padding:9px 12px;background:#fff;border:1.5px solid #9dafc2;border-radius:7px;color:#172b45;font-size:15px;font-weight:650}
  .cr-shell:not(.cr-overview) .cr-gap::placeholder{color:#718297;font-weight:500}
  .cr-shell:not(.cr-overview) .cr-gap:focus{outline:3px solid #ffe58a;border-color:#b88e42}
  .cr-shell:not(.cr-overview) .cr-highlight-guide{background:#fff3d6;border:1px solid #ebd7a6;color:#76541e;font-weight:800}
  .cr-shell:not(.cr-overview) .cr-highlight-menu{border-color:#d8c69e;background:#fffdf8}
  .cr-shell:not(.cr-overview) .cr-highlight-menu .yellow{background:#ffe58a}
  .cr-shell:not(.cr-overview) .cr-number-strip button.answered{background:#e9f5eb;border-color:#a8d1b5;color:#245b40;font-weight:850}
  .cr-shell:not(.cr-overview) .cr-footer{background:#fbfaf6;border-top:1px solid #dce3e9}
  @media(max-width:800px){
   .cr-shell:not(.cr-overview) .cr-qgroup-head h3{font-size:17px}
   .cr-shell:not(.cr-overview) .cr-qgroup-head p{font-size:13px}
   .cr-shell:not(.cr-overview) .cr-question-head span{font-size:15px;line-height:1.7}
   .cr-shell:not(.cr-overview) .cr-question-head b{min-width:32px;min-height:32px}
   .cr-shell:not(.cr-overview) .cr-gap{font-size:16px;max-width:calc(100% - 40px)}
   .cr-shell:not(.cr-overview) .cr-options label{font-size:14px}
  }
`}</style>
 </main>;
}