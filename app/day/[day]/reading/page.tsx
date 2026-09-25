"use client";
import Link from "next/link";
import {useParams} from "next/navigation";
import {useEffect,useRef,useState} from "react";
import {BookOpen,CheckCircle2,LockKeyhole,ChevronRight,ArrowLeft,Clock3,Highlighter,Send} from "lucide-react";

type Q={number:number,type:"tfng"|"gap"|"mcq",text:string,options?:string[],instruction?:string};
type Passage={id:string,day_number:number,ordinal:number,title:string,text:string,questions:Q[],question_source:string};
type ListItem={id:string,ordinal:number,title:string,completed:{score:number,total:number,elapsed_seconds:number}|null,locked:boolean};
type Result={score:number,total:number,elapsed_seconds:number,answers?:{number:number,correct:string|string[]}[]};
function elapsed(sec:number){return String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0")}
export default function ChallengeReading(){
 const {day:slug}=useParams<{day:string}>();const day=Number(slug);
 const [items,setItems]=useState<ListItem[]>([]),[draftCount,setDraftCount]=useState(0);
 const [passage,setPassage]=useState<Passage|null>(null),[answers,setAnswers]=useState<Record<string,string>>({});
 const [result,setResult]=useState<Result|null>(null),[started,setStarted]=useState(""),[now,setNow]=useState(Date.now());
 const [tab,setTab]=useState<"passage"|"questions">("passage"),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [color,setColor]=useState<"yellow"|"green">("yellow"),[highlightMode,setHighlightMode]=useState(false);
 const passageRef=useRef<HTMLDivElement>(null),questionsRef=useRef<HTMLDivElement>(null);
 const activeId=useRef<string>("");const isPreview=useRef(false);
 async function loadList(){const res=await fetch("/api/challenge-reading?action=list&day="+day,{cache:"no-store"});const obj=await res.json();if(!res.ok)throw new Error(obj.error||"Unable to load");setItems(obj.passages||[]);setDraftCount(obj.draft_count||0);isPreview.current=!!obj.preview;}
 useEffect(()=>{let alive=true;(async()=>{try{await loadList()}catch(e){if(alive)setError(String(e))}})();return()=>{alive=false}},[day]);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer)},[]);
 useEffect(()=>{if(!started||!passage||result)return;const remaining=1200-Math.max(0,Math.floor((now-Date.parse(started))/1000));if(remaining<=0&&!busy){submit(true)}},[now,started,passage,result,busy]);
 async function openPassage(p:ListItem){
  if(p.locked||busy)return;setBusy(true);setError("");setResult(null);setAnswers({});setHighlightMode(false);
  try{
   const res=await fetch("/api/challenge-reading?action=passage&day="+day+"&id="+encodeURIComponent(p.id),{cache:"no-store"});const obj=await res.json();if(!res.ok)throw new Error(obj.error||"Unable to open");
   setPassage(obj.passage);activeId.current=p.id;
   if(obj.completed){setResult(obj.completed);setStarted("");}
   else{const sr=await fetch("/api/challenge-reading",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"start",day,passage_id:p.id})});const start=await sr.json();if(!sr.ok)throw new Error(start.error||"Could not start");setStarted(start.started_at);}
  }catch(e){setError(String(e))}finally{setBusy(false)}
 }
 async function submit(auto=false){
  if(!passage||busy||result)return;
  if(!auto&&!confirm("Submit this passage? You cannot change your answers afterward."))return;
  setBusy(true);setError("");
  try{
   const res=await fetch("/api/challenge-reading",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"submit",day,passage_id:passage.id,answers})});
   const obj=await res.json();if(!res.ok)throw new Error(obj.error||"Could not save result");setResult(obj.result);setStarted("");await loadList();
  }catch(e){setError(String(e))}finally{setBusy(false)}
 }
 // CSS Custom Highlight deliberately uses the native browser highlight (no DOM text splitting).
 function highlight(container:HTMLDivElement|null){
  if(!container)return;const selection=window.getSelection();if(!selection||selection.isCollapsed||!selection.rangeCount)return;
  const range=selection.getRangeAt(0);if(!container.contains(range.commonAncestorContainer))return;
  const highlighted=window.CSS?.highlights;if(!highlighted){setError("Use an updated Chrome, Edge or Safari for text highlighting.");return}
  const key=color==="yellow"?"ark-reading-yellow":"ark-reading-green";
  const existing=highlighted.get(key);
  const next=existing?new Highlight(...Array.from(existing),range.cloneRange()):new Highlight(range.cloneRange());
  highlighted.set(key,next);selection.removeAllRanges();
 }
 function selectionHandler(which:"passage"|"questions"){if(highlightMode)highlight(which==="passage"?passageRef.current:questionsRef.current)}
 const total=passage?.questions.length||0,answered=Object.values(answers).filter(Boolean).length;
 const questionGroups:(Q[])[]=[];
 if(passage){for(const q of passage.questions){const last=questionGroups[questionGroups.length-1];if(!last||last[0]?.instruction!==q.instruction)questionGroups.push([q]);else last.push(q);}}
 const left=started?Math.max(0,1200-Math.floor((now-Date.parse(started))/1000)):1200;
 const rows=passage?.text.split(/\n\s*\n/).filter(Boolean)||[];
 return <main className="cr-shell">
  <header className="cr-header"><Link href={"/day/"+day} className="cr-back"><ArrowLeft size={17}/> Study day</Link><strong>ARK EDUCATION <span>· READING CDI</span></strong><span className="cr-timer"><Clock3 size={16}/>{passage&&!result?elapsed(left):"20:00"}</span></header>
  {!passage?<section className="cr-picker">
   <span className="cr-kicker">DAY {String(day).padStart(2,"0")} · IELTS READING</span>
   <h1>Today’s Reading</h1><p>Complete the first passage to unlock the second. Each passage is timed and scored separately.</p>
   {items.map(p=><article key={p.id} className={"cr-tile "+(p.locked?"cr-locked":"")}><span className="cr-tile-icon">{p.completed?<CheckCircle2 size={27}/>:p.locked?<LockKeyhole size={27}/>:<BookOpen size={27}/>}</span><div><small>PASSAGE {p.ordinal} · {p.completed?"COMPLETED":p.locked?"LOCKED":"20 MINUTES"}</small><h2>{p.title}</h2>{p.completed&&<p>Score: {p.completed.score}/{p.completed.total} · Time: {elapsed(p.completed.elapsed_seconds)}</p>}</div><button disabled={p.locked||busy} onClick={()=>openPassage(p)}>{p.completed?"View":p.locked?"Locked":"Start"} <ChevronRight size={17}/></button></article>)}
   {!items.length&&!error&&<div className="cr-empty">No published reading materials for this day yet.</div>}
   {draftCount>0&&<p className="cr-draft">{draftCount} passage(s) pending answer-key verification.</p>}
  </section>:<>
   <div className="cr-instructions"><div><small>PASSAGE {passage.ordinal} · DAY {day}</small><h1>{passage.title}</h1><p>Read the passage and answer all {total} questions. You have 20 minutes.</p></div><div className="cr-tools"><button onClick={()=>{setHighlightMode(v=>!v)}} aria-pressed={highlightMode} className={highlightMode?"cr-on":""}><Highlighter size={15}/> Highlight {highlightMode?"ON":"OFF"}</button><button onClick={()=>setColor(c=>c==="yellow"?"green":"yellow")} title="Switch highlight colour"><span className={"cr-color "+color}/>{color}</button></div></div>
   <div className="cr-mobile-tabs"><button className={tab==="passage"?"active":""} onClick={()=>setTab("passage")}>Passage</button><button className={tab==="questions"?"active":""} onClick={()=>setTab("questions")}>Questions</button></div>
   <div className="cr-split"><section style={{display:tab==="questions"?"var(--cr-hide-passage)":"block"}} className="cr-pane cr-passage" ref={passageRef} onMouseUp={()=>selectionHandler("passage")} onTouchEnd={()=>selectionHandler("passage")}><h2>{passage.title}</h2>{rows.map((para,i)=><p key={i}>{para}</p>)}</section>
   <section style={{display:tab==="passage"?"var(--cr-hide-questions)":"block"}} className="cr-pane cr-questions" ref={questionsRef} onMouseUp={()=>selectionHandler("questions")} onTouchEnd={()=>selectionHandler("questions")}>
    {questionGroups.map((group,gi)=><section className="cr-qgroup" key={gi}><div className="cr-qgroup-head"><h3>Questions {group[0].number}{group.length>1?"–"+group[group.length-1].number:""}</h3>{group[0].instruction&&<p>{group[0].instruction}</p>}</div>
     {group.map(q=><div className="cr-question" key={q.number} id={"question-"+q.number}><div className="cr-question-head"><b>{q.number}</b><span>{q.text}</span></div>
      {q.type==="tfng"?<div className="cr-options">{["TRUE","FALSE","NOT GIVEN"].map(opt=><label key={opt}><input type="radio" disabled={!!result} checked={answers[q.number]===opt} onChange={()=>setAnswers(a=>({...a,[q.number]:opt}))}/><span className="cr-radio"/>{opt}</label>)}</div>:q.type==="mcq"?<div className="cr-options">{(q.options||[]).map(opt=><label key={opt}><input type="radio" disabled={!!result} checked={answers[q.number]===opt[0]} onChange={()=>setAnswers(a=>({...a,[q.number]:opt[0]}))}/><span className="cr-radio"/>{opt}</label>)}</div>:<input className="cr-gap" type="text" placeholder="Your answer" autoComplete="off" spellCheck={false} disabled={!!result} value={answers[q.number]||""} onChange={e=>setAnswers(a=>({...a,[q.number]:e.target.value}))}/>}
      {result?.answers&&<small className="cr-correct">Correct answer: {String(result.answers.find(a=>a.number===q.number)?.correct??"")}</small>}
     </div>)}</section>)}</section></div>
   <footer className="cr-footer"><button className="cr-back-btn" onClick={()=>{setPassage(null);setResult(null);setStarted("");}}>← Passages</button><div className="cr-number-strip" aria-label="Question navigation">{passage.questions.map(q=><button key={q.number} className={answers[q.number]?"answered":""} onClick={()=>{setTab("questions");setTimeout(()=>document.getElementById("question-"+q.number)?.scrollIntoView({behavior:"smooth",block:"center"}),20)}}>{q.number}</button>)}</div><span className="cr-answer-count">{result?"Completed":answered+" / "+total}</span>{result?<button className="cr-submit" onClick={()=>{setPassage(null);setResult(null);setAnswers({});}}>Score {result.score}/{result.total} · Continue <ChevronRight size={16}/></button>:<button className="cr-submit" disabled={busy} onClick={()=>submit(false)}><Send size={15}/> {busy?"Submitting…":"Submit"}</button>}</footer>
  </>}
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
  `}</style>
 </main>;
}