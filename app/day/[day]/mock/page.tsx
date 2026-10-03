"use client";
import {useParams,useRouter} from "next/navigation";
import {useEffect,useMemo,useRef,useState} from "react";
import {BookOpen,CheckCircle2,ChevronLeft,ChevronRight,Clock3,Headphones,Highlighter,LockKeyhole,Maximize2,Minimize2,PenLine,Send,ShieldCheck,Volume2} from "lucide-react";
import AnimatedBackButton from "../../../components/animated-back-button";
import "../listening/listening.css";
import "../writing/writing.css";
import "./mock.css";

type Stage="not_started"|"listening"|"reading"|"writing"|"assessing"|"completed";
type Q={number:number;type:"tfng"|"gap"|"mcq"|"select";text:string;options?:string[];instruction?:string};
type Passage={id:string;ordinal:number;title:string;text:string;questions:Q[];question_source:string};
type MockData={
 preview:boolean;day:number;
 content:{listening:{title:string;payload:any};reading:Passage[];writing:{title:string;payload:any}};
 mock:{stage:Stage;status:string;reading_remaining:number;writing_remaining:number;listening_answers?:Record<string,string>;reading_answers?:Record<string,string>;writing_task1?:string;writing_task2?:string;result?:any}
};
type Token=string|{q:number};

