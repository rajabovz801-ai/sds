"use client";

import AnimatedBackButton from "../../../components/animated-back-button";
import StudyTimeHeartbeat from "../../../components/study-time-heartbeat";
import {useParams,useRouter} from "next/navigation";
import {Fragment,useCallback,useEffect,useMemo,useRef,useState} from "react";
import {Check,CheckCircle2,ChevronLeft,ChevronRight,Clock3,Eraser,Headphones,LockKeyhole,Maximize2,Minimize2,RefreshCcw,Send,Volume2,XCircle} from "lucide-react";
import "./listening.css";

type Token=string|{q:number};
type Payload={test_code:string;audio_url:string;total_questions:number;audio_once:boolean;sections:any[]};
type ReviewItem={number:number;submitted:string;correct:string[];status:"correct"|"wrong"|"empty"};
type Attempt={id:string;attempt_number:number;status:string;answers:Record<string,string>;started_at:string;submitted_at?:string|null;elapsed_seconds:number;part_scores?:number[]|null;score?:number|null;band?:number|null;review?:ReviewItem[]};
type ApiData={content:{title:string;payload:Payload};attempt:Attempt|null;preview:boolean};
type Result={score:number;band:number;part_scores:number[];elapsed_seconds:number;submitted_at?:string;attempt_number?:number};

