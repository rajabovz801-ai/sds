"use client";

import AnimatedBackButton from "../../../components/animated-back-button";
import StudyTimeHeartbeat from "../../../components/study-time-heartbeat";
import {useParams,useRouter} from "next/navigation";
import {Fragment,useCallback,useEffect,useMemo,useRef,useState} from "react";
import {Check,CheckCircle2,ChevronLeft,ChevronRight,Clock3,Headphones,LockKeyhole,Maximize2,Minimize2,Send,Volume2,XCircle} from "lucide-react";
import "./listening.css";

type Token=string|{q:number};
type Payload={test_code:string;audio_url:string;total_questions:number;audio_once:boolean;sections:any[]};
type ReviewItem={number:number;submitted:string;correct:string[];status:"correct"|"wrong"|"empty"};
type Attempt={id:string;status:string;answers:Record<string,string>;started_at:string;submitted_at?:string|null;elapsed_seconds:number;part_scores?:number[]|null;score?:number|null;band?:number|null;review?:ReviewItem[]};
type ApiData={content:{title:string;payload:Payload};attempt:Attempt|null;preview:boolean};
type Result={score:number;band:number;part_scores:number[];elapsed_seconds:number;submitted_at?:string};

function secLabel(v:number){const s=Math.max(0,Math.floor(v||0));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")}
function answerStatus(review:ReviewItem[]|null,q:number){return review?.find(x=>x.number===q)}
function qSection(q:number){return q<=10?1:q<=20?2:q<=30?3:4}

export default function ListeningPage(){
 const params=useParams<{day:string}>(),router=useRouter();
 const day=Number(params.day)||1;
 const [data,setData]=useState<ApiData|null>(null);
 const [attemptId,setAttemptId]=useState("");
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

 const load=useCallback(async()=>{
  setLoading(true);setMessage("");
  try{
   const res=await fetch("/api/challenge-listening?day="+day,{credentials:"same-origin",cache:"no-store"});
   const obj=await res.json();if(!res.ok)throw new Error(obj.detail||"Could not load Listening.");
   setData(obj);
   const a=obj.attempt as Attempt|null;
   if(a){
    setAttemptId(a.id);setAnswers(a.answers||{});setStartedAt(a.started_at||"");
    if(a.status==="submitted"){
     setResult({score:Number(a.score||0),band:Number(a.band||0),part_scores:a.part_scores||[0,0,0,0],elapsed_seconds:Number(a.elapsed_seconds||0),submitted_at:a.submitted_at||undefined});
     setReview(a.review||null);setReviewMode(false);setStarted(false);
    }else{
     setStarted(true);startedRef.current=true;
     const q=Object.keys(a.answers||{}).map(Number).filter(Boolean).sort((x,y)=>x-y).pop()||1;
     setCurrentQuestion(q);setSection(qSection(q));
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
   const offset=Math.max(0,(Date.now()-Date.parse(startedAt))/1000);
   try{
    if(Number.isFinite(audio.duration)&&audio.duration>0&&offset>=audio.duration){audio.currentTime=audio.duration;setAudioStatus("ended");return}
    if(Number.isFinite(offset)&&offset>0)audio.currentTime=offset;
    await audio.play();setAudioStatus("playing");
   }catch{setAudioStatus("resume")}
  };
  if(audio.readyState>=1)void resume();else audio.addEventListener("loadedmetadata",resume,{once:true});
  return()=>audio.removeEventListener("loadedmetadata",resume);
 },[started,payload?.audio_url,startedAt]);

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
 function applyHighlight(){
  const range=selectionRangeRef.current;
  const highlights=window.CSS?.highlights;
  if(!range||!highlights){setMessage("Please use an updated Chrome, Edge or Safari for text highlighting.");return}
  const key="ark-listening-yellow";
  const old=highlights.get(key);
  highlights.set(key,old?new Highlight(...Array.from(old),range.cloneRange()):new Highlight(range.cloneRange()));
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
   setAttemptId(a.id);setAnswers(a.answers||{});setStartedAt(a.started_at);setStarted(true);startedRef.current=true;setSection(1);setCurrentQuestion(1);
   try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen?.()}catch{}
   requestAnimationFrame(async()=>{
    const audio=audioRef.current;if(!audio)return;
    try{audio.currentTime=0;await audio.play();setAudioStatus("playing")}catch{setAudioStatus("resume")}
   });
  }catch(e){setMessage(e instanceof Error?e.message:"Could not start Listening.")}
 }
 async function resumeAudio(){
  const audio=audioRef.current;if(!audio||!startedAt)return;
  const offset=Math.max(0,(Date.now()-Date.parse(startedAt))/1000);
  try{
   if(Number.isFinite(audio.duration)&&audio.duration>0&&offset>=audio.duration){setAudioStatus("ended");return}
   audio.currentTime=offset;await audio.play();setAudioStatus("playing");
  }catch{setMessage("Your browser blocked audio playback. Tap Resume audio again.")}
 }
 function queueSave(next:Record<string,string>){
  if(data?.preview||!attemptId||result)return;
  if(saveTimer.current)window.clearTimeout(saveTimer.current);
  saveTimer.current=window.setTimeout(async()=>{
   setSaving(true);
   try{
    const res=await fetch("/api/challenge-listening",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save",day,attempt_id:attemptId,answers:next})});
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
  const selected=qs.map((q:number)=>answers[String(q)]).filter(Boolean);
  const next=selected.includes(letter)?selected.filter((x:string)=>x!==letter):selected.length<2?[...selected,letter]:selected;
  const copy={...answers};qs.forEach((q:number,i:number)=>{copy[String(q)]=next[i]||""});
  setCurrentQuestion(qs[0]);setAnswers(copy);queueSave(copy);
 }
 async function submit(){
  if(!window.confirm("Submit your Listening answers?\n\nYou will see your score and answer review after submission."))return;
  if(saveTimer.current)window.clearTimeout(saveTimer.current);
  setSubmitting(true);setMessage("");
  try{
   const res=await fetch("/api/challenge-listening",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"submit",day,attempt_id:attemptId,answers,elapsed_seconds:elapsed})});
   const obj=await res.json();if(!res.ok)throw new Error(obj.detail||"Could not submit Listening.");
   setResult(obj.result);setReview(obj.review);setReviewMode(false);setStarted(false);startedRef.current=false;
   try{audioRef.current?.pause()}catch{}
  }catch(e){setMessage(e instanceof Error?e.message:"Could not submit Listening.")}finally{setSubmitting(false)}
 }
 async function goBack(){
  try{if(document.fullscreenElement)await document.exitFullscreen()}catch{}
  router.push("/day/"+day);
 }
 async function toggleFull(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{}}
 function goQuestion(q:number){setCurrentQuestion(q);setSection(qSection(q));setTimeout(()=>document.getElementById("listen-q-"+q)?.scrollIntoView({behavior:"smooth",block:"center"}),80)}

 function Gap({q}:{q:number}){
  const st=answerStatus(review,q);
  return <span className={"ls-gap-wrap "+(st?st.status:"")} id={"listen-q-"+q}><span className="ls-qnum">{q}</span><input aria-label={"Question "+q} disabled={reviewMode||!!result} value={answers[String(q)]||""} onFocus={()=>{setCurrentQuestion(q);setSection(qSection(q))}} onChange={e=>setAnswer(q,e.target.value)} />{reviewMode&&st&&<span className="ls-inline-review"><b>{st.status==="correct"?"✓":"✕"}</b> Correct: {st.correct.join(" / ")}</span>}</span>;
 }
 function tokens(items:Token[],key:string){
  return <>{items.map((t,i)=><Fragment key={key+"-"+i}>{typeof t==="string"?<span className={i>0&&items[i-1]&&typeof items[i-1]!=="string"?"ls-after-gap":""}>{t}</span>:<Gap q={Number(t.q)}/>} {typeof t==="string"&&i<items.length-1&&typeof items[i+1]==="string"?<br/>:null}</Fragment>)}</>;
 }
 function Status({q}:{q:number}){const st=answerStatus(review,q);if(!reviewMode||!st)return null;return <div className={"ls-review-line "+st.status}><span>{st.status==="empty"?"No answer":"Your answer: "+(st.submitted||"—")}</span><b>Correct: {st.correct.join(" / ")}</b></div>}

 function renderBlock(block:any,idx:number){
  if(block.kind==="table")return <section className="ls-block" key={idx}><div className="ls-block-head"><b>{block.range}</b><em>{block.instruction}</em><strong>{block.word_limit}</strong></div><h2 className="ls-source-title">{block.title}</h2><div className="ls-table-scroll"><table className="ls-source-table"><thead><tr>{block.headers.map((h:string)=><th key={h}>{h}</th>)}</tr></thead><tbody>{block.rows.map((row:any[],ri:number)=><tr key={ri}>{row.map((cell:Token[],ci:number)=><td key={ci}>{tokens(cell,"t"+ri+"-"+ci)}</td>)}</tr>)}</tbody></table></div></section>;
  if(block.kind==="notes")return <section className="ls-block" key={idx}><div className="ls-block-head"><b>{block.range}</b><em>{block.instruction}</em><strong>{block.word_limit}</strong></div><div className="ls-note-box"><h3>{block.title}</h3><ul>{block.items.map((it:Token[],i:number)=><li key={i}>{tokens(it,"n"+i)}</li>)}</ul></div></section>;
  if(block.kind==="mcq")return <section className="ls-block" key={idx}><div className="ls-block-head"><b>{block.range}</b><em>{block.instruction}</em></div><h2 className="ls-source-title">{block.title}</h2><div className="ls-mcq-list">{block.questions.map((q:any)=><article className="ls-mcq" id={"listen-q-"+q.q} key={q.q}><h3><span>{q.q}</span>{q.text}</h3><div>{Object.entries(q.options).map(([letter,text])=><label className={"ls-option "+(reviewMode&&String(answers[String(q.q)]||"")===letter?(answerStatus(review,q.q)?.status==="correct"?"picked-correct":"picked-wrong"):"")} key={letter}><input disabled={reviewMode||!!result} type="radio" name={"q"+q.q} value={letter} checked={answers[String(q.q)]===letter} onChange={()=>setAnswer(q.q,letter)}/><b>{letter}</b><span>{String(text)}</span></label>)}</div><Status q={q.q}/></article>)}</div></section>;
  if(block.kind==="matching")return <section className="ls-block" key={idx}><div className="ls-block-head"><b>{block.range}</b><em>{block.instruction}</em><strong>{block.word_limit}</strong></div><div className="ls-choice-box">{Object.entries(block.choices).map(([k,v])=><p key={k}><b>{k}</b><span>{String(v)}</span></p>)}</div><div className="ls-match-list">{block.items.map((it:any)=><div className="ls-match" id={"listen-q-"+it.q} key={it.q}><span className="ls-qnum static">{it.q}</span><b>{it.text}</b><select disabled={reviewMode||!!result} value={answers[String(it.q)]||""} onChange={e=>setAnswer(it.q,e.target.value)}><option value="">Choose</option>{Object.keys(block.choices).map(k=><option key={k}>{k}</option>)}</select><Status q={it.q}/></div>)}</div></section>;
  if(block.kind==="choose_two"){
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
  <header className="ls-topbar"><AnimatedBackButton className="ls-back" onClick={goBack}/><div className="ls-top-title">DAY 01 · LISTENING</div><button className="ls-full" onClick={toggleFull}>{full?<Minimize2 size={17}/>:<Maximize2 size={17}/>}</button></header>
  <section className="ls-result-card"><span className="ls-result-icon"><CheckCircle2 size={30}/></span><small>DAY 01 · LISTENING COMPLETE</small><h1>{result.score} <i>/ 40</i></h1><div className="ls-band">IELTS Band <b>{Number(result.band).toFixed(1)}</b></div><div className="ls-section-scores">{result.part_scores.map((s,i)=><div key={i}><span>Section {i+1}</span><b>{s}/10</b></div>)}</div><p>{data.preview?"Preview result only. Nothing was saved to the real student record or admin results.":"Your result is saved to your challenge account and is visible in the admin results panel."}</p><div className="ls-result-actions"><button onClick={()=>{setReviewMode(true);setSection(1);setCurrentQuestion(1)}}>Review answers <ChevronRight size={15}/></button><button className="ghost" onClick={goBack}>Back to Day 01</button></div></section>
 </main>;

 return <main className={"ls-shell "+(reviewMode?"reviewing":"")}>
  <StudyTimeHeartbeat day={day} module="listening"/>
  <audio ref={audioRef} preload="auto" src={payload.audio_url} onPlay={()=>setAudioStatus("playing")} onEnded={()=>setAudioStatus("ended")} onPause={()=>{if(startedRef.current&&audioStatus==="playing"){audioRef.current?.play().catch(()=>setAudioStatus("resume"))}}}/>
  <header className="ls-topbar"><AnimatedBackButton className="ls-back" onClick={goBack}/><div className="ls-top-title">DAY 01 · LISTENING</div><div className="ls-top-actions">{started&&!reviewMode&&<span className={"ls-audio-state "+audioStatus}><Volume2 size={14}/>{audioStatus==="ended"?"Audio finished":audioStatus==="resume"?"Audio needs resume":"Audio once only"} {started&&<i>{secLabel(elapsed)}</i>}</span>}<button className="ls-full" onClick={toggleFull}>{full?<Minimize2 size={17}/>:<Maximize2 size={17}/>}</button></div></header>

  {!started&&!reviewMode&&<section className="ls-start-card"><span className="ls-start-icon"><Headphones size={27}/></span><small>DAY 01 · IELTS LISTENING</small><h1>Full Listening Practice</h1><p>40 questions · 4 sections. The recording plays once and cannot be paused or replayed.</p><div className="ls-start-meta"><div><b>4</b><span>Sections</span></div><div><b>40</b><span>Questions</span></div><div><b>1×</b><span>Audio playback</span></div></div>{data.preview&&<div className="ls-preview">Preview mode · result and coin will not be saved.</div>}<button onClick={startTest}><Headphones size={17}/> Start Listening</button></section>}

  {(started||reviewMode)&&<>
   {audioStatus==="resume"&&!reviewMode&&<div className="ls-resume-banner"><Volume2 size={16}/><div><b>Audio playback needs your permission</b><span>The recording will resume from the current test position, not from the beginning.</span></div><button onClick={resumeAudio}>Resume audio</button></div>}
   {message&&<div className="ls-message">{message}<button onClick={()=>setMessage("")}>×</button></div>}
   <section className="ls-instruction"><div><b>{reviewMode?"ANSWER REVIEW":currentSection?.label}</b><span>{reviewMode?"Your answers and the official correct answers":currentSection?.range}</span></div>{!reviewMode&&<span className="ls-save-state">{saving?"Saving answers…":"Answers auto-save"}</span>}</section>
   <div className="ls-workspace">
    <section className="ls-question-paper" ref={paperRef} onMouseUp={showHighlightMenu} onTouchEnd={()=>setTimeout(showHighlightMenu,100)}>
     <div className="ls-section-heading"><span>{currentSection?.label}</span><b>{currentSection?.range}</b></div>
     {currentSection?.blocks?.map((b:any,i:number)=>renderBlock(b,i))}
    </section>
   </div>
   {highlightPopup&&!reviewMode&&<div className="ls-selection-popup" style={{left:highlightPopup.x,top:highlightPopup.y}} onMouseDown={e=>e.preventDefault()} role="toolbar" aria-label="Highlight selected text"><button className="yellow" onClick={applyHighlight} type="button"><span/> Highlight</button></div>}
   <nav className="ls-bottom-nav">
    <button className="ls-arrow" disabled={currentQuestion<=1} onClick={()=>goQuestion(currentQuestion-1)}><ChevronLeft size={17}/></button>
    <div className="ls-number-groups">{[1,2,3,4].map(s=><div className={section===s?"active":""} key={s}><span>SECTION {s}</span><div>{Array.from({length:10},(_,i)=>(s-1)*10+i+1).map(q=>{const st=answerStatus(review,q);return <button key={q} className={(currentQuestion===q?"current ":"")+(answers[String(q)]?"answered ":"")+(reviewMode&&st?st.status:"")} onClick={()=>goQuestion(q)}>{q}</button>})}</div></div>)}</div>
    {reviewMode?<button className="ls-submit" onClick={()=>setReviewMode(false)}>Close review <Check size={15}/></button>:<button className="ls-submit" disabled={submitting} onClick={submit}>{submitting?"Submitting…":"Submit"} <Send size={15}/></button>}
    <button className="ls-arrow" disabled={currentQuestion>=40} onClick={()=>goQuestion(currentQuestion+1)}><ChevronRight size={17}/></button>
   </nav>
  </>}
 </main>;
}