const optionValue=(value:string)=>value.trim().match(/^([ivx]+|[A-Z])(?:[.): ]|$)/i)?.[1]||value.trim();
const fmt=(total:number)=>{const s=Math.max(0,Math.floor(total));return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")};
const words=(s:string)=>s.trim()?s.trim().split(/\s+/).length:0;

export default function FullMockPage(){
 const {day:slug}=useParams<{day:string}>();const day=Number(slug)||4;const router=useRouter();
 const [data,setData]=useState<MockData|null>(null),[stage,setStage]=useState<Stage>("not_started"),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const [full,setFull]=useState(false);
 const [listeningStarted,setListeningStarted]=useState(false),[audioState,setAudioState]=useState<"idle"|"playing"|"ended"|"resume">("idle"),[lSection,setLSection]=useState(1),[lAnswers,setLAnswers]=useState<Record<string,string>>({}),[lElapsed,setLElapsed]=useState(0);
 const [rPassage,setRPassage]=useState(1),[rAnswers,setRAnswers]=useState<Record<string,string>>({}),[rRemaining,setRRemaining]=useState(3600);
 const [wTask,setWTask]=useState<1|2>(1),[w1,setW1]=useState(""),[w2,setW2]=useState(""),[wRemaining,setWRemaining]=useState(3600);
 const [result,setResult]=useState<any>(null),[previewListening,setPreviewListening]=useState<any>(null),[previewReading,setPreviewReading]=useState<any>(null);
 const audioRef=useRef<HTMLAudioElement>(null),saveRef=useRef<number|null>(null),selectionRef=useRef<Range|null>(null);
 const [highlightPopup,setHighlightPopup]=useState<{x:number;y:number}|null>(null);
 const paperRef=useRef<HTMLDivElement>(null);

 useEffect(()=>{const f=()=>setFull(!!document.fullscreenElement);document.addEventListener("fullscreenchange",f);return()=>document.removeEventListener("fullscreenchange",f)},[]);
 useEffect(()=>{let live=true;(async()=>{setLoading(true);try{const r=await fetch("/api/challenge-mock?day="+day,{credentials:"same-origin",cache:"no-store"});const obj=await r.json();if(!r.ok)throw new Error(obj.detail||"Full Mock could not be loaded.");if(!live)return;setData(obj);setStage(obj.mock.stage);setLAnswers(obj.mock.listening_answers||{});setRAnswers(obj.mock.reading_answers||{});setW1(obj.mock.writing_task1||"");setW2(obj.mock.writing_task2||"");setRRemaining(Number(obj.mock.reading_remaining||3600));setWRemaining(Number(obj.mock.writing_remaining||3600));setResult(obj.mock.result||null)}catch(e){if(live)setMessage(e instanceof Error?e.message:"Full Mock could not be loaded.")}finally{if(live)setLoading(false)}})();return()=>{live=false}},[day]);

 useEffect(()=>{if(stage!=="listening"||!listeningStarted)return;const id=window.setInterval(()=>setLElapsed(v=>v+1),1000);return()=>window.clearInterval(id)},[stage,listeningStarted]);
 useEffect(()=>{if(stage!=="reading")return;const id=window.setInterval(()=>setRRemaining(v=>Math.max(0,v-1)),1000);return()=>window.clearInterval(id)},[stage]);
 useEffect(()=>{if(stage==="reading"&&rRemaining===0&&!busy)void submitReading(true)},[stage,rRemaining,busy]);
 useEffect(()=>{if(stage!=="writing")return;const id=window.setInterval(()=>setWRemaining(v=>Math.max(0,v-1)),1000);return()=>window.clearInterval(id)},[stage]);
 useEffect(()=>{if(stage==="writing"&&wRemaining===0&&!busy)void submitWriting(true)},[stage,wRemaining,busy]);

 function queueSave(kind:"listening"|"reading"|"writing",payload:any){
  if(saveRef.current)window.clearTimeout(saveRef.current);
  saveRef.current=window.setTimeout(()=>{void fetch("/api/challenge-mock",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save_"+kind,...payload})}).catch(()=>{})},500);
 }
 function setL(q:number,value:string){setLAnswers(prev=>{const next={...prev,[String(q)]:value};queueSave("listening",{answers:next,elapsed_seconds:lElapsed});return next})}
 function toggleMulti(block:any,letter:string){
  const qs=(block.questions||[]).map(Number),max=Math.max(1,Math.min(qs.length,Number(block.max_selections||2)));
  const selected=qs.map((q:number)=>lAnswers[String(q)]).filter(Boolean);
  const next=selected.includes(letter)?selected.filter((x:string)=>x!==letter):selected.length<max?[...selected,letter]:selected;
  const copy={...lAnswers};qs.forEach((q:number,i:number)=>copy[String(q)]=next[i]||"");setLAnswers(copy);queueSave("listening",{answers:copy,elapsed_seconds:lElapsed});
 }
 function setR(q:number,value:string){setRAnswers(prev=>{const next={...prev,[String(q)]:value};queueSave("reading",{answers:next});return next})}
 function setWriting(which:1|2,value:string){if(which===1)setW1(value);else setW2(value);queueSave("writing",{task1:which===1?value:w1,task2:which===2?value:w2})}

 async function startMock(){
  setBusy(true);setMessage("");try{const r=await fetch("/api/challenge-mock",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"start"})});const obj=await r.json();if(!r.ok)throw new Error(obj.detail||"Could not start Full Mock.");setStage("listening");document.documentElement.requestFullscreen?.().catch(()=>{})}catch(e){setMessage(e instanceof Error?e.message:"Could not start Full Mock.")}finally{setBusy(false)}
 }
 async function startListening(){
  setListeningStarted(true);setAudioState("playing");try{await audioRef.current?.play()}catch{setAudioState("resume")}
 }
 async function submitListening(){
  if(busy)return;if(!window.confirm("Submit Listening and continue to Reading? You cannot return to this section."))return;
  setBusy(true);setMessage("");try{if(saveRef.current)window.clearTimeout(saveRef.current);const r=await fetch("/api/challenge-mock",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"submit_listening",answers:lAnswers,elapsed_seconds:lElapsed})});const obj=await r.json();if(!r.ok)throw new Error(obj.detail||"Could not submit Listening.");audioRef.current?.pause();if(obj.hidden_result)setPreviewListening(obj.hidden_result);setRRemaining(Number(obj.reading_remaining||3600));setStage("reading");setRPassage(1)}catch(e){setMessage(e instanceof Error?e.message:"Could not submit Listening.")}finally{setBusy(false)}
 }
 async function submitReading(auto=false){
  if(busy)return;if(!auto&&!window.confirm("Submit Reading and continue to Writing? You cannot return to Reading."))return;
  setBusy(true);setMessage("");try{if(saveRef.current)window.clearTimeout(saveRef.current);const r=await fetch("/api/challenge-mock",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"submit_reading",answers:rAnswers})});const obj=await r.json();if(!r.ok)throw new Error(obj.detail||"Could not submit Reading.");if(obj.hidden_result)setPreviewReading(obj.hidden_result);setWRemaining(Number(obj.writing_remaining||3600));setStage("writing");setWTask(1)}catch(e){setMessage(e instanceof Error?e.message:"Could not submit Reading.")}finally{setBusy(false)}
 }
 async function submitWriting(auto=false){
  if(busy)return;if(!w1.trim()||!w2.trim()){if(!auto)setMessage("Complete both Writing Task 1 and Task 2 before submitting.");return}
  if(!auto&&!window.confirm("Submit Writing and finish the Full Mock?"))return;
  setBusy(true);setMessage("");try{if(saveRef.current)window.clearTimeout(saveRef.current);const r=await fetch("/api/challenge-mock",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"submit_writing",task1:w1,task2:w2,preview_listening:previewListening,preview_reading:previewReading})});const obj=await r.json();if(r.status===202){setStage("assessing");setMessage(obj.detail||"Writing is being assessed.");return}if(!r.ok)throw new Error(obj.detail||"Could not submit Writing.");setResult(obj.result);setStage("completed")}catch(e){setMessage(e instanceof Error?e.message:"Could not submit Writing.")}finally{setBusy(false)}
 }
 async function toggleFull(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{}}
 function showHighlight(){
  const sel=window.getSelection();if(!sel||sel.isCollapsed||!sel.rangeCount)return;const r=sel.getRangeAt(0);if(!paperRef.current?.contains(r.commonAncestorContainer))return;const rect=r.getBoundingClientRect();selectionRef.current=r.cloneRange();setHighlightPopup({x:Math.min(innerWidth-110,Math.max(110,rect.left+rect.width/2)),y:Math.max(65,rect.top-50)});
 }
 function applyHighlight(){
  const r=selectionRef.current,h=window.CSS?.highlights;if(!r||!h)return;const old=h.get("ark-mock-yellow");h.set("ark-mock-yellow",old?new Highlight(...Array.from(old),r.cloneRange()):new Highlight(r.cloneRange()));window.getSelection()?.removeAllRanges();selectionRef.current=null;setHighlightPopup(null);
 }

 const lp=data?.content.listening.payload,currentSection=lp?.sections?.find((x:any)=>Number(x.number)===lSection);
 const passage=data?.content.reading.find(p=>p.ordinal===rPassage);
 const writing=data?.content.writing.payload,tasks=writing?.tasks||[],task=tasks[wTask-1];

 function gap(q:number){return <span className="ls-gap-wrap" id={"mock-lq-"+q}><span className="ls-qnum">{q}</span><input value={lAnswers[String(q)]||""} onChange={e=>setL(q,e.target.value)} aria-label={"Question "+q}/></span>}
 function tokens(items:Token[]){return items.map((x,i)=>typeof x==="string"?<span key={i}>{x}</span>:<span key={i}>{gap(x.q)}</span>)}
 function renderL(block:any,idx:number){
  if(block.kind==="notes")return <section className="ls-block" key={idx}><div className="ls-block-head"><b>{block.range}</b><em>{block.instruction}</em><strong>{block.word_limit}</strong></div><div className="ls-notes-sheet"><h2>{block.title}</h2><ul>{block.items.map((it:Token[],i:number)=><li key={i}>{tokens(it)}</li>)}</ul></div></section>;
  if(block.kind==="matching")return <section className="ls-block" key={idx}><div className="ls-block-head"><b>{block.range}</b><em>{block.instruction}</em><strong>{block.word_limit}</strong></div>{block.title&&<h2 className="ls-source-title">{block.title}</h2>}{block.image_url&&<div className="ls-map-image-wrap"><img src={block.image_url} alt={block.image_alt||"Listening visual"}/></div>}{!block.hide_choices&&<div className="ls-choice-box">{Object.entries(block.choices||{}).map(([k,v])=><p key={k}><b>{k}</b><span>{String(v)}</span></p>)}</div>}<div className="ls-match-list">{(block.items||[]).map((it:any)=><div className="ls-match" key={it.q}><span className="ls-qnum static">{it.q}</span><b>{it.text}</b><select value={lAnswers[String(it.q)]||""} onChange={e=>setL(it.q,e.target.value)}><option value="">Choose</option>{Object.keys(block.choices||{}).map(k=><option key={k}>{k}</option>)}</select></div>)}</div></section>;
  if(block.kind==="mcq")return <section className="ls-block" key={idx}><div className="ls-block-head"><b>{block.range}</b><em>{block.instruction}</em></div>{block.title&&<h2 className="ls-source-title">{block.title}</h2>}<div>{(block.questions||[]).map((q:any)=><article className="ls-mcq" key={q.q}><div className="ls-q-title"><span className="ls-qnum static">{q.q}</span><b>{q.text}</b></div><div className="ls-options">{Object.entries(q.options||{}).map(([letter,text])=><label className="ls-option" key={letter}><input type="radio" name={"mq"+q.q} checked={lAnswers[String(q.q)]===letter} onChange={()=>setL(q.q,letter)}/><b>{letter}</b><span>{String(text)}</span></label>)}</div></article>)}</div></section>;
  if(block.kind==="choose_two"||block.kind==="choose_many"){
   const qs=(block.questions||[]).map(Number),selected=qs.map((q:number)=>lAnswers[String(q)]).filter(Boolean);
   return <section className="ls-block" key={idx}><div className="ls-block-head"><b>{block.range}</b><em>{block.instruction}</em></div><div className="ls-two"><h3>{block.question}</h3><div>{Object.entries(block.options||{}).map(([letter,text])=><label className="ls-check" key={letter}><input type="checkbox" checked={selected.includes(letter)} onChange={()=>toggleMulti(block,letter)}/><b>{letter}</b><span>{String(text)}</span></label>)}</div></div></section>
  }
  if(block.kind==="notes_groups")return <section className="ls-block" key={idx}><div className="ls-block-head"><b>{block.range}</b><em>{block.instruction}</em><strong>{block.word_limit}</strong></div><div className="ls-notes-sheet"><h2>{block.title}</h2>{(block.groups||[]).map((g:any,gi:number)=><div className="ls-note-group" key={gi}><h3>{g.heading}</h3>{g.intro&&<p>{g.intro}</p>}<ul>{(g.items||[]).map((it:Token[],i:number)=><li key={i}>{tokens(it)}</li>)}</ul></div>)}</div></section>;
  return null;
 }
 function renderRQ(q:Q){
  if(q.type==="gap")return <div className="cr-question cr-gap-question" key={q.number}><div className="cr-question-row"><span className="cr-number">{q.number}</span><p>{q.text}</p></div><input className="cr-gap-input" value={rAnswers[String(q.number)]||""} onChange={e=>setR(q.number,e.target.value)} placeholder="Answer"/></div>;
  if(q.type==="tfng")return <div className="cr-question" key={q.number}><div className="cr-question-row"><span className="cr-number">{q.number}</span><p>{q.text}</p></div><select value={rAnswers[String(q.number)]||""} onChange={e=>setR(q.number,e.target.value)}><option value="">Choose</option>{(q.options||[]).map(o=><option key={o}>{o}</option>)}</select></div>;
  return <div className="cr-question" key={q.number}><div className="cr-question-row"><span className="cr-number">{q.number}</span><p>{q.text}</p></div><div className="cr-mcq-options">{(q.options||[]).map(o=>{const v=optionValue(o);return <label key={o}><input type="radio" name={"rq"+q.number} checked={rAnswers[String(q.number)]===v} onChange={()=>setR(q.number,v)}/><span>{o}</span></label>})}</div></div>;
 }

 if(loading)return <main className="mock-loading"><span>ARK EDUCATION</span><b>Preparing Full Mock…</b></main>;
 if(!data)return <main className="mock-loading"><span>FULL MOCK</span><b>{message||"Mock unavailable."}</b><button onClick={()=>router.push("/dashboard")}>Back to dashboard</button></main>;

 if(stage==="not_started")return <main className="mock-entry"><header className="mock-entry-top"><AnimatedBackButton href="/dashboard"/><b>ARK EDUCATION · FULL MOCK</b><span>{data.preview?"PREVIEW MODE":"4 OCTOBER"}</span></header><section className="mock-entry-card"><small>DAY 04 · IELTS FULL MOCK</small><h1>Listening → Reading → Writing</h1><p>Complete all three sections in order. Section scores stay hidden until the Writing assessment is finished.</p><div className="mock-entry-steps"><div><Headphones/><b>Listening</b><span>40 questions · audio once</span></div><div><BookOpen/><b>Reading</b><span>40 questions · 60 minutes</span></div><div><PenLine/><b>Writing</b><span>Task 1 + Task 2 · 60 minutes</span></div></div>{data.preview&&<div className="mock-preview-note"><ShieldCheck size={16}/> Teacher preview · nothing is saved to real student results.</div>}<button disabled={busy} onClick={startMock}>{busy?"Opening…":"Start Full Mock"} <ChevronRight size={17}/></button>{message&&<p className="mock-error">{message}</p>}</section></main>;

 if(stage==="listening")return <main className="ls-shell mock-section-shell">
  <audio ref={audioRef} preload="auto" src={lp.audio_url} onPlay={()=>setAudioState("playing")} onEnded={()=>setAudioState("ended")} onPause={()=>{if(listeningStarted&&audioState==="playing"){audioRef.current?.play().catch(()=>setAudioState("resume"))}}}/>
  <header className="ls-topbar"><div className="ls-back"><LockKeyhole size={17}/></div><div className="ls-top-title">FULL MOCK · LISTENING</div><div className="ls-top-actions">{listeningStarted&&<span className={"ls-audio-state "+audioState}><Volume2 size={14}/>{audioState==="ended"?"Audio finished":"Audio once only"} <i>{fmt(lElapsed)}</i></span>}<button className="ls-full" onClick={toggleFull}>{full?<Minimize2 size={17}/>:<Maximize2 size={17}/>}</button></div></header>
  {!listeningStarted?<section className="ls-start-card"><span className="ls-start-icon"><Headphones size={27}/></span><small>FULL MOCK · SECTION 1 OF 3</small><h1>Listening</h1><p>40 questions · 4 sections. The recording plays once and cannot be paused or replayed.</p><div className="ls-start-meta"><div><b>4</b><span>Sections</span></div><div><b>40</b><span>Questions</span></div><div><b>1×</b><span>Playback</span></div></div><button onClick={startListening}><Headphones size={17}/> Start Listening</button></section>:<>
   {audioState==="resume"&&<div className="ls-resume-banner"><Volume2 size={16}/><div><b>Audio needs permission</b><span>Resume from the current mock position.</span></div><button onClick={()=>audioRef.current?.play().then(()=>setAudioState("playing")).catch(()=>{})}>Resume audio</button></div>}
   <section className="ls-instruction"><div><b>{currentSection?.label}</b><span>{currentSection?.range}</span></div><span className="ls-save-state">Answers auto-save</span></section>
   <div className="ls-workspace"><section className="ls-question-paper" ref={paperRef} onMouseUp={showHighlight}>{currentSection?.blocks?.map((b:any,i:number)=>renderL(b,i))}</section></div>
   {highlightPopup&&<div className="ls-selection-popup" style={{left:highlightPopup.x,top:highlightPopup.y}}><button className="yellow" onMouseDown={e=>e.preventDefault()} onClick={applyHighlight}><span/> Highlight</button></div>}
   <nav className="ls-bottom-nav"><button className="ls-arrow" disabled={lSection<=1} onClick={()=>setLSection(v=>Math.max(1,v-1))}><ChevronLeft size={17}/></button><div className="mock-l-sections">{[1,2,3,4].map(s=><button key={s} className={lSection===s?"active":""} onClick={()=>setLSection(s)}>SECTION {s}</button>)}</div><button className="ls-arrow" disabled={lSection>=4} onClick={()=>setLSection(v=>Math.min(4,v+1))}><ChevronRight size={17}/></button><button className="mock-submit-section" disabled={busy} onClick={submitListening}><Send size={15}/> Submit Listening</button></nav>
  </>}
  {message&&<div className="mock-floating-message">{message}</div>}
 </main>;

 if(stage==="reading")return <main className="cr-shell mock-reading-shell">
  <header className="cr-header"><div className="cr-head-start"><LockKeyhole size={17}/></div><div className="cr-head-center"><span className="cr-time"><Clock3 size={17}/>{fmt(rRemaining)}</span></div><div className="cr-head-end"><strong>FULL MOCK · READING</strong><button className="cr-fullscreen" onClick={toggleFull}>{full?<Minimize2 size={18}/>:<Maximize2 size={18}/>}</button></div></header>
  <div className="mock-reading-tabs">{data.content.reading.map(p=><button key={p.id} className={rPassage===p.ordinal?"active":""} onClick={()=>setRPassage(p.ordinal)}>PASSAGE {p.ordinal}</button>)}</div>
  <div className="cr-workspace mock-reading-workspace">
   <section className="cr-passage" ref={paperRef} onMouseUp={showHighlight}><div className="cr-passage-head"><small>READING PASSAGE {passage?.ordinal}</small><h1>{passage?.title}</h1></div><div className="cr-passage-text">{passage?.text.split(/\n\s*\n/).filter(Boolean).map((p,i)=><p key={i}>{p}</p>)}</div></section>
   <section className="cr-questions"><div className="cr-questions-head"><small>QUESTIONS</small><h2>{passage?.questions[0]?.number}–{passage?.questions.at(-1)?.number}</h2></div>{passage?.questions.map(renderRQ)}</section>
  </div>
  {highlightPopup&&<div className="ls-selection-popup" style={{left:highlightPopup.x,top:highlightPopup.y}}><button className="yellow" onMouseDown={e=>e.preventDefault()} onClick={applyHighlight}><span/> Highlight</button></div>}
  <footer className="mock-reading-footer"><div>{data.content.reading.map(p=><button key={p.ordinal} className={rPassage===p.ordinal?"active":""} onClick={()=>setRPassage(p.ordinal)}>Passage {p.ordinal}</button>)}</div><button disabled={busy} onClick={()=>submitReading(false)}><Send size={16}/> Submit Reading</button></footer>
  {message&&<div className="mock-floating-message">{message}</div>}
 </main>;

 if(stage==="writing")return <main className="writing-shell mock-writing-shell">
  <header className="writing-topbar"><div className="writing-back-slot"><LockKeyhole size={17}/></div><div className="writing-top-center"><span>FULL MOCK</span><b>Writing</b></div><div className="writing-top-meta"><strong className={wRemaining<=300?"urgent":""}><Clock3 size={16}/>{fmt(wRemaining)}</strong><button className="writing-fullscreen" onClick={toggleFull}>{full?<Minimize2 size={18}/>:<Maximize2 size={18}/>}</button></div></header>
  <section className="writing-toolbar"><div><button className={"writing-task-chip mock-task-tab "+(wTask===1?"active":"")} onClick={()=>setWTask(1)}>Task 1 · {words(w1)} words</button><button className={"writing-task-chip mock-task-tab "+(wTask===2?"active":"")} onClick={()=>setWTask(2)}>Task 2 · {words(w2)} words</button></div><div className="writing-controls"><span className="mock-writing-shared">One shared 60-minute timer</span><button className="submit" disabled={busy||!w1.trim()||!w2.trim()} onClick={()=>submitWriting(false)}><Send size={16}/>{busy?"Submitting…":"Submit Writing"}</button></div></section>
  <div className="writing-stage">
   <section className="writing-task-pane"><div className="writing-pane-head"><span>QUESTION</span><b>{task.label}</b></div><div className="writing-paper"><p className="writing-time-note">Recommended: about {Math.round(Number(task.recommended_seconds||0)/60)} minutes.</p>{wTask===2&&<p className="writing-topic-note">Write about the following topic:</p>}<div className="writing-prompt">{task.prompt}</div>{task.visual?.kind==="table"&&<div className="mock-writing-table-wrap"><table className="mock-writing-table"><thead><tr>{task.visual.headers.map((h:string)=><th key={h}>{h}</th>)}</tr></thead><tbody>{task.visual.rows.map((row:string[],i:number)=><tr key={i}>{row.map((c,j)=><td key={j}>{c}</td>)}</tr>)}</tbody></table></div>}{(task.instructions||[]).map((x:string,i:number)=><p className="writing-instruction" key={i}>{x}</p>)}<p className="writing-min">Write at least {task.min_words} words.</p></div></section>
   <section className="writing-answer-pane"><div className="writing-pane-head"><span>YOUR ANSWER</span><div><b>{words(wTask===1?w1:w2)} words</b><i className={words(wTask===1?w1:w2)>=task.min_words?"ok":""}>{words(wTask===1?w1:w2)>=task.min_words?"Minimum reached":"Keep writing"}</i></div></div><div className="writing-editor-wrap"><textarea value={wTask===1?w1:w2} onChange={e=>setWriting(wTask,e.target.value)} spellCheck={false} placeholder={"Type "+task.label+" here…"}/></div><div className="writing-editor-footer"><span><ShieldCheck size={14}/> Draft auto-saved</span><span>{fmt(wRemaining)} remaining</span></div></section>
  </div>
  {message&&<div className="mock-floating-message">{message}</div>}
 </main>;

 if(stage==="assessing")return <main className="mock-assessing"><section><div className="mock-assess-spinner"/><small>FULL MOCK · WRITING</small><h1>Writing is being assessed…</h1><p>{message||"Your Listening and Reading scores remain hidden until the Writing result is ready."}</p><button onClick={()=>location.reload()}>Check status</button></section></main>;

 return <main className="mock-result-page"><header className="mock-entry-top"><AnimatedBackButton href="/dashboard"/><b>ARK EDUCATION · FULL MOCK</b><span>COMPLETED</span></header><section className="mock-result-card"><small>4 OCTOBER · FULL MOCK RESULT</small><h1>Mock Overall <b>{Number(result?.overall||0).toFixed(1)}</b></h1><div className="mock-result-grid"><article><Headphones/><span>Listening</span><strong>{result?.listening?.score ?? "—"}<i>/40</i></strong><b>Band {Number(result?.listening?.band||0).toFixed(1)}</b></article><article><BookOpen/><span>Reading</span><strong>{result?.reading?.score ?? "—"}<i>/40</i></strong><b>Band {Number(result?.reading?.band||0).toFixed(1)}</b></article><article><PenLine/><span>Writing</span><strong>{Number(result?.writing?.band||0).toFixed(1)}</strong><b>AI assessed</b></article></div>{result?.writing?.assessment&&<div className="mock-writing-feedback"><h2>Writing assessment</h2><div><span>Task 1 <b>{Number(result.writing.assessment.task1?.band||0).toFixed(1)}</b></span><span>Task 2 <b>{Number(result.writing.assessment.task2?.band||0).toFixed(1)}</b></span></div><p>{result.writing.assessment.summary}</p></div>}<button onClick={()=>router.push("/dashboard")}>Back to Dashboard <ChevronRight size={16}/></button></section></main>;
}