function secLabel(v:number){const s=Math.max(0,Math.floor(v||0));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")}
function answerStatus(review:ReviewItem[]|null,q:number){return review?.find(x=>x.number===q)}
function qSection(q:number){return q<=10?1:q<=20?2:q<=30?3:4}

export default function ListeningPage(){
 const params=useParams<{day:string}>(),router=useRouter();
 const day=Number(params.day)||1;
 const [data,setData]=useState<ApiData|null>(null);
 const [attemptId,setAttemptId]=useState("");
 const [attemptNumber,setAttemptNumber]=useState(1);
 const [answers,setAnswers]=useState<Record<string,string>>({});
 const [startedAt,setStartedAt]=useState("");
 const [started,setStarted]=useState(false);
 const [section,setSection]=useState(1);
 const [currentQuestion,setCurrentQuestion]=useState(1);
 const [loading,setLoading]=useState(true);
 const [message,setMessage]=useState("");
 const [saving,setSaving]=useState(false);
 const [audioStatus,setAudioStatus]=useState<"idle"|"playing"|"resume"|"ended">("idle");
 const [result,setResult]=useState<Result|null>(null);
 const [review,setReview]=useState<ReviewItem[]|null>(null);
 const [reviewMode,setReviewMode]=useState(false);
  const [confirmSubmit,setConfirmSubmit]=useState(false);
  const confirmCancelRef=useRef<HTMLButtonElement|null>(null);
 const [full,setFull]=useState(false);
 const [submitting,setSubmitting]=useState(false);
 const [elapsed,setElapsed]=useState(0);
 const audioRef=useRef<HTMLAudioElement|null>(null);
 const saveTimer=useRef<number|null>(null);
 const startedRef=useRef(false);
 const selectionRangeRef=useRef<Range|null>(null);
 const paperRef=useRef<HTMLElement|null>(null);
 const [highlightPopup,setHighlightPopup]=useState<{x:number;y:number}|null>(null);

 const payload=data?.content.payload;
 const sections=payload?.sections||[];
 const currentSection=sections.find((s:any)=>Number(s.number)===section);
  const answeredCount=Object.values(answers).filter(v=>String(v).trim().length>0).length;
  useEffect(()=>{
   if(!confirmSubmit)return;
   confirmCancelRef.current?.focus();
   const onEscape=(event:KeyboardEvent)=>{if(event.key==="Escape"&&!submitting)setConfirmSubmit(false)};
   window.addEventListener("keydown",onEscape);
   return ()=>window.removeEventListener("keydown",onEscape);
  },[confirmSubmit,submitting]);

 const load=useCallback(async()=>{
  setLoading(true);setMessage("");
  try{
   const res=await fetch("/api/challenge-listening?day="+day,{credentials:"same-origin",cache:"no-store"});
   const obj=await res.json();if(!res.ok)throw new Error(obj.detail||"Could not load Listening.");
   setData(obj);
   const a=obj.attempt as Attempt|null;
   if(a){
    setAttemptId(a.id);setAttemptNumber(Number(a.attempt_number||1));setStartedAt(a.started_at||"");
    if(a.status==="submitted"){
     setResult({score:Number(a.score||0),band:Number(a.band||0),part_scores:a.part_scores||[0,0,0,0],elapsed_seconds:Number(a.elapsed_seconds||0),submitted_at:a.submitted_at||undefined,attempt_number:Number(a.attempt_number||1)});
     setAnswers(a.answers||{});setReview(a.review||null);setReviewMode(false);setStarted(false);
    }else{
     // Abandoned Listening opens with a clean Start screen.
     setAnswers({});setStarted(false);startedRef.current=false;
     setAudioStatus("idle");setElapsed(0);setCurrentQuestion(1);setSection(1);
    }
   }
  }catch(e){setMessage(e instanceof Error?e.message:"Could not load Listening.")}finally{setLoading(false)}
 },[day]);

 useEffect(()=>{void load()},[load]);
 useEffect(()=>{const fn=()=>setFull(!!document.fullscreenElement);document.addEventListener("fullscreenchange",fn);return()=>document.removeEventListener("fullscreenchange",fn)},[]);
 useEffect(()=>{
  if(!started||!startedAt)return;
  const tick=()=>setElapsed(Math.max(0,Math.floor((Date.now()-Date.parse(startedAt))/1000)));
  tick();const id=window.setInterval(tick,1000);return()=>window.clearInterval(id);
 },[started,startedAt]);

 useEffect(()=>{
  if(!started||!payload?.audio_url||!audioRef.current)return;
  const audio=audioRef.current;
  const resume=async()=>{
   try{
    // Autoplay permission retries should not rewind during a running session.
    await audio.play();setAudioStatus("playing");
   }catch{
    setAudioStatus("resume");
   }
  };
  if(audio.readyState>=1)void resume();else audio.addEventListener("loadedmetadata",resume,{once:true});
  return()=>audio.removeEventListener("loadedmetadata",resume);
 },[started,payload?.audio_url]);

 useEffect(()=>()=>{if(saveTimer.current)window.clearTimeout(saveTimer.current)},[]);

 function clearHighlights(){
  const h=window.CSS?.highlights;
  if(h)h.delete("ark-listening-yellow");
  selectionRangeRef.current=null;
  setHighlightPopup(null);
 }
 useEffect(()=>{clearHighlights()},[section,reviewMode]);
 useEffect(()=>{
  const hide=(event:MouseEvent)=>{
   const target=event.target as Element|null;
   if(target?.closest(".ls-selection-popup"))return;
   setHighlightPopup(null);
  };
  document.addEventListener("mousedown",hide);
  return()=>document.removeEventListener("mousedown",hide);
 },[]);

 function showHighlightMenu(){
  if(!started||reviewMode||result)return;
  const selection=window.getSelection();
  if(!selection||selection.isCollapsed||!selection.rangeCount)return;
  const range=selection.getRangeAt(0);
  if(!paperRef.current?.contains(range.commonAncestorContainer))return;
  const forbidden=".ls-qnum,input,textarea,select,button,.ls-bottom-nav,.ls-topbar,.ls-inline-review,.ls-review-line";
  const elementOf=(node:Node)=>node instanceof Element?node:node.parentElement;
  if(elementOf(range.startContainer)?.closest(forbidden)||elementOf(range.endContainer)?.closest(forbidden))return;
  const rect=range.getBoundingClientRect();
  selectionRangeRef.current=range.cloneRange();
  setHighlightPopup({
   x:Math.min(window.innerWidth-112,Math.max(112,rect.left+rect.width/2)),
   y:Math.max(66,rect.top-54)
  });
 }
 function applyHighlight(shade:"yellow"|"erase"="yellow"){
  const range=selectionRangeRef.current;
  const highlights=window.CSS?.highlights;
  if(!range||!highlights){setMessage("Please use an updated Chrome, Edge or Safari for text highlighting.");return}
  const key="ark-listening-yellow";
  if(shade==="erase"){
   const old=highlights.get(key);
   if(old){
    const keep=Array.from(old).filter(r=>!(r instanceof Range&&r.compareBoundaryPoints(Range.END_TO_START,range)>0&&r.compareBoundaryPoints(Range.START_TO_END,range)<0));
    if(keep.length)highlights.set(key,new Highlight(...keep));else highlights.delete(key);
   }
  }else{
   const old=highlights.get(key);
   highlights.set(key,old?new Highlight(...Array.from(old),range.cloneRange()):new Highlight(range.cloneRange()));
  }
  window.getSelection()?.removeAllRanges();
  selectionRangeRef.current=null;
  setHighlightPopup(null);
 }

 async function startTest(){
  setMessage("");
  try{
   const res=await fetch("/api/challenge-listening",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"start",day})});
   const obj=await res.json();if(!res.ok)throw new Error(obj.detail||"Could not start Listening.");
   const a=obj.attempt as Attempt;
   setAttemptId(a.id);setAttemptNumber(Number(a.attempt_number||1));setAnswers({});setStartedAt(a.started_at);setStarted(true);startedRef.current=true;setSection(1);setCurrentQuestion(1);setElapsed(0);setAudioStatus("idle");
   try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen?.()}catch{}
   requestAnimationFrame(async()=>{
    const audio=audioRef.current;if(!audio)return;
    try{audio.currentTime=0;await audio.play();setAudioStatus("playing")}catch{setAudioStatus("resume")}
   });
  }catch(e){setMessage(e instanceof Error?e.message:"Could not start Listening.")}
 }
 async function retryTest(){
  if(!window.confirm("Start a new Listening attempt?\n\nYour previous result will stay saved as an earlier attempt."))return;
  setSubmitting(true);setMessage("");
  try{
   const res=await fetch("/api/challenge-listening",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"retry",day})});
   const obj=await res.json();if(!res.ok)throw new Error(obj.detail||"Could not start another Listening attempt.");
   const a=obj.attempt as Attempt;
   setAttemptId(a.id);setAttemptNumber(Number(a.attempt_number||attemptNumber+1));setAnswers({});setStartedAt(a.started_at);setElapsed(0);
   setResult(null);setReview(null);setReviewMode(false);setStarted(true);startedRef.current=true;setSection(1);setCurrentQuestion(1);setAudioStatus("idle");
   setData(prev=>prev?{...prev,attempt:a}:prev);
   try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen?.()}catch{}
   requestAnimationFrame(async()=>{
    const audio=audioRef.current;if(!audio)return;
    try{audio.currentTime=0;await audio.play();setAudioStatus("playing")}catch{setAudioStatus("resume")}
   });
  }catch(e){setMessage(e instanceof Error?e.message:"Could not start another Listening attempt.")}
  finally{setSubmitting(false)}
 }

 async function resumeAudio(){
  const audio=audioRef.current;if(!audio)return;
  try{
   if(audio.ended)audio.currentTime=0;
   await audio.play();setAudioStatus("playing");
  }catch{setMessage("Your browser blocked audio playback. Tap Resume audio again.")}
 }
 function queueSave(next:Record<string,string>){
  if(data?.preview||!attemptId||result)return;
  if(saveTimer.current)window.clearTimeout(saveTimer.current);
  saveTimer.current=window.setTimeout(async()=>{
   setSaving(true);
   try{
    const res=await fetch("/api/challenge-listening",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save",day,attempt_id:attemptId,started_at:startedAt,answers:next})});
    if(!res.ok){const o=await res.json().catch(()=>({}));throw new Error(o.detail||"Could not save answers.")}
   }catch(e){setMessage(e instanceof Error?e.message:"Could not save answers.")}finally{setSaving(false)}
  },450);
 }
 function setAnswer(q:number,value:string){
  if(reviewMode||result)return;
  setCurrentQuestion(q);setSection(qSection(q));
  setAnswers(prev=>{const next={...prev,[String(q)]:value};queueSave(next);return next});
 }
 function togglePair(block:any,letter:string){
  if(reviewMode||result)return;
  const qs=(block.questions||[]).map(Number);
  const max=Math.max(1,Math.min(qs.length,Number(block.max_selections||2)));
  const selected=qs.map((q:number)=>answers[String(q)]).filter(Boolean);
  const next=selected.includes(letter)?selected.filter((x:string)=>x!==letter):selected.length<max?[...selected,letter]:selected;
  const copy={...answers};qs.forEach((q:number,i:number)=>{copy[String(q)]=next[i]||""});
  setCurrentQuestion(qs[0]);setAnswers(copy);queueSave(copy);
 }
 async function submit(){
  if(submitting||!attemptId||result)return;
  if(saveTimer.current)window.clearTimeout(saveTimer.current);
  setSubmitting(true);setMessage("");
  try{
   const res=await fetch("/api/challenge-listening",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"submit",day,attempt_id:attemptId,started_at:startedAt,answers,elapsed_seconds:elapsed})});
   const obj=await res.json();if(!res.ok)throw new Error(obj.detail||"Could not submit Listening.");
   setResult(obj.result);setReview(obj.review);setReviewMode(false);setConfirmSubmit(false);setStarted(false);startedRef.current=false;
   try{audioRef.current?.pause()}catch{}
  }catch(e){setConfirmSubmit(false);setMessage(e instanceof Error?e.message:"Could not submit Listening.")}finally{setSubmitting(false)}
 }
 async function goBack(){
  try{if(document.fullscreenElement)await document.exitFullscreen()}catch{}
  router.push("/day/"+day);
 }
 async function toggleFull(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{}}
 function goQuestion(q:number){setCurrentQuestion(q);setSection(qSection(q));setTimeout(()=>document.getElementById("listen-q-"+q)?.scrollIntoView({behavior:"smooth",block:"center"}),80)}
  function goPart(s:number){setSection(s);setCurrentQuestion((s-1)*10+1);window.scrollTo({top:0,behavior:"smooth"})}

 function renderGap(q:number){
  const st=answerStatus(review,q);
  return <span className={"ls-gap-wrap "+(st?st.status:"")} id={"listen-q-"+q}><span className="ls-qnum">{q}</span><input aria-label={"Question "+q} disabled={reviewMode||!!result} value={answers[String(q)]||""} onFocus={()=>{setCurrentQuestion(q);setSection(qSection(q))}} onChange={e=>setAnswer(q,e.target.value)} /></span>;
 }
 function tokens(items:Token[],key:string){
  const statuses=reviewMode?items.filter((t):t is {q:number}=>typeof t!=="string").map(t=>({q:t.q,st:answerStatus(review,t.q)})).filter((x):x is {q:number;st:ReviewItem}=>!!x.st):[];
   return <>{items.map((t,i)=><Fragment key={key+"-"+i}>{typeof t==="string"?<span className={i>0&&items[i-1]&&typeof items[i-1]!=="string"?"ls-after-gap":""}>{t}</span>:renderGap(Number(t.q))} {typeof t==="string"&&i<items.length-1&&typeof items[i+1]==="string"?<br/>:null}</Fragment>)}{statuses.length>0&&<div className="ls-token-review" aria-label="Answer review for this line">{statuses.map(({q,st})=><span className={"ls-token-review-item "+st.status} key={q}><b>Q{q}</b><span>{st.status==="empty"?"No answer":st.status==="correct"?"Correct":"Your answer: "+(st.submitted||"—")}</span><strong>Correct: {st.correct.join(" / ")}</strong></span>)}</div>}</>;
 }
 function Status({q}:{q:number}){const st=answerStatus(review,q);if(!reviewMode||!st)return null;return <div className={"ls-review-line "+st.status}><span>{st.status==="empty"?"No answer":"Your answer: "+(st.submitted||"—")}</span><b>Correct: {st.correct.join(" / ")}</b></div>}

 function renderBlock(block:any,idx:number){
  if(block.kind==="table")return <section className="ls-block" key={idx}><div className="ls-block-head"><b>{block.range}</b><em>{block.instruction}</em><strong>{block.word_limit}</strong></div><h2 className="ls-source-title">{block.title}</h2><div className="ls-table-scroll"><table className="ls-source-table"><thead><tr>{block.headers.map((h:string)=><th key={h}>{h}</th>)}</tr></thead><tbody>{block.rows.map((row:any[],ri:number)=><tr key={ri}>{row.map((cell:Token[],ci:number)=><td key={ci}>{tokens(cell,"t"+ri+"-"+ci)}</td>)}</tr>)}</tbody></table></div></section>;
  if(block.kind==="notes")return <section className="ls-block" key={idx}><div className="ls-block-head"><b>{block.range}</b><em>{block.instruction}</em><strong>{block.word_limit}</strong></div><div className="ls-note-box"><h3>{block.title}</h3><ul>{block.items.map((it:Token[],i:number)=><li key={i}>{tokens(it,"n"+i)}</li>)}</ul></div></section>;
  if(block.kind==="mcq")return <section className="ls-block" key={idx}><div className="ls-block-head"><b>{block.range}</b><em>{block.instruction}</em></div><h2 className="ls-source-title">{block.title}</h2><div className="ls-mcq-list">{block.questions.map((q:any)=><article className="ls-mcq" id={"listen-q-"+q.q} key={q.q}><h3><span>{q.q}</span>{q.text}</h3><div>{Object.entries(q.options).map(([letter,text])=><label className={"ls-option "+(reviewMode&&String(answers[String(q.q)]||"")===letter?(answerStatus(review,q.q)?.status==="correct"?"picked-correct":"picked-wrong"):"")} key={letter}><input disabled={reviewMode||!!result} type="radio" name={"q"+q.q} value={letter} checked={answers[String(q.q)]===letter} onChange={()=>setAnswer(q.q,letter)}/><b>{letter}</b><span>{String(text)}</span></label>)}</div><Status q={q.q}/></article>)}</div></section>;
  if(block.kind==="matching")return <section className="ls-block" key={idx}><div className="ls-block-head"><b>{block.range}</b><em>{block.instruction}</em><strong>{block.word_limit}</strong></div>{block.title&&<h2 className="ls-source-title">{block.title}</h2>}{block.image_url&&<div className="ls-map-image-wrap"><img src={block.image_url} alt={block.image_alt||block.title||"Listening map"}/></div>}{!block.hide_choices&&<div className="ls-choice-box">{Object.entries(block.choices).map(([k,v])=><p key={k}><b>{k}</b><span>{String(v)}</span></p>)}</div>}<div className="ls-match-list">{block.items.map((it:any)=><div className="ls-match" id={"listen-q-"+it.q} key={it.q}><span className="ls-qnum static">{it.q}</span><b>{it.text}</b><select disabled={reviewMode||!!result} value={answers[String(it.q)]||""} onChange={e=>setAnswer(it.q,e.target.value)}><option value="">Choose</option>{Object.keys(block.choices).map(k=><option key={k}>{k}</option>)}</select><Status q={it.q}/></div>)}</div></section>;
  if(block.kind==="choose_two"||block.kind==="choose_many"){
   const qs=(block.questions||[]).map(Number),selected=qs.map((q:number)=>answers[String(q)]).filter(Boolean);
   const st=qs.map((q:number)=>answerStatus(review,q));
   return <section className="ls-block" key={idx}><div className="ls-block-head"><b>{block.range}</b><em>{block.instruction}</em></div><div className="ls-two" id={"listen-q-"+qs[0]}><h3>{block.question}</h3><div>{Object.entries(block.options).map(([letter,text])=><label className={"ls-check "+(reviewMode&&selected.includes(letter)&&st.some((x:any)=>x?.status==="correct")?"picked":"")} key={letter}><input type="checkbox" disabled={reviewMode||!!result} checked={selected.includes(letter)} onChange={()=>togglePair(block,letter)}/><b>{letter}</b><span>{String(text)}</span></label>)}</div>{reviewMode&&<div className={"ls-review-line "+(st.every((x:any)=>x?.status==="correct")?"correct":"wrong")}><span>Your answer: {selected.length?selected.join(" / "):"No answer"}</span><b>Correct: {(st[0]?.correct||[]).join(" / ")} · either order</b></div>}</div></section>
  }
  if(block.kind==="notes_groups")return <section className="ls-block" key={idx}><div className="ls-block-head"><b>{block.range}</b><em>{block.instruction}</em><strong>{block.word_limit}</strong></div><div className="ls-notes-sheet"><h2>{block.title}</h2>{block.groups.map((g:any,gi:number)=><div className="ls-note-group" key={gi}><h3>{g.heading}</h3>{g.intro&&<p>{g.intro}</p>}<ul>{g.items.map((it:Token[],i:number)=><li key={i}>{tokens(it,"g"+gi+"-"+i)}</li>)}</ul></div>)}</div></section>;
  return null;
 }

 if(loading)return <main className="ls-shell ls-center"><div className="ls-spinner"/><b>Loading Listening…</b></main>;
 if(!data||!payload)return <main className="ls-shell ls-center"><Headphones size={30}/><h1>Listening unavailable</h1><p>{message}</p><AnimatedBackButton href={"/day/"+day}/></main>;

 if(result&&!reviewMode)return <main className="ls-shell ls-result-shell">
  <StudyTimeHeartbeat day={day} module="listening"/>
  <header className="ls-topbar"><AnimatedBackButton className="ls-back" onClick={goBack}/><div className="ls-top-title">DAY {String(day).padStart(2,"0")} · LISTENING</div><button className="ls-full" onClick={toggleFull}>{full?<Minimize2 size={17}/>:<Maximize2 size={17}/>}</button></header>
  <section className="ls-result-card"><span className="ls-result-icon"><CheckCircle2 size={30}/></span><small>DAY {String(day).padStart(2,"0")} · LISTENING COMPLETE · ATTEMPT {result.attempt_number||attemptNumber}</small><h1>{result.score} <i>/ 40</i></h1><div className="ls-band">IELTS Band <b>{Number(result.band).toFixed(1)}</b></div><div className="ls-section-scores">{result.part_scores.map((s,i)=><div key={i}><span>Section {i+1}</span><b>{s}/10</b></div>)}</div><p>{data.preview?"Preview result only. Nothing was saved to the real student record or admin results.":"This attempt is saved. You can review it or start a fresh attempt without deleting this result."}</p><div className="ls-result-actions"><button onClick={()=>{setReviewMode(true);setSection(1);setCurrentQuestion(1)}}>Review answers <ChevronRight size={15}/></button><button className="ghost" disabled={submitting} onClick={retryTest}>{submitting?"Starting…":"Try again"} <RefreshCcw size={15}/></button><button className="ghost" onClick={goBack}>Back to Day {day}</button></div></section>
 </main>;

 return <main className={"ls-shell "+(reviewMode?"reviewing":!started?"ls-shell--intro":"")}>
  <StudyTimeHeartbeat day={day} module="listening"/>
  <audio ref={audioRef} preload="auto" src={payload.audio_url} onPlay={()=>setAudioStatus("playing")} onEnded={()=>setAudioStatus("ended")} onError={()=>{if(startedRef.current){setAudioStatus("resume");setMessage("Audio could not start. Tap Resume audio to try again.")}}} onPause={()=>{if(startedRef.current&&audioStatus==="playing"){audioRef.current?.play().catch(()=>setAudioStatus("resume"))}}}/>
  <header className="ls-topbar"><AnimatedBackButton className="ls-back" onClick={goBack}/><div className="ls-top-title">DAY {String(day).padStart(2,"0")} · LISTENING</div><div className="ls-top-actions">{started&&!reviewMode&&<span className={"ls-audio-state "+audioStatus}><Volume2 size={14}/>{audioStatus==="ended"?"Audio finished":audioStatus==="resume"?"Audio needs resume":"Audio once only"} {started&&<i>{secLabel(elapsed)}</i>}</span>}<button className="ls-full" onClick={toggleFull}>{full?<Minimize2 size={17}/>:<Maximize2 size={17}/>}</button></div></header>

  {!started&&!reviewMode&&<section className="ls-start-card"><span className="ls-start-icon"><Headphones size={27}/></span><small>DAY {String(day).padStart(2,"0")} · IELTS LISTENING</small><h1>Full Listening Practice</h1><p>40 questions · 4 sections. The recording plays once and cannot be paused or replayed.</p><div className="ls-start-meta"><div><b>4</b><span>Sections</span></div><div><b>40</b><span>Questions</span></div><div><b>1×</b><span>Audio playback</span></div></div>{data.preview&&<div className="ls-preview">Preview mode · result and coin will not be saved.</div>}<button onClick={startTest}><Headphones size={17}/> Start Listening</button></section>}

  {(started||reviewMode)&&<>
   {audioStatus==="resume"&&!reviewMode&&<div className="ls-resume-banner"><Volume2 size={16}/><div><b>Audio playback needs your permission</b><span>Tap to play your recording.</span></div><button onClick={resumeAudio}>Resume audio</button></div>}
   {message&&<div className="ls-message">{message}<button onClick={()=>setMessage("")}>×</button></div>}
   <section className="ls-instruction"><div><b>{reviewMode?"ANSWER REVIEW":currentSection?.label}</b><span>{reviewMode?"Your answers and the official correct answers":currentSection?.range}</span></div></section>
   <div className="ls-workspace">
    <section className="ls-question-paper" ref={paperRef} onMouseUp={showHighlightMenu} onTouchEnd={()=>setTimeout(showHighlightMenu,100)}>
     {currentSection?.blocks?.map((b:any,i:number)=>renderBlock(b,i))}
    </section>
   </div>
   {highlightPopup&&!reviewMode&&<div className="ls-selection-popup" style={{left:highlightPopup.x,top:highlightPopup.y}} onMouseDown={e=>e.preventDefault()} role="toolbar" aria-label="Highlight selected text"><button className="yellow" onClick={()=>applyHighlight("yellow")} type="button"><span/> Highlight</button><button onClick={()=>applyHighlight("erase")} type="button"><Eraser size={15}/> Remove</button></div>}
   <nav className="ls-bottom-nav">
    <button className="ls-arrow" disabled={currentQuestion<=1} onClick={()=>goQuestion(currentQuestion-1)}><ChevronLeft size={17}/></button>
    <div className="ls-number-groups ls-number-groups--compact" aria-label="Listening part and question navigation">{[1,2,3,4].map(s=><div className={"ls-part-group "+(section===s?"active":"")} key={s}><button type="button" className="ls-part-tab" aria-current={section===s?"step":undefined} onClick={()=>goPart(s)}>Part {s}</button>{section===s&&<div className="ls-part-numbers">{Array.from({length:10},(_,i)=>(s-1)*10+i+1).map(q=>{const st=answerStatus(review,q);return <button type="button" key={q} aria-label={"Question "+q} aria-current={currentQuestion===q?"step":undefined} className={(currentQuestion===q?"current ":"")+(answers[String(q)]?"answered ":"")+(reviewMode&&st?st.status:"")} onClick={()=>goQuestion(q)}>{q}</button>})}</div>}</div>)}</div>
    {reviewMode?<button className="ls-submit" onClick={()=>setReviewMode(false)}>Close review <Check size={15}/></button>:<button className="ls-submit" disabled={submitting} onClick={()=>setConfirmSubmit(true)}>{submitting?"Submitting…":"Submit"} <Send size={15}/></button>}
    <button className="ls-arrow" disabled={currentQuestion>=40} onClick={()=>goQuestion(currentQuestion+1)}><ChevronRight size={17}/></button>
   </nav>
  </>}
  {confirmSubmit&&!reviewMode&&<div className="ls-confirm-overlay" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget&&!submitting)setConfirmSubmit(false)}}>
    <section className="ls-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="ls-confirm-title" aria-describedby="ls-confirm-detail">
     <div className="ls-confirm-symbol"><Send size={20}/></div>
     <h2 id="ls-confirm-title">Are you sure you want to submit?</h2>
     <p id="ls-confirm-detail">You have answered <strong>{answeredCount} of 40</strong> questions. Once submitted, this attempt is final and you will see your score and official answers.</p>
     {answeredCount<40&&<p className="ls-confirm-warning">{40-answeredCount} question{40-answeredCount===1?"":"s"} unanswered. You can go back and finish them first.</p>}
     <div className="ls-confirm-actions">
      <button ref={confirmCancelRef} type="button" className="ls-confirm-cancel" disabled={submitting} onClick={()=>setConfirmSubmit(false)}>Keep working</button>
      <button type="button" className="ls-confirm-proceed" disabled={submitting} onClick={submit}>{submitting?"Submitting…":"Yes, submit answers"} <Send size={15}/></button>
     </div>
    </section>
   </div>}
  <style jsx global>{`::highlight(ark-listening-yellow){background:#ffe58a;color:inherit}`}</style>
 </main>;
}
