"use client";
import LoadingIndicator from "../../../components/loading-indicator";
import {useParams,useRouter} from "next/navigation";
import {useEffect,useMemo,useRef,useState} from "react";
import {BookOpen,CheckCircle2,ChevronLeft,ChevronRight,Clock3,Headphones,Eraser,Highlighter,LockKeyhole,Maximize2,Minimize2,PenLine,Send,ShieldCheck,Volume2} from "lucide-react";
import AnimatedBackButton from "../../../components/animated-back-button";
import "../listening/listening.css";
import "../writing/writing.css";
import "./mock.css";
import "../reading/worksheet.css";
import {ReadingGapSentence,compactReadingInstruction} from "../../../components/reading-question-ui";

type Stage="not_started"|"listening"|"reading"|"writing"|"assessing"|"completed";
type Q={number:number;type:"tfng"|"gap"|"mcq"|"select";text:string;options?:string[];instruction?:string};
type Passage={id:string;ordinal:number;title:string;text:string;questions:Q[];question_source:string};
type MockData={
 preview:boolean;day:number;
 content:{listening:{title:string;payload:any};reading:Passage[];writing:{title:string;payload:any}};
 mock:{stage:Stage;status:string;listening_started_at?:string|null;listening_elapsed_seconds?:number;reading_remaining:number;writing_remaining:number;listening_answers?:Record<string,string>;reading_answers?:Record<string,string>;writing_task1?:string;writing_task2?:string;result?:any}
};
type Token=string|{q:number};

const optionValue=(value:string)=>value.trim().match(/^([ivx]+|[A-Z])(?:[.): ]|$)/i)?.[1]||value.trim();
const fmt=(total:number)=>{const s=Math.max(0,Math.floor(total));return String(Math.floor(s/60)).padStart(2,"0")+":"+String(s%60).padStart(2,"0")};
const words=(s:string)=>s.trim()?s.trim().split(/\s+/).length:0;

