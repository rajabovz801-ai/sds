"use client";
import LoadingIndicator from "../../../components/loading-indicator";
import {useParams,useRouter} from "next/navigation";
import AnimatedBackButton from "../../../components/animated-back-button";
import StudyTimeHeartbeat from "../../../components/study-time-heartbeat";
import {useEffect,useMemo,useRef,useState,type CSSProperties} from "react";
import {CheckCircle2,Clock3,Pause,Play,Send,ShieldCheck,Maximize2,Minimize2} from "lucide-react";
import TaskVisual from "./TaskVisual";
import "./writing.css";

type WritingContent={id:string;day_number:number;title:string;payload:{task_type:"task1"|"task2";duration_seconds:number;min_words:number;prompt:string;visual_kind?:string;instructions?:string[]}};
type Submission={id:string;submitted_at:string;band:number|null;review_status:string;review_feedback:string|null;reviewed_at:string|null;payload?:Record<string,unknown>};
type Draft={answer:string;duration_seconds:number;timer_started:boolean;timer_paused:boolean;remaining_seconds:number;updated_at:string};
type ApiData={content:WritingContent;submission:Submission|null;draft?:Draft|null;draft_scope?:string|null;preview?:boolean};

function countWords(value:string){return value.trim()?value.trim().split(/\s+/).length:0}
function formatTime(total:number){const s=Math.max(0,Math.floor(total));return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`}

export default function WritingPage(){
 const params=useParams<{day:string}>();const day=Math.max(1,Math.min(60,Number(params.day)||1));
 const router=useRouter();
 const [split,setSplit]=useState(46);
 const splitRef=useRef<HTMLDivElement>(null);
 const [data,setData]=useState<ApiData|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const [answer,setAnswer]=useState(""),[started,setStarted]=useState(false),[paused,setPaused]=useState(false),[remaining,setRemaining]=useState(0),[sending,setSending]=useState(false),[message,setMessage]=useState(""),[fullScreen,setFullScreen]=useState(false);
 const timerRef=useRef<number|null>(null),draftSaveRef=useRef<number|null>(null),lastDraftSyncRef=useRef(0),lastTick=useRef(Date.now());
 const visitIdRef=useRef<string|null>(null),visitBusyRef=useRef(false);
 const storageKey=data?.draft_scope?`ark60-writing-${data.draft_scope}-day-${day}`:"";

 useEffect(()=>{let live=true;(async()=>{setLoading(true);setError("");try{const r=await fetch(`/api/challenge-writing?day=${day}`,{credentials:"same-origin",cache:"no-store"});const obj:ApiData=await r.json();if(!r.ok)throw new Error((obj as any).detail||"Writing task could not be loaded.");if(!live)return;setData(obj);const duration=Number(obj.content?.payload?.duration_seconds||0);setRemaining(duration);setAnswer("");setStarted(false);setPaused(false);
   if(!obj.submission){
    const scopedKey=obj.draft_scope?`ark60-writing-${obj.draft_scope}-day-${day}`:"";
    let local:any=null;try{const raw=scopedKey?localStorage.getItem(scopedKey):null;if(raw)local=JSON.parse(raw)}catch{}
    const server=obj.draft?{answer:obj.draft.answer,started:obj.draft.timer_started,paused:obj.draft.timer_paused,remaining:obj.draft.remaining_seconds,savedAt:Date.parse(obj.draft.updated_at)||0}:null;
    const localStamp=Number(local?.savedAt)||0,serverStamp=Number(server?.savedAt)||0;
    const saved=localStamp>serverStamp?local:server;
    if(saved){
     if(typeof saved.answer==="string")setAnswer(saved.answer);
     if(saved.started){
      setStarted(true);setPaused(Boolean(saved.paused));
      const savedRemaining=Number(saved.remaining);let rem=Number.isFinite(savedRemaining)?Math.max(0,savedRemaining):duration;
      if(!saved.paused&&saved.savedAt)rem=Math.max(0,rem-Math.floor((Date.now()-Number(saved.savedAt))/1000));
      setRemaining(rem);
     }else if(Number.isFinite(Number(saved.remaining)))setRemaining(Math.max(0,Number(saved.remaining)));
    }
   }}catch(e){if(live)setError(e instanceof Error?e.message:"Writing task could not be loaded.")}finally{if(live)setLoading(false)}})();return()=>{live=false}},[day]);

 useEffect(()=>{
  if(!data||data.submission||data.preview)return;
  let disposed=false;
  async function enterVisit(){
   if(disposed||visitBusyRef.current||visitIdRef.current||document.visibilityState!=="visible")return;
   visitBusyRef.current=true;
   try{
    const res=await fetch("/api/challenge-writing",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"writing_visit_enter",day})});
    const obj=await res.json().catch(()=>({}));
    if(!disposed&&res.ok&&obj?.visit?.id)visitIdRef.current=String(obj.visit.id);
   }catch{}finally{visitBusyRef.current=false}
  }
  function leaveVisit(reason:"hidden"|"pagehide"|"unload"){
   const visitId=visitIdRef.current;
   if(!visitId)return;
   visitIdRef.current=null;
   try{
    void fetch("/api/challenge-writing",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"writing_visit_leave",day,visit_id:visitId,reason}),keepalive:true});
   }catch{}
  }
  const onVisibility=()=>{if(document.visibilityState==="hidden")leaveVisit("hidden");else void enterVisit()};
  const onPageHide=()=>leaveVisit("pagehide");
  document.addEventListener("visibilitychange",onVisibility);
  window.addEventListener("pagehide",onPageHide);
  void enterVisit();
  const ping=window.setInterval(()=>{
   const visitId=visitIdRef.current;
   if(!visitId||document.visibilityState!=="visible")return;
   void fetch("/api/challenge-writing",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"writing_visit_ping",day,visit_id:visitId}),keepalive:true}).catch(()=>{});
  },30000);
  return()=>{
   disposed=true;
   window.clearInterval(ping);
   document.removeEventListener("visibilitychange",onVisibility);
   window.removeEventListener("pagehide",onPageHide);
   leaveVisit("unload");
  };
 },[day,data?.submission,data?.preview]);

 useEffect(()=>{
  if(!data||data.submission||!storageKey)return;
  const savedAt=Date.now(),payload={answer,started,paused,remaining,savedAt};
  try{localStorage.setItem(storageKey,JSON.stringify(payload))}catch{}
  if(data.preview)return;
  if(draftSaveRef.current)window.clearTimeout(draftSaveRef.current);
  const wait=Math.max(500,5000-(Date.now()-lastDraftSyncRef.current));
  draftSaveRef.current=window.setTimeout(async()=>{
   try{
    const res=await fetch("/api/challenge-writing",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({
     action:"draft",day,answer,duration_seconds:Math.max(0,Number(data.content.payload.duration_seconds||0)-remaining),
     timer_started:started,timer_paused:paused,remaining_seconds:remaining
    })});
    if(res.ok)lastDraftSyncRef.current=Date.now();
   }catch{}
  },wait);
  return()=>{if(draftSaveRef.current)window.clearTimeout(draftSaveRef.current)};
 },[answer,started,paused,remaining,data?.submission,data?.preview,storageKey,day]);

 useEffect(()=>{if(!started||paused||remaining<=0||data?.submission)return;lastTick.current=Date.now();timerRef.current=window.setInterval(()=>{const now=Date.now();const passed=Math.max(1,Math.floor((now-lastTick.current)/1000));lastTick.current=now;setRemaining(v=>Math.max(0,v-passed))},1000);return()=>{if(timerRef.current)window.clearInterval(timerRef.current)}},[started,paused,data?.submission]);

 useEffect(()=>{const sync=()=>setFullScreen(!!document.fullscreenElement);document.addEventListener("fullscreenchange",sync);document.documentElement.requestFullscreen?.().catch(()=>{});return()=>document.removeEventListener("fullscreenchange",sync)},[]);

 const words=useMemo(()=>countWords(answer),[answer]);
 const duration=Number(data?.content?.payload?.duration_seconds||0),used=Math.max(0,duration-remaining);
 const taskLabel=data?.content?.payload?.task_type==="task1"?"Writing Task 1":"Writing Task 2";

 function begin(){if(remaining<=0)return;setStarted(true);setPaused(false);lastTick.current=Date.now()}
 function togglePause(){if(remaining<=0)return;setPaused(v=>!v);lastTick.current=Date.now()}
 async function toggleFullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{}}
 async function goBack(){
  const visitId=visitIdRef.current;visitIdRef.current=null;
  if(visitId){try{await fetch("/api/challenge-writing",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"writing_visit_leave",day,visit_id:visitId,reason:"back"}),keepalive:true})}catch{}}
  try{if(document.fullscreenElement)await document.exitFullscreen()}catch{}
  router.push("/day/"+day)
 }
 async function submit(auto=false){if(!data||sending||data.submission)return;if(!answer.trim()){if(!auto)setMessage("Write your response before submitting.");return}if(!auto&&!window.confirm("Submit this Writing response? You will not be able to edit it afterwards."))return;setSending(true);setMessage("");try{const r=await fetch("/api/challenge-writing",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"submit",day,answer,duration_seconds:used})});const obj=await r.json();if(!r.ok)throw new Error(obj.detail||"Could not submit your response.");visitIdRef.current=null;if(draftSaveRef.current)window.clearTimeout(draftSaveRef.current);try{if(storageKey)localStorage.removeItem(storageKey)}catch{};setData(prev=>prev?{...prev,submission:obj.submission,draft:null}:prev);setPaused(true);setMessage(obj.preview?"Preview completed. Nothing was saved to student results.":"Your response has been submitted. Your result will be available soon.")}catch(e){setMessage(e instanceof Error?e.message:"Could not submit your response.")}finally{setSending(false)}}

 if(loading)return <LoadingIndicator/>;
 if(error||!data)return <main className="writing-loading"><span>ARK EDUCATION</span><b>{error||"Writing task unavailable."}</b><AnimatedBackButton href={`/day/${day}`} ariaLabel="Back to study day"/></main>;
 if(data.submission)return <main className="writing-finish"><section><div className="writing-finish-icon"><CheckCircle2 size={34}/></div><small>DAY {String(day).padStart(2,"0")} · {taskLabel.toUpperCase()}</small><h1>Writing submitted</h1><p>{data.submission.review_status==="preview"?"Preview submission completed. Nothing was saved to student results.":"Your response has been submitted. Your result will be available soon."}</p><div className="writing-result-strip"><span>STATUS<b>{data.submission.review_status==="reviewed"?"Checked":data.submission.review_status==="preview"?"Preview only":"Pending review"}</b></span><span>WORDS<b>{String(data.submission.payload?.word_count||words||"—")}</b></span>{data.submission.review_status==="reviewed"&&<span>BAND<b>{data.submission.band??"—"}</b></span>}</div>{data.submission.review_status==="reviewed"&&data.submission.review_feedback&&<div className="writing-feedback"><b>Teacher feedback</b><p>{data.submission.review_feedback}</p></div>}<AnimatedBackButton href={`/day/${day}`} ariaLabel="Back to study day"/></section></main>;

 const p=data.content.payload;
 return <main className="writing-shell"><StudyTimeHeartbeat day={day} module="writing"/>
  <header className="writing-topbar"><div className="writing-back-slot"><AnimatedBackButton onClick={goBack} ariaLabel="Back to study day"/></div><div className="writing-top-center"><span>DAY {String(day).padStart(2,"0")}</span><b>{taskLabel}</b></div><div className="writing-top-meta"><strong className={remaining<=300&&started&&remaining>0?"urgent":""}><Clock3 size={16}/>{formatTime(remaining)}</strong><button className="writing-fullscreen" type="button" aria-label={fullScreen?"Exit fullscreen":"Enter fullscreen"} onClick={toggleFullscreen}>{fullScreen?<Minimize2 size={18}/>:<Maximize2 size={18}/>}</button></div></header>
  <section className="writing-toolbar"><div><span className="writing-rule">{p.min_words}+ words · {Math.round(p.duration_seconds/60)} minutes</span></div><div className="writing-controls">{!started?<button className="primary" onClick={begin} disabled={remaining<=0}><Play size={16}/> Start timer</button>:<button onClick={togglePause} disabled={remaining<=0}>{remaining<=0?<><Clock3 size={16}/> Time up</>:paused?<><Play size={16}/> Resume timer</>:<><Pause size={16}/> Pause timer</>}</button>}<button className="submit" onClick={()=>submit(false)} disabled={sending||!answer.trim()}><Send size={16}/>{sending?"Submitting…":"Submit"}</button>{!answer.trim()&&<small className="writing-submit-hint">Write an answer to submit</small>}</div></section>
  <div ref={splitRef} className="writing-stage" style={{"--writing-split":split+"%"} as CSSProperties}>
   <section className="writing-task-pane"><div className="writing-pane-head"><span>QUESTION</span></div><div className="writing-paper"><p className="writing-time-note">You should spend about {Math.round(p.duration_seconds/60)} minutes on this task.</p>{p.task_type==="task2"&&<p className="writing-topic-note">Write about the following topic:</p>}<div className="writing-prompt">{p.prompt}</div>{p.task_type==="task1"&&p.visual_kind&&<figure className="writing-visual"><TaskVisual kind={p.visual_kind}/></figure>}{(p.instructions||[]).map((line,i)=><p key={i} className="writing-instruction">{line}</p>)}<p className="writing-min">Write at least {p.min_words} words.</p></div></section>
   <div className="writing-divider" role="separator" aria-label="Resize question and answer panels" aria-orientation="vertical" aria-valuemin={30} aria-valuemax={65} aria-valuenow={Math.round(split)} tabIndex={0} onKeyDown={e=>{if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();setSplit(v=>Math.max(30,Math.min(65,v+(e.key==="ArrowRight"?2:-2))))}}} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault()}} onPointerMove={e=>{if(!e.currentTarget.hasPointerCapture(e.pointerId))return;const r=splitRef.current?.getBoundingClientRect();if(r)setSplit(Math.max(30,Math.min(65,(e.clientX-r.left)/r.width*100)))}} onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}}><span/></div>
   <section className="writing-answer-pane"><div className="writing-pane-head"><span>YOUR ANSWER</span><div><b>{words} / {p.min_words} words</b>{words>=p.min_words&&<i className="ok">Minimum reached</i>}</div></div><div className="writing-editor-wrap"><textarea value={answer} onChange={e=>setAnswer(e.target.value)} disabled={sending} spellCheck={false} autoCapitalize="sentences" placeholder="Type your response here…" aria-label="Writing answer"/></div><div className="writing-editor-footer"><span><ShieldCheck size={14}/> Draft auto-saved</span><span>{started?(remaining>0?(paused?"Timer paused":"Timer running"):"Practice time finished"):"Optional timer"}</span></div>{message&&<p className="writing-message">{message}</p>}</section>
  </div>
 </main>
}
