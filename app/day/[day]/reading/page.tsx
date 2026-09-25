"use client";
import Link from "next/link";
import {useParams} from "next/navigation";
import {useEffect,useRef,useState} from "react";
import {BookOpen,CheckCircle2,LockKeyhole,ChevronRight,ArrowLeft,Clock3,Highlighter,Send,Play,Pause,Maximize2,Minimize2,Eraser} from "lucide-react";

type Q={number:number,type:"tfng"|"gap"|"mcq",text:string,options?:string[],instruction?:string};
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
 async function goBack(){if(passage&&!result&&timer.is_running){await setRunning("pause")};setPassage(null);setResult(null);setTimer(initialTimer);clearHighlights()}
 async function toggleFullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{setError("Your browser does not allow fullscreen here. Use your browser's fullscreen control.")}}
 function clearHighlights(){const h=window.CSS?.highlights;if(h){h.delete("ark-reading-yellow");h.delete("ark-reading-green")}selectionRef.current=null;setSelectionMenu(null)}
 function showHighlightMenu(){
  const s=window.getSelection();if(!s||s.isCollapsed||!s.rangeCount)return;
  const r=s.getRangeAt(0);if(!passageRef.current?.contains(r.commonAncestorContainer)&&!questionsRef.current?.contains(r.commonAncestorContainer))return;
  const rect=r.getBoundingClientRect();selectionRef.current=r.cloneRange();
  setSelectionMenu({x:Math.min(window.innerWidth-112,Math.max(112,rect.left+rect.width/2)),y:Math.max(66,rect.top-54)});
 }
 function applyHighlight(shade:"yellow"|"green"|"erase"){
  const range=selectionRef.current,h=window.CSS?.highlights;
  if(!range||!h){setError("Please use an updated Chrome, Edge or Safari for text highlighting.");return}
  if(shade==="erase"){
   for(const key of ["ark-reading-yellow","ark-reading-green"]){const old=h.get(key);if(!old)continue;const keep=Array.from(old).filter(r=>!(r instanceof Range&&r.compareBoundaryPoints(Range.END_TO_START,range)>0&&r.compareBoundaryPoints(Range.START_TO_END,range)<0));if(keep.length)h.set(key,new Highlight(...keep));else h.delete(key)}
  }else{
   const key=shade==="yellow"?"ark-reading-yellow":"ark-reading-green";
   const old=h.get(key);h.set(key,old?new Highlight(...Array.from(old),range.cloneRange()):new Highlight(range.cloneRange()));
  }
  window.getSelection()?.removeAllRanges();selectionRef.current=null;setSelectionMenu(null);
 }
 async function openPassage(p:ListItem){
  if(p.locked||busy)return;
  // Fullscreen must be requested in the actual click gesture, before the first await.
  if(!document.fullscreenElement)document.documentElement.requestFullscreen().catch(()=>{});
  clearHighlights();setBusy(true);setError("");setResult(null);setAnswers({});setTimer(initialTimer);setSelectionMenu(null);
  try{
   const res=await fetch("/api/challenge-reading?action=passage&day="+day+"&id="+encodeURIComponent(p.id),{cache:"no-store"});const obj=await res.json();if(!res.ok)throw new Error(obj.error||"Unable to open");
   setPassage(obj.passage);activeId.current=p.id;
   if(obj.completed){setResult(obj.completed);setTimer(initialTimer)}
   else setTimer(obj.timer||initialTimer);
  }catch(e){setError(String(e))}finally{setBusy(false)}
 }
 async function submit(auto=false){
  if(!passage||busy||result)return;
  if(!auto&&!confirm("Submit this passage? You cannot change your answers afterward."))return;
  setBusy(true);setError("");
  try{
   const res=await fetch("/api/challenge-reading",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"submit",day,passage_id:passage.id,answers})});
   const obj=await res.json();if(!res.ok)throw new Error(obj.error||"Could not save result");setResult(obj.result);setTimer(t=>({...t,is_running:false,active_seconds:obj.result.elapsed_seconds||t.active_seconds,resumed_at:null}));clearHighlights();await loadList();
  }catch(e){setError(String(e))}finally{setBusy(false)}
 }
 // Native CSS highlights never wrap or split text nodes, so layout stays unchanged.
 const total=passage?.questions.length||0,answered=Object.values(answers).filter(Boolean).length;
 const questionGroups:(Q[])[]=[];
 if(passage){for(const q of passage.questions){const last=questionGroups[questionGroups.length-1];if(!last||last[0]?.instruction!==q.instruction)questionGroups.push([q]);else last.push(q);}}
 const left=1200-usedSeconds(timer,now);
 const rows=passage?.text.split(/\n\s*\n/).filter(Boolean)||[];
 return <main className="cr-shell">
  <header className="cr-header">
   <div className="cr-head-start">{passage?<button className="cr-back" onClick={goBack}><ArrowLeft size={17}/> Passages</button>:<Link href={"/day/"+day} className="cr-back"><ArrowLeft size={17}/> Study day</Link>}</div>
   <div className="cr-head-center">{passage&&!result?<div className="cr-timer-controls"><span className="cr-time"><Clock3 size={17}/>{elapsed(left)}</span><button className={timer.is_running?"cr-pause":"cr-play"} disabled={busy||left===0} onClick={()=>setRunning(timer.is_running?"pause":"start")}>{timer.is_running?<Pause size={14}/>:<Play size={14}/>} {timer.is_running?"Pause":timer.started_at?"Resume":"Start"}</button></div>:<strong>ARK EDUCATION <span>· READING CDI</span></strong>}</div>
   <div className="cr-head-end"><span>ARK <b>EDUCATION</b></span>{passage&&<button className="cr-fullscreen" aria-label={fullScreen?"Exit fullscreen":"Enter fullscreen"} onClick={toggleFullscreen}>{fullScreen?<Minimize2 size={18}/>:<Maximize2 size={18}/>}</button>}</div>
  </header>
  {!passage?<section className="cr-picker">
   <span className="cr-kicker">DAY {String(day).padStart(2,"0")} · IELTS READING</span>
   <h1>Today’s Reading</h1><p>Complete the first passage to unlock the second. Each passage is timed and scored separately.</p>
   {items.map(p=><article key={p.id} className={"cr-tile "+(p.locked?"cr-locked":"")}><span className="cr-tile-icon">{p.completed?<CheckCircle2 size={27}/>:p.locked?<LockKeyhole size={27}/>:<BookOpen size={27}/>}</span><div><small>PRACTICE {String(p.ordinal).padStart(2,"0")} · {p.completed?"COMPLETED":p.locked?"LOCKED":"20 MINUTES"}</small><h2>{p.title}</h2>{p.completed&&<p>Score: {p.completed.score}/{p.completed.total} · Time: {elapsed(p.completed.elapsed_seconds)}</p>}</div><button disabled={p.locked||busy} onClick={()=>openPassage(p)}>{p.completed?"View":p.locked?"Locked":"Start"} <ChevronRight size={17}/></button></article>)}
   {!items.length&&!error&&<div className="cr-empty">No published reading materials for this day yet.</div>}
   {draftCount>0&&<p className="cr-draft">{draftCount} passage(s) pending answer-key verification.</p>}
  </section>:<>
   <div className="cr-instructions"><div><small>PRACTICE {String(passage.ordinal).padStart(2,"0")} · DAY {day}</small><h1>{passage.title}</h1><p>{total} questions · 20 minutes · Select text to highlight</p></div><div className="cr-tools"><span className="cr-highlight-guide"><Highlighter size={15}/> Select text for highlight</span></div></div>
   <div className="cr-mobile-tabs"><button className={tab==="passage"?"active":""} onClick={()=>setTab("passage")}>Passage</button><button className={tab==="questions"?"active":""} onClick={()=>setTab("questions")}>Questions</button></div>
   <div className="cr-split"><section style={{display:tab==="questions"?"var(--cr-hide-passage)":"block"}} className="cr-pane cr-passage" ref={passageRef} onMouseUp={showHighlightMenu} onTouchEnd={()=>setTimeout(showHighlightMenu,100)}><h2>{passage.title}</h2>{rows.map((para,i)=><p key={i}>{para}</p>)}</section>
   <section style={{display:tab==="passage"?"var(--cr-hide-questions)":"block"}} className="cr-pane cr-questions" ref={questionsRef} onMouseUp={showHighlightMenu} onTouchEnd={()=>setTimeout(showHighlightMenu,100)}>
    {questionGroups.map((group,gi)=><section className="cr-qgroup" key={gi}><div className="cr-qgroup-head"><h3>Questions {group[0].number}{group.length>1?"–"+group[group.length-1].number:""}</h3>{group[0].instruction&&<p>{group[0].instruction}</p>}</div>
     {group.map(q=><div className="cr-question" key={q.number} id={"question-"+q.number}><div className="cr-question-head"><b>{q.number}</b><span>{q.text}</span></div>
      {q.type==="tfng"?<div className="cr-options">{["TRUE","FALSE","NOT GIVEN"].map(opt=><label key={opt}><input type="radio" disabled={!!result} checked={answers[q.number]===opt} onChange={()=>setAnswers(a=>({...a,[q.number]:opt}))}/><span className="cr-radio"/>{opt}</label>)}</div>:q.type==="mcq"?<div className="cr-options">{(q.options||[]).map(opt=><label key={opt}><input type="radio" disabled={!!result} checked={answers[q.number]===opt[0]} onChange={()=>setAnswers(a=>({...a,[q.number]:opt[0]}))}/><span className="cr-radio"/>{opt}</label>)}</div>:<input className="cr-gap" type="text" placeholder="Your answer" autoComplete="off" spellCheck={false} disabled={!!result} value={answers[q.number]||""} onChange={e=>setAnswers(a=>({...a,[q.number]:e.target.value}))}/>}
      {result?.answers&&<small className="cr-correct">Correct answer: {String(result.answers.find(a=>a.number===q.number)?.correct??"")}</small>}
     </div>)}</section>)}</section></div>
   <footer className="cr-footer"><button className="cr-back-btn" onClick={goBack}>← Passages</button><div className="cr-number-strip" aria-label="Question navigation">{passage.questions.map(q=><button key={q.number} className={answers[q.number]?"answered":""} onClick={()=>{setTab("questions");setTimeout(()=>document.getElementById("question-"+q.number)?.scrollIntoView({behavior:"smooth",block:"center"}),20)}}>{q.number}</button>)}</div><span className="cr-answer-count">{result?"Completed":answered+" / "+total}</span>{result?<button className="cr-submit" onClick={()=>{setPassage(null);setResult(null);setAnswers({});setTimer(initialTimer);clearHighlights()}}>Score {result.score}/{result.total} · Continue <ChevronRight size={16}/></button>:<button className="cr-submit" disabled={busy||!timer.started_at} onClick={()=>submit(false)}><Send size={15}/> {busy?"Submitting…":"Submit"}</button>}</footer>
  </>}
  {selectionMenu&&passage&&!result&&<div className="cr-highlight-menu" style={{left:selectionMenu.x,top:selectionMenu.y}} onMouseDown={e=>e.preventDefault()} role="toolbar" aria-label="Highlight selected text"><button aria-label="Yellow highlight" title="Yellow highlight" onClick={()=>applyHighlight("yellow")}><i className="swatch yellow"/></button><button aria-label="Mint highlight" title="Mint highlight" onClick={()=>applyHighlight("green")}><i className="swatch green"/></button><span className="cr-menu-sep"/><button aria-label="Remove highlight" title="Remove highlight" onClick={()=>applyHighlight("erase")}><Eraser size={17}/></button></div>}
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
  
  /* Matched to 60-Day Challenge: Manrope, restrained borders, purple and gold. */
  .cr-shell{font-family:Manrope,Inter,ui-sans-serif,system-ui,sans-serif;background:#fafbff;color:#24263b}
  .cr-header{position:relative;display:grid;grid-template-columns:1fr minmax(230px,1fr) 1fr;background:#fff;border-bottom-color:#e9e8f4;height:72px;z-index:6}
  .cr-head-start{justify-self:start}.cr-head-center{justify-self:center}.cr-head-end{justify-self:end;display:flex;align-items:center;gap:14px;font-size:11px;letter-spacing:.11em;color:#73708d}.cr-head-end b{color:#302d4f}
  .cr-head-center strong{font-size:11px;letter-spacing:.14em;color:#3b3654}
  .cr-head-center strong span{color:#9691b0}
  .cr-back{background:transparent;border:0;font:700 12px Manrope,sans-serif;cursor:pointer}
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
  .cr-split{height:calc(100dvh - 72px - 77px - 66px);padding:13px 16px;gap:13px;background:#fafbff}
  .cr-pane{border-color:#e7e6f1;background:#fff;border-radius:10px;padding:26px 30px}
  .cr-passage{font:16px/1.8 "Palatino Linotype",Palatino,Georgia,serif;letter-spacing:.005em}
  .cr-passage h2{font:800 22px/1.35 Manrope,system-ui,sans-serif;letter-spacing:-.03em}
  .cr-questions{font-family:Manrope,system-ui,sans-serif}
  .cr-qgroup-head h3{color:#2c264c;font-weight:850;letter-spacing:-.02em}
  .cr-question-head b{border-color:#ddd9ee;background:#faf9fe;color:#6655d1}
  .cr-options label{font-size:13px;line-height:1.55}
  .cr-options input:focus-visible+.cr-radio{outline:3px solid #cfc5ff;outline-offset:2px}
  .cr-gap:focus{outline:3px solid #ded6ff;border-color:#8d7bdc}
  .cr-footer{background:#fff;min-height:66px;border-top-color:#e9e7f3}
  .cr-number-strip button.answered{background:#f1edff;border-color:#aa9eea;color:#5545b5}
  .cr-highlight-menu{position:fixed;z-index:100;transform:translateX(-50%);background:#fff;border:1px solid #dcd9ea;box-shadow:0 12px 35px #29204428;border-radius:12px;display:flex;align-items:center;gap:3px;padding:5px}
  .cr-highlight-menu button{width:37px;height:34px;background:#fff;border:0;border-radius:8px;display:grid;place-items:center;cursor:pointer;color:#55506f}
  .cr-highlight-menu button:hover{background:#f5f2ff}
  .cr-highlight-menu .swatch{width:23px;height:17px;border-radius:3px;display:block;border:1px solid #0000000e}
  .cr-highlight-menu .yellow{background:#ffe785}.cr-highlight-menu .green{background:#b5f0cd}
  .cr-menu-sep{height:24px;width:1px;background:#e9e7f2;margin:0 3px}
  @media(max-width:780px){.cr-header{height:62px;padding:0 12px;grid-template-columns:auto 1fr auto;gap:6px}.cr-head-end>span{display:none}.cr-time{font-size:18px}.cr-timer-controls{gap:7px}.cr-play,.cr-pause{padding:8px 9px;font-size:11px}.cr-highlight-guide{font-size:10px;padding:5px 7px}.cr-split{height:calc(100dvh - 62px - 108px - 46px - 64px)}.cr-pane{padding:19px 14px}.cr-passage{font-size:16px}.cr-picker{margin:24px auto}.cr-picker h1{font-size:27px}.cr-tile{gap:11px}.cr-tile h2{font-size:15px}.cr-head-center strong{font-size:10px}.cr-fullscreen{padding:6px}}
`}</style>
 </main>;
}