export default function FullMockPage(){
 const {day:slug}=useParams<{day:string}>();const day=Number(slug)||4;const router=useRouter();
 const mockDate=new Date(Date.UTC(2026,9,day));
 const mockDateText=mockDate.toLocaleDateString("en-GB",{day:"numeric",month:"long",timeZone:"UTC"}).toUpperCase();
 const [data,setData]=useState<MockData|null>(null),[stage,setStage]=useState<Stage>("not_started"),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const [full,setFull]=useState(false);
 const [listeningStarted,setListeningStarted]=useState(false),[lStartedAt,setLStartedAt]=useState(""),[audioState,setAudioState]=useState<"idle"|"playing"|"ended"|"resume">("idle"),[lSection,setLSection]=useState(1),[lCurrentQuestion,setLCurrentQuestion]=useState(1),[lAnswers,setLAnswers]=useState<Record<string,string>>({}),[lElapsed,setLElapsed]=useState(0);
 const [rPassage,setRPassage]=useState(1),[rTab,setRTab]=useState<"passage"|"questions">("passage"),[rAnswers,setRAnswers]=useState<Record<string,string>>({}),[rRemaining,setRRemaining]=useState(3600);
 const [wTask,setWTask]=useState<1|2>(1),[w1,setW1]=useState(""),[w2,setW2]=useState(""),[wRemaining,setWRemaining]=useState(3600);
 const [result,setResult]=useState<any>(null),[previewListening,setPreviewListening]=useState<any>(null),[previewReading,setPreviewReading]=useState<any>(null);
 const audioRef=useRef<HTMLAudioElement>(null),saveRef=useRef<number|null>(null),selectionRef=useRef<Range|null>(null),questionsRef=useRef<HTMLDivElement>(null);
 const [highlightPopup,setHighlightPopup]=useState<{x:number;y:number}|null>(null);
 const paperRef=useRef<HTMLDivElement>(null);

 useEffect(()=>{const f=()=>setFull(!!document.fullscreenElement);document.addEventListener("fullscreenchange",f);return()=>document.removeEventListener("fullscreenchange",f)},[]);
 useEffect(()=>{let live=true;(async()=>{setLoading(true);try{const r=await fetch("/api/challenge-mock?day="+day,{credentials:"same-origin",cache:"no-store"});const obj=await r.json();if(!r.ok)throw new Error(obj.detail||"Full Mock could not be loaded.");if(!live)return;setData(obj);setStage(obj.mock.stage);setLAnswers(obj.mock.stage==="listening"?{}:obj.mock.listening_answers||{});setLStartedAt(obj.mock.stage==="listening"?"":obj.mock.listening_started_at||"");setListeningStarted(false);setLElapsed(obj.mock.stage==="listening"?0:Number(obj.mock.listening_elapsed_seconds||0));setRAnswers(obj.mock.reading_answers||{});setW1(obj.mock.writing_task1||"");setW2(obj.mock.writing_task2||"");setRRemaining(Number(obj.mock.reading_remaining??3600));setWRemaining(Number(obj.mock.writing_remaining??3600));setResult(obj.mock.result||null)}catch(e){if(live)setMessage(e instanceof Error?e.message:"Full Mock could not be loaded.")}finally{if(live)setLoading(false)}})();return()=>{live=false}},[day]);

 useEffect(()=>{if(stage!=="listening"||!listeningStarted||!lStartedAt)return;const tick=()=>setLElapsed(Math.max(0,Math.floor((Date.now()-Date.parse(lStartedAt))/1000)));tick();const id=window.setInterval(tick,1000);return()=>window.clearInterval(id)},[stage,listeningStarted,lStartedAt]);
 useEffect(()=>{
  if(stage!=="listening"||!listeningStarted||!lStartedAt||!audioRef.current)return;
  const audio=audioRef.current;
  const resume=async()=>{
   try{
    // Abandoned Full Mock Listening runs restart their audio at 0:00.
    audio.currentTime=0;
    await audio.play();setAudioState("playing");
   }catch{setAudioState("resume")}
  };
  if(audio.readyState>=1)void resume();else audio.addEventListener("loadedmetadata",resume,{once:true});
  return()=>audio.removeEventListener("loadedmetadata",resume);
 },[stage,listeningStarted,lStartedAt]);
 // Only an unfinished Full Mock Listening stage gets reset on exit.
 useEffect(()=>{
  if(stage!=="listening"||!listeningStarted||!lStartedAt)return;
  const body=JSON.stringify({action:"abandon_listening",day,started_at:lStartedAt});
  const send=()=>{
   try{
    if(navigator.sendBeacon?.("/api/challenge-mock",new Blob([body],{type:"application/json"})))return;
   }catch{}
   void fetch("/api/challenge-mock",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body,keepalive:true}).catch(()=>{});
  };
  window.addEventListener("pagehide",send);
  return()=>{window.removeEventListener("pagehide",send);send()};
 },[day,stage,listeningStarted,lStartedAt]);
 useEffect(()=>{if(stage!=="reading")return;const id=window.setInterval(()=>setRRemaining(v=>Math.max(0,v-1)),1000);return()=>window.clearInterval(id)},[stage]);
 useEffect(()=>{if(stage==="reading"&&rRemaining===0&&!busy)void submitReading(true)},[stage,rRemaining,busy]);
 useEffect(()=>{if(stage!=="writing")return;const id=window.setInterval(()=>setWRemaining(v=>Math.max(0,v-1)),1000);return()=>window.clearInterval(id)},[stage]);
 useEffect(()=>{if(stage==="writing"&&wRemaining===0&&!busy)void submitWriting(true)},[stage,wRemaining,busy]);
 useEffect(()=>{if(stage!=="assessing")return;let active=true;const check=async()=>{try{const r=await fetch("/api/challenge-mock?day="+day,{credentials:"same-origin",cache:"no-store"});const obj=await r.json();if(!active||!r.ok)return;if(obj?.mock?.stage==="completed"){setResult(obj.mock.result);setStage("completed");setMessage("")}}catch{}};void check();const id=window.setInterval(check,5000);return()=>{active=false;window.clearInterval(id)}},[stage,day]);

 function queueSave(kind:"listening"|"reading"|"writing",payload:any){
  if(saveRef.current)window.clearTimeout(saveRef.current);
  saveRef.current=window.setTimeout(()=>{void fetch("/api/challenge-mock",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save_"+kind,day,...payload})}).catch(()=>{})},500);
 }
 function setL(q:number,value:string){setLCurrentQuestion(q);setLSection(Math.ceil(q/10));setLAnswers(prev=>{const next={...prev,[String(q)]:value};queueSave("listening",{answers:next,started_at:lStartedAt,elapsed_seconds:lElapsed});return next})}
 function toggleMulti(block:any,letter:string){
  const qs=(block.questions||[]).map(Number),max=Math.max(1,Math.min(qs.length,Number(block.max_selections||2)));
  const selected=qs.map((q:number)=>lAnswers[String(q)]).filter(Boolean);
  const next=selected.includes(letter)?selected.filter((x:string)=>x!==letter):selected.length<max?[...selected,letter]:selected;
  const copy={...lAnswers};qs.forEach((q:number,i:number)=>copy[String(q)]=next[i]||"");setLCurrentQuestion(qs[0]||1);setLSection(Math.ceil((qs[0]||1)/10));setLAnswers(copy);queueSave("listening",{answers:copy,started_at:lStartedAt,elapsed_seconds:lElapsed});
 }
 function setR(q:number,value:string){setRAnswers(prev=>{const next={...prev,[String(q)]:value};queueSave("reading",{answers:next});return next})}
 function setWriting(which:1|2,value:string){if(which===1)setW1(value);else setW2(value);queueSave("writing",{task1:which===1?value:w1,task2:which===2?value:w2})}

 async function startMock(){
  setBusy(true);setMessage("");try{const r=await fetch("/api/challenge-mock",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"start",day})});const obj=await r.json();if(!r.ok)throw new Error(obj.detail||"Could not start Full Mock.");setStage("listening");setLSection(1);setLCurrentQuestion(1);document.documentElement.requestFullscreen?.().catch(()=>{})}catch(e){setMessage(e instanceof Error?e.message:"Could not start Full Mock.")}finally{setBusy(false)}
 }
 async function startListening(){
  if(busy)return;setBusy(true);setMessage("");
  try{
   const r=await fetch("/api/challenge-mock",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"start_listening",day})});
   const obj=await r.json();if(!r.ok)throw new Error(obj.detail||"Could not start Listening.");
   setLAnswers({});setLSection(1);setLCurrentQuestion(1);setLElapsed(0);setLStartedAt(obj.started_at||new Date().toISOString());setListeningStarted(true);setAudioState("idle");
  }catch(e){setMessage(e instanceof Error?e.message:"Could not start Listening.")}finally{setBusy(false)}
 }
 async function submitListening(){
  if(busy)return;if(!window.confirm("Submit Listening and continue to Reading? You cannot return to this section."))return;
  setBusy(true);setMessage("");try{if(saveRef.current)window.clearTimeout(saveRef.current);const r=await fetch("/api/challenge-mock",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"submit_listening",day,started_at:lStartedAt,answers:lAnswers,elapsed_seconds:lElapsed})});const obj=await r.json();if(!r.ok)throw new Error(obj.detail||"Could not submit Listening.");audioRef.current?.pause();if(obj.hidden_result)setPreviewListening(obj.hidden_result);setRRemaining(Number(obj.reading_remaining??3600));setStage("reading");setRPassage(1);setRTab("passage")}catch(e){setMessage(e instanceof Error?e.message:"Could not submit Listening.")}finally{setBusy(false)}
 }
 async function submitReading(auto=false){
  if(busy)return;if(!auto&&!window.confirm("Submit Reading and continue to Writing? You cannot return to Reading."))return;
  setBusy(true);setMessage("");try{if(saveRef.current)window.clearTimeout(saveRef.current);const r=await fetch("/api/challenge-mock",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"submit_reading",day,answers:rAnswers})});const obj=await r.json();if(!r.ok)throw new Error(obj.detail||"Could not submit Reading.");if(obj.hidden_result)setPreviewReading(obj.hidden_result);setWRemaining(Number(obj.writing_remaining??3600));setStage("writing");setWTask(1)}catch(e){setMessage(e instanceof Error?e.message:"Could not submit Reading.")}finally{setBusy(false)}
 }
 async function submitWriting(auto=false){
  if(busy)return;if(!auto&&(!w1.trim()||!w2.trim())){setMessage("Complete both Writing Task 1 and Task 2 before submitting.");return}
  if(!auto&&!window.confirm("Submit Writing and finish the Full Mock?"))return;
  setBusy(true);setMessage("");try{if(saveRef.current)window.clearTimeout(saveRef.current);const r=await fetch("/api/challenge-mock",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"submit_writing",day,task1:w1,task2:w2,auto,preview_listening:previewListening,preview_reading:previewReading})});const obj=await r.json();if(r.status===202){setStage("assessing");setMessage(obj.detail||"Writing is being assessed.");return}if(!r.ok)throw new Error(obj.detail||"Could not submit Writing.");setResult(obj.result);setStage("completed")}catch(e){setMessage(e instanceof Error?e.message:"Could not submit Writing.")}finally{setBusy(false)}
 }
 async function toggleFull(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{}}
 function showHighlight(){
  const sel=window.getSelection();if(!sel||sel.isCollapsed||!sel.rangeCount)return;
  const r=sel.getRangeAt(0);
  const insidePaper=paperRef.current?.contains(r.commonAncestorContainer)||questionsRef.current?.contains(r.commonAncestorContainer);
  if(!insidePaper)return;
  const nodeEl=(node:Node)=>node instanceof Element?node:node.parentElement;
  const forbidden="input,textarea,select,button,.ls-qnum,.cr-number,.cr-question-head b,.ls-bottom-nav,.cr-footer";
  if(nodeEl(r.startContainer)?.closest(forbidden)||nodeEl(r.endContainer)?.closest(forbidden))return;
  const rect=r.getBoundingClientRect();selectionRef.current=r.cloneRange();
  setHighlightPopup({x:Math.min(innerWidth-112,Math.max(112,rect.left+rect.width/2)),y:Math.max(66,rect.top-54)});
 }
 function applyHighlight(shade:"yellow"|"erase"="yellow"){
  const range=selectionRef.current,h=window.CSS?.highlights;if(!range||!h)return;
  const key="ark-mock-yellow";
  if(shade==="erase"){
   const old=h.get(key);if(old){const keep=Array.from(old).filter(r=>!(r instanceof Range&&r.compareBoundaryPoints(Range.END_TO_START,range)>0&&r.compareBoundaryPoints(Range.START_TO_END,range)<0));if(keep.length)h.set(key,new Highlight(...keep));else h.delete(key)}
  }else{
   const old=h.get(key);h.set(key,old?new Highlight(...Array.from(old),range.cloneRange()):new Highlight(range.cloneRange()));
  }
  window.getSelection()?.removeAllRanges();selectionRef.current=null;setHighlightPopup(null);
 }
 function goLQuestion(q:number){
  const next=Math.max(1,Math.min(40,q));setLCurrentQuestion(next);setLSection(Math.ceil(next/10));
  setTimeout(()=>document.getElementById("listen-q-"+next)?.scrollIntoView({behavior:"smooth",block:"center"}),30);
 }

 const lp=data?.content.listening.payload,currentSection=lp?.sections?.find((x:any)=>Number(x.number)===lSection);
 const passage=data?.content.reading.find(p=>p.ordinal===rPassage);
 const writing=data?.content.writing.payload,tasks=writing?.tasks||[],task=tasks[wTask-1];

 function gap(q:number){return <span className="ls-gap-wrap" id={"listen-q-"+q}><span className="ls-qnum">{q}</span><input value={lAnswers[String(q)]||""} onChange={e=>setL(q,e.target.value)} aria-label={"Question "+q}/></span>}
 function tokens(items:Token[]){return items.map((x,i)=>typeof x==="string"?<span key={i}>{x}</span>:<span key={i}>{gap(x.q)}</span>)}
 function renderL(block:any,idx:number){
  if(block.kind==="table")return <section className="ls-block" key={idx}><div className="ls-block-head"><b>{block.range}</b><em>{block.instruction}</em><strong>{block.word_limit}</strong></div><h2 className="ls-source-title">{block.title}</h2><div className="ls-table-scroll"><table className="ls-source-table"><thead><tr>{block.headers.map((h:string)=><th key={h}>{h}</th>)}</tr></thead><tbody>{block.rows.map((row:Token[][],ri:number)=><tr key={ri}>{row.map((cell:Token[],ci:number)=><td key={ci}>{tokens(cell)}</td>)}</tr>)}</tbody></table></div></section>;

  if(block.kind==="notes")return <section className="ls-block" key={idx}><div className="ls-block-head"><b>{block.range}</b><em>{block.instruction}</em><strong>{block.word_limit}</strong></div><div className="ls-notes-sheet"><h2>{block.title}</h2><ul>{block.items.map((it:Token[],i:number)=><li key={i}>{tokens(it)}</li>)}</ul></div></section>;
  if(block.kind==="matching")return <section className="ls-block" key={idx}><div className="ls-block-head"><b>{block.range}</b><em>{block.instruction}</em><strong>{block.word_limit}</strong></div>{block.title&&<h2 className="ls-source-title">{block.title}</h2>}{block.image_url&&<div className="ls-map-image-wrap"><img src={block.image_url} alt={block.image_alt||"Listening visual"}/></div>}{!block.hide_choices&&<div className="ls-choice-box">{Object.entries(block.choices||{}).map(([k,v])=><p key={k}><b>{k}</b><span>{String(v)}</span></p>)}</div>}<div className="ls-match-list">{(block.items||[]).map((it:any)=><div className="ls-match" id={"listen-q-"+it.q} key={it.q}><span className="ls-qnum static">{it.q}</span><b>{it.text}</b><select value={lAnswers[String(it.q)]||""} onChange={e=>setL(it.q,e.target.value)}><option value="">Choose</option>{Object.keys(block.choices||{}).map(k=><option key={k}>{k}</option>)}</select></div>)}</div></section>;
  if(block.kind==="mcq")return <section className="ls-block" key={idx}><div className="ls-block-head"><b>{block.range}</b><em>{block.instruction}</em></div>{block.title&&<h2 className="ls-source-title">{block.title}</h2>}<div>{(block.questions||[]).map((q:any)=><article className="ls-mcq" id={"listen-q-"+q.q} key={q.q}><div className="ls-q-title"><span className="ls-qnum static">{q.q}</span><b>{q.text}</b></div><div className="ls-options">{Object.entries(q.options||{}).map(([letter,text])=><label className="ls-option" key={letter}><input type="radio" name={"mq"+q.q} checked={lAnswers[String(q.q)]===letter} onChange={()=>setL(q.q,letter)}/><b>{letter}</b><span>{String(text)}</span></label>)}</div></article>)}</div></section>;
  if(block.kind==="choose_two"||block.kind==="choose_many"){
   const qs=(block.questions||[]).map(Number),selected=qs.map((q:number)=>lAnswers[String(q)]).filter(Boolean);
   return <section className="ls-block" key={idx}><div className="ls-block-head"><b>{block.range}</b><em>{block.instruction}</em></div><div className="ls-two"><h3>{block.question}</h3><div>{Object.entries(block.options||{}).map(([letter,text])=><label className="ls-check" key={letter}><input type="checkbox" checked={selected.includes(letter)} onChange={()=>toggleMulti(block,letter)}/><b>{letter}</b><span>{String(text)}</span></label>)}</div></div></section>
  }
  if(block.kind==="notes_groups")return <section className="ls-block" key={idx}><div className="ls-block-head"><b>{block.range}</b><em>{block.instruction}</em><strong>{block.word_limit}</strong></div><div className="ls-notes-sheet"><h2>{block.title}</h2>{(block.groups||[]).map((g:any,gi:number)=><div className="ls-note-group" key={gi}><h3>{g.heading}</h3>{g.intro&&<p>{g.intro}</p>}<ul>{(g.items||[]).map((it:Token[],i:number)=><li key={i}>{tokens(it)}</li>)}</ul></div>)}</div></section>;
  return null;
 }
 function renderRQ(q:Q){
  if(q.type==="select")return <div className="cr-question" key={q.number} id={"question-"+q.number}><div className="cr-question-head"><b>{q.number}</b><span>{q.text}</span></div><select className="cr-gap cr-select" aria-label={"Answer to question "+q.number} value={rAnswers[String(q.number)]||""} onChange={e=>setR(q.number,e.target.value)}><option value="">Select your answer</option>{(q.options||[]).map(opt=><option key={opt} value={optionValue(opt)}>{opt}</option>)}</select></div>;
  if(q.type==="tfng")return <div className="cr-question" key={q.number} id={"question-"+q.number}><div className="cr-question-head"><b>{q.number}</b><span>{q.text}</span></div><div className="cr-options">{(q.options?.length?q.options:["TRUE","FALSE","NOT GIVEN"]).map(opt=><label key={opt}><input type="radio" checked={rAnswers[String(q.number)]===opt} onChange={()=>setR(q.number,opt)}/><span className="cr-radio"/>{opt}</label>)}</div></div>;
  if(q.type==="mcq")return <div className="cr-question" key={q.number} id={"question-"+q.number}><div className="cr-question-head"><b>{q.number}</b><span>{q.text}</span></div><div className="cr-options">{(q.options||[]).map(opt=>{const v=optionValue(opt);return <label key={opt}><input type="radio" checked={rAnswers[String(q.number)]===v} onChange={()=>setR(q.number,v)}/><span className="cr-radio"/>{opt}</label>})}</div></div>;
  return <div className="cr-question" key={q.number} id={"question-"+q.number}><div className="cr-question-head"><b>{q.number}</b><span><ReadingGapSentence text={q.text} input={<input className="cr-gap cr-inline-gap" type="text" placeholder="Answer" autoComplete="off" spellCheck={false} aria-label={"Answer to question "+q.number} value={rAnswers[String(q.number)]||""} onChange={e=>setR(q.number,e.target.value)}/>} /></span></div></div>;
 }


 if(loading)return <LoadingIndicator/>;
 if(!data)return <main className="mock-loading"><span>FULL MOCK</span><b>{message||"Mock unavailable."}</b><AnimatedBackButton onClick={()=>router.push("/dashboard")} ariaLabel="Back to dashboard"/></main>;

 if(stage==="not_started")return <main className="mock-entry"><header className="mock-entry-top"><AnimatedBackButton href="/dashboard"/><b>ARK EDUCATION · FULL MOCK</b><span>{data.preview?"PREVIEW MODE":mockDateText}</span></header><section className="mock-entry-card"><small>DAY {String(day).padStart(2,"0")} · IELTS FULL MOCK</small><h1>Listening → Reading → Writing</h1><p>Complete all three sections in order. Section scores stay hidden until the Writing assessment is finished.</p><div className="mock-entry-steps"><div><Headphones/><b>Listening</b><span>40 questions · audio once</span></div><div><BookOpen/><b>Reading</b><span>40 questions · 60 minutes</span></div><div><PenLine/><b>Writing</b><span>Task 1 + Task 2 · 60 minutes</span></div></div>{data.preview&&<div className="mock-preview-note"><ShieldCheck size={16}/> Teacher preview · nothing is saved to real student results.</div>}<button disabled={busy} onClick={startMock}>{busy?"Opening…":"Start Full Mock"} <ChevronRight size={17}/></button>{message&&<p className="mock-error">{message}</p>}</section></main>;

 if(stage==="listening")return <main className="ls-shell mock-section-shell">
  <audio ref={audioRef} preload="auto" src={lp.audio_url} onPlay={()=>setAudioState("playing")} onEnded={()=>setAudioState("ended")} onPause={()=>{if(listeningStarted&&audioState==="playing"){audioRef.current?.play().catch(()=>setAudioState("resume"))}}}/>
  <header className="ls-topbar"><div className="ls-back"><LockKeyhole size={17}/></div><div className="ls-top-title">FULL MOCK · LISTENING</div><div className="ls-top-actions">{listeningStarted&&<span className={"ls-audio-state "+audioState}><Volume2 size={14}/>{audioState==="ended"?"Audio finished":audioState==="resume"?"Audio needs permission":"Playing"} <i>{fmt(lElapsed)}</i></span>}<button className="ls-full" onClick={toggleFull}>{full?<Minimize2 size={17}/>:<Maximize2 size={17}/>}</button></div></header>
  {!listeningStarted?<section className="ls-start-card"><span className="ls-start-icon"><Headphones size={27}/></span><small>FULL MOCK · SECTION 1 OF 3</small><h1>Listening</h1><p>40 questions · 4 sections. If you leave before submitting, your unfinished Listening will restart from the beginning.</p><div className="ls-start-meta"><div><b>4</b><span>Sections</span></div><div><b>40</b><span>Questions</span></div><div><b>1×</b><span>Playback</span></div></div><button disabled={busy} onClick={startListening}><Headphones size={17}/> {busy?"Starting…":"Start Listening"}</button></section>:<>
   {audioState==="resume"&&<div className="ls-resume-banner"><Volume2 size={16}/><div><b>Audio needs permission</b><span>Tap to play the recording.</span></div><button onClick={()=>audioRef.current?.play().then(()=>setAudioState("playing")).catch(()=>{})}>Resume audio</button></div>}
   <section className="ls-instruction"><div><b>{currentSection?.label}</b><span>{currentSection?.range}</span></div></section>
   <div className="ls-workspace"><section className="ls-question-paper" ref={paperRef} onMouseUp={showHighlight}>{currentSection?.blocks?.map((b:any,i:number)=>renderL(b,i))}</section></div>
   {highlightPopup&&<div className="ls-selection-popup" style={{left:highlightPopup.x,top:highlightPopup.y}} onMouseDown={e=>e.preventDefault()}><button className="yellow" onClick={()=>applyHighlight("yellow")}><span/> Highlight</button><button onClick={()=>applyHighlight("erase")}><Eraser size={15}/> Remove</button></div>}
   <nav className="ls-bottom-nav">
    <button className="ls-arrow" disabled={lCurrentQuestion<=1} onClick={()=>goLQuestion(lCurrentQuestion-1)}><ChevronLeft size={17}/></button>
    <div className="ls-number-groups">{[1,2,3,4].map(sec=><div className={lSection===sec?"active":""} key={sec}><span>SECTION {sec}</span><div>{Array.from({length:10},(_,i)=>(sec-1)*10+i+1).map(q=><button key={q} className={(lCurrentQuestion===q?"current ":"")+(lAnswers[String(q)]?"answered":"")} onClick={()=>goLQuestion(q)}>{q}</button>)}</div></div>)}</div>
    <button className="ls-submit" disabled={busy} onClick={submitListening}>{busy?"Submitting…":"Submit Listening"} <Send size={15}/></button>
    <button className="ls-arrow" disabled={lCurrentQuestion>=40} onClick={()=>goLQuestion(lCurrentQuestion+1)}><ChevronRight size={17}/></button>
   </nav>
  </>}
  {message&&<div className="mock-floating-message">{message}</div>}
  <style jsx global>{`::highlight(ark-mock-yellow){background:#ffe58a;color:inherit}`}</style>
 </main>;

 if(stage==="reading"){
  const groups:(Q[])[]=[];
  for(const q of passage?.questions||[]){const last=groups[groups.length-1];if(!last||last[0]?.instruction!==q.instruction)groups.push([q]);else last.push(q)}
  const partAnswered=(passage?.questions||[]).filter(q=>rAnswers[String(q.number)]).length;
  const totalAnswered=Object.values(rAnswers).filter(Boolean).length;
  return <main className="cr-shell mock-reading-shell">
   <header className="cr-header"><div className="cr-head-start"><LockKeyhole size={17}/></div><div className="cr-head-center"><div className="cr-timer-controls"><span className="cr-time"><Clock3 size={17}/>{fmt(rRemaining)}</span></div></div><div className="cr-head-end"><span className="cr-head-practice">FULL MOCK · PART {String(rPassage).padStart(2,"0")}</span><button className="cr-fullscreen" onClick={toggleFull}>{full?<Minimize2 size={18}/>:<Maximize2 size={18}/>}</button></div></header>
   <div className="cr-instructions"><div><small>FULL MOCK · IELTS READING</small><p>3 passages <span>·</span> 40 questions <span>·</span> 60-minute countdown</p></div><div className="cr-tools"></div></div>
   <div className="cr-mobile-tabs"><button className={rTab==="passage"?"active":""} onClick={()=>setRTab("passage")}>Passage</button><button className={rTab==="questions"?"active":""} onClick={()=>setRTab("questions")}>Questions</button></div>
   <div className="cr-split">
    <section style={{display:rTab==="questions"?"var(--cr-hide-passage)":"block"}} className="cr-pane cr-passage" ref={paperRef} onMouseUp={showHighlight} onTouchEnd={()=>setTimeout(showHighlight,100)}><h2>{passage?.title}</h2>{passage?.text.split(/\n\s*\n/).filter(Boolean).map((p,i)=><p key={i}>{p}</p>)}</section>
    <section style={{display:rTab==="passage"?"var(--cr-hide-questions)":"block"}} className="cr-pane cr-questions" ref={questionsRef} onMouseUp={showHighlight} onTouchEnd={()=>setTimeout(showHighlight,100)}>
     {groups.map((group,gi)=><section className="cr-qgroup" key={gi}><div className="cr-qgroup-head"><h3>Questions {group[0].number}{group.length>1?"–"+group[group.length-1].number:""}</h3>{group[0].instruction&&<p>{compactReadingInstruction(group[0].instruction,group[0].type==="select")}</p>}</div>{group.map(renderRQ)}</section>)}
    </section>
   </div>
   {highlightPopup&&<div className="cr-highlight-menu" style={{left:highlightPopup.x,top:highlightPopup.y}} onMouseDown={e=>e.preventDefault()}><button aria-label="Yellow highlight" onClick={()=>applyHighlight("yellow")}><i className="swatch yellow"/></button><span className="cr-menu-sep"/><button aria-label="Remove highlight" onClick={()=>applyHighlight("erase")}><Eraser size={17}/></button></div>}
   <footer className="cr-footer mock-reading-footer">
    <div className="mock-part-nav">{[1,2,3].map(part=><button key={part} className={rPassage===part?"active":""} onClick={()=>{setRPassage(part);setRTab("passage")}}>PART {part}</button>)}</div>
    <div className="cr-number-strip" aria-label="Question navigation">{(passage?.questions||[]).map(q=><button key={q.number} className={rAnswers[String(q.number)]?"answered":""} onClick={()=>{setRTab("questions");setTimeout(()=>document.getElementById("question-"+q.number)?.scrollIntoView({behavior:"smooth",block:"center"}),20)}}>{q.number}</button>)}</div>
    <span className="cr-answer-count">{totalAnswered+" / 40 answered"}</span>
    <button className="cr-submit" disabled={busy} onClick={()=>submitReading(false)}><Send size={15}/> {busy?"Submitting…":"Submit Reading"}</button>
   </footer>
   {message&&<div className="mock-floating-message">{message}</div>}
   <style jsx global>{`::highlight(ark-mock-yellow){background:#ffe58a;color:inherit}`}</style>
  </main>
 }

 if(stage==="writing")return <main className="writing-shell mock-writing-shell">
  <header className="writing-topbar"><div className="writing-back-slot"><LockKeyhole size={17}/></div><div className="writing-top-center"><span>FULL MOCK</span><b>Writing</b></div><div className="writing-top-meta"><strong className={wRemaining<=300?"urgent":""}><Clock3 size={16}/>{fmt(wRemaining)}</strong><button className="writing-fullscreen" onClick={toggleFull}>{full?<Minimize2 size={18}/>:<Maximize2 size={18}/>}</button></div></header>
  <section className="writing-toolbar"><div className="mock-writing-tabs"><button className={"writing-task-chip "+(wTask===1?"active":"")} onClick={()=>setWTask(1)}>Writing Task 1 <b>{words(w1)}</b></button><button className={"writing-task-chip "+(wTask===2?"active":"")} onClick={()=>setWTask(2)}>Writing Task 2 <b>{words(w2)}</b></button><span className="writing-rule">Task 1 + Task 2 · 60 minutes total</span></div><div className="writing-controls"><button className="submit" disabled={busy||!w1.trim()||!w2.trim()} onClick={()=>submitWriting(false)}><Send size={16}/>{busy?"Submitting…":"Submit Writing"}</button></div></section>
  <div className="writing-stage">
   <section className="writing-task-pane"><div className="writing-pane-head"><span>QUESTION</span><b>{task.label}</b></div><div className="writing-paper"><p className="writing-time-note">Recommended: about {Math.round(Number(task.recommended_seconds||0)/60)} minutes.</p>{wTask===2&&<p className="writing-topic-note">Write about the following topic:</p>}<div className="writing-prompt">{task.prompt}</div>{task.visual?.kind==="table"&&<div className="mock-writing-table-wrap"><table className="mock-writing-table"><thead><tr>{task.visual.headers.map((h:string)=><th key={h}>{h}</th>)}</tr></thead><tbody>{task.visual.rows.map((row:string[],i:number)=><tr key={i}>{row.map((c,j)=><td key={j}>{c}</td>)}</tr>)}</tbody></table></div>}{(task.instructions||[]).map((x:string,i:number)=><p className="writing-instruction" key={i}>{x}</p>)}<p className="writing-min">Write at least {task.min_words} words.</p></div></section>
   <section className="writing-answer-pane"><div className="writing-pane-head"><span>YOUR ANSWER</span><div><b>{words(wTask===1?w1:w2)} words</b><i className={words(wTask===1?w1:w2)>=task.min_words?"ok":""}>{words(wTask===1?w1:w2)>=task.min_words?"Minimum reached":"Keep writing"}</i></div></div><div className="writing-editor-wrap"><textarea value={wTask===1?w1:w2} onChange={e=>setWriting(wTask,e.target.value)} spellCheck={false} placeholder={"Type "+task.label+" here…"}/></div><div className="writing-editor-footer"><span><ShieldCheck size={14}/> Draft auto-saved</span><span>{fmt(wRemaining)} remaining</span></div></section>
  </div>
  {message&&<div className="mock-floating-message">{message}</div>}
 </main>;

 if(stage==="assessing")return <main className="mock-assessing"><section><div className="mock-assess-spinner"/><small>FULL MOCK · WRITING</small><h1>Writing is being assessed…</h1><p>{message||"Your Listening and Reading scores remain hidden until the Writing result is ready."}</p><button onClick={()=>location.reload()}>Check status</button></section></main>;

 return <main className="mock-result-page"><header className="mock-entry-top"><AnimatedBackButton href="/dashboard"/><b>ARK EDUCATION · FULL MOCK</b><span>COMPLETED</span></header><section className="mock-result-card"><small>{mockDateText} · FULL MOCK RESULT</small><h1>Mock Overall <b>{Number(result?.overall||0).toFixed(1)}</b></h1><div className="mock-result-grid"><article><Headphones/><span>Listening</span><strong>{result?.listening?.score ?? "—"}<i>/40</i></strong><b>Band {Number(result?.listening?.band||0).toFixed(1)}</b></article><article><BookOpen/><span>Reading</span><strong>{result?.reading?.score ?? "—"}<i>/40</i></strong><b>Band {Number(result?.reading?.band||0).toFixed(1)}</b></article><article><PenLine/><span>Writing</span><strong>{Number(result?.writing?.band||0).toFixed(1)}</strong><b>AI assessed</b></article></div>{result?.writing?.assessment&&<div className="mock-writing-feedback"><h2>Writing assessment</h2><div><span>Task 1 <b>{Number(result.writing.assessment.task1?.band||0).toFixed(1)}</b></span><span>Task 2 <b>{Number(result.writing.assessment.task2?.band||0).toFixed(1)}</b></span></div><p>{result.writing.assessment.summary}</p></div>}{result?.review&&<div className="mock-answer-review"><h2>Answer review</h2>{(["listening","reading"] as const).map(section=><details key={section}><summary>{section==="listening"?"Listening":"Reading"} · 40 answers</summary><div className="mock-review-scroll"><table><thead><tr><th>Question</th><th>Your answer</th><th>Accepted answers</th><th>Result</th></tr></thead><tbody>{result.review[section].map((item:any)=><tr key={item.number}><th>{item.number}{item.question&&<small>{item.question}</small>}</th><td>{item.submitted||"—"}</td><td>{item.correct.join(" / ")}</td><td className={item.status}>{item.status==="correct"?"Correct":item.status==="empty"?"Empty":"Wrong"}</td></tr>)}</tbody></table></div></details>)}</div>}<AnimatedBackButton onClick={()=>router.push("/dashboard")} ariaLabel="Back to dashboard"/></section></main>;
}
