"use client";
import Link from "next/link";
import {useParams,useRouter} from "next/navigation";
import AnimatedBackButton from "../../../components/animated-back-button";
import {useEffect,useMemo,useRef,useState} from "react";
import {ArrowLeft,CheckCircle2,Clock3,Pause,Play,Send,ShieldCheck,Maximize2,Minimize2} from "lucide-react";
import TaskVisual from "./TaskVisual";
import "./writing.css";

type WritingContent={id:string;day_number:number;title:string;payload:{task_type:"task1"|"task2";duration_seconds:number;min_words:number;prompt:string;visual_kind?:string;instructions?:string[]}};
type Submission={id:string;submitted_at:string;band:number|null;review_status:string;review_feedback:string|null;reviewed_at:string|null;payload?:Record<string,unknown>};
type ApiData={content:WritingContent;submission:Submission|null;preview?:boolean};

function countWords(value:string){return value.trim()?value.trim().split(/\s+/).length:0}
function formatTime(total:number){const s=Math.max(0,Math.floor(total));return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`}

export default function WritingPage(){
 const params=useParams<{day:string}>();const day=Math.max(1,Math.min(60,Number(params.day)||1));
 const router=useRouter();
 const [data,setData]=useState<ApiData|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const [answer,setAnswer]=useState(""),[started,setStarted]=useState(false),[paused,setPaused]=useState(false),[remaining,setRemaining]=useState(0),[sending,setSending]=useState(false),[message,setMessage]=useState(""),[fullScreen,setFullScreen]=useState(false);
 const timerRef=useRef<number|null>(null),lastTick=useRef(Date.now());
 const storageKey=`ark60-writing-day-${day}`;

 useEffect(()=>{let live=true;(async()=>{setLoading(true);setError("");try{const r=await fetch(`/api/challenge-writing?day=${day}`,{credentials:"same-origin",cache:"no-store"});const obj=await r.json();if(!r.ok)throw new Error(obj.detail||"Writing task could not be loaded.");if(!live)return;setData(obj);const duration=Number(obj.content?.payload?.duration_seconds||0);setRemaining(duration);if(!obj.submission){try{const raw=localStorage.getItem(storageKey);if(raw){const saved=JSON.parse(raw);if(typeof saved.answer==="string")setAnswer(saved.answer);if(saved.started){setStarted(true);setPaused(Boolean(saved.paused));let rem=Math.max(0,Number(saved.remaining)||duration);if(!saved.paused&&saved.savedAt)rem=Math.max(0,rem-Math.floor((Date.now()-Number(saved.savedAt))/1000));setRemaining(rem)}}}catch{}}}catch(e){if(live)setError(e instanceof Error?e.message:"Writing task could not be loaded.")}finally{if(live)setLoading(false)}})();return()=>{live=false}},[day,storageKey]);

 useEffect(()=>{if(!data||data.submission)return;const payload={answer,started,paused,remaining,savedAt:Date.now()};try{localStorage.setItem(storageKey,JSON.stringify(payload))}catch{}},[answer,started,paused,remaining,data,storageKey]);

 useEffect(()=>{if(!started||paused||remaining<=0||data?.submission)return;lastTick.current=Date.now();timerRef.current=window.setInterval(()=>{const now=Date.now();const passed=Math.max(1,Math.floor((now-lastTick.current)/1000));lastTick.current=now;setRemaining(v=>Math.max(0,v-passed))},1000);return()=>{if(timerRef.current)window.clearInterval(timerRef.current)}},[started,paused,data?.submission]);

 useEffect(()=>{const sync=()=>setFullScreen(!!document.fullscreenElement);document.addEventListener("fullscreenchange",sync);document.documentElement.requestFullscreen?.().catch(()=>{});return()=>document.removeEventListener("fullscreenchange",sync)},[]);

 const words=useMemo(()=>countWords(answer),[answer]);
 const duration=Number(data?.content?.payload?.duration_seconds||0),used=Math.max(0,duration-remaining);
 const taskLabel=data?.content?.payload?.task_type==="task1"?"Writing Task 1":"Writing Task 2";

 function begin(){if(remaining<=0)return;setStarted(true);setPaused(false);lastTick.current=Date.now()}
 function togglePause(){if(remaining<=0)return;setPaused(v=>!v);lastTick.current=Date.now()}
 async function toggleFullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{}}
 async function goBack(){try{if(document.fullscreenElement)await document.exitFullscreen()}catch{}router.push("/day/"+day)}
 async function submit(auto=false){if(!data||sending||data.submission)return;if(!answer.trim()){if(!auto)setMessage("Write your response before submitting.");return}if(!auto&&!window.confirm("Submit this Writing response? You will not be able to edit it afterwards."))return;setSending(true);setMessage("");try{const r=await fetch("/api/challenge-writing",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"submit",day,answer,duration_seconds:used})});const obj=await r.json();if(!r.ok)throw new Error(obj.detail||"Could not submit your response.");try{localStorage.removeItem(storageKey)}catch{};setData(prev=>prev?{...prev,submission:obj.submission}:prev);setPaused(true);setMessage("Your response has been submitted. Your result will be available soon.")}catch(e){setMessage(e instanceof Error?e.message:"Could not submit your response.")}finally{setSending(false)}}

 if(loading)return <main className="writing-loading"><span>ARK EDUCATION</span><b>Loading Writing task…</b></main>;
 if(error||!data)return <main className="writing-loading"><span>ARK EDUCATION</span><b>{error||"Writing task unavailable."}</b><Link href={`/day/${day}`}>Back to Day {day}</Link></main>;
 if(data.submission)return <main className="writing-finish"><section><div className="writing-finish-icon"><CheckCircle2 size={34}/></div><small>DAY {String(day).padStart(2,"0")} · {taskLabel.toUpperCase()}</small><h1>Writing submitted</h1><p>Your response has been submitted. Your result will be available soon.</p><div className="writing-result-strip"><span>STATUS<b>{data.submission.review_status==="checked"?"Checked":"Pending review"}</b></span><span>WORDS<b>{String(data.submission.payload?.word_count||words||"—")}</b></span>{data.submission.review_status==="checked"&&<span>BAND<b>{data.submission.band??"—"}</b></span>}</div>{data.submission.review_status==="checked"&&data.submission.review_feedback&&<div className="writing-feedback"><b>Teacher feedback</b><p>{data.submission.review_feedback}</p></div>}<Link className="writing-back" href={`/day/${day}`}><ArrowLeft size={16}/> Back to Day {day}</Link></section></main>;

 const p=data.content.payload;
 return <main className="writing-shell">
  <header className="writing-topbar"><div className="writing-back-slot"><AnimatedBackButton onClick={goBack} ariaLabel="Back to study day"/></div><div className="writing-top-center"><span>DAY {String(day).padStart(2,"0")}</span><b>{taskLabel}</b></div><div className="writing-top-meta"><strong className={remaining<=300&&started&&remaining>0?"urgent":""}><Clock3 size={16}/>{formatTime(remaining)}</strong><button className="writing-fullscreen" type="button" aria-label={fullScreen?"Exit fullscreen":"Enter fullscreen"} onClick={toggleFullscreen}>{fullScreen?<Minimize2 size={18}/>:<Maximize2 size={18}/>}</button></div></header>
  <section className="writing-toolbar"><div><span className="writing-task-chip">{taskLabel}</span><span className="writing-rule">{p.min_words}+ words · {Math.round(p.duration_seconds/60)} minutes</span></div><div className="writing-controls">{!started?<button className="primary" onClick={begin} disabled={remaining<=0}><Play size={16}/> Start timer</button>:<button onClick={togglePause} disabled={remaining<=0}>{remaining<=0?<><Clock3 size={16}/> Time up</>:paused?<><Play size={16}/> Resume timer</>:<><Pause size={16}/> Pause timer</>}</button>}<button className="submit" onClick={()=>submit(false)} disabled={sending||!answer.trim()}><Send size={16}/>{sending?"Submitting…":"Submit"}</button></div></section>
  <div className="writing-stage">
   <section className="writing-task-pane"><div className="writing-pane-head"><span>QUESTION</span><b>{taskLabel}</b></div><div className="writing-paper"><p className="writing-time-note">You should spend about {Math.round(p.duration_seconds/60)} minutes on this task.</p>{p.task_type==="task2"&&<p className="writing-topic-note">Write about the following topic:</p>}<div className="writing-prompt">{p.prompt}</div>{p.task_type==="task1"&&p.visual_kind&&<figure className="writing-visual"><TaskVisual kind={p.visual_kind}/></figure>}{(p.instructions||[]).map((line,i)=><p key={i} className="writing-instruction">{line}</p>)}<p className="writing-min">Write at least {p.min_words} words.</p></div></section>
   <section className="writing-answer-pane"><div className="writing-pane-head"><span>YOUR ANSWER</span><div><b>{words} words</b><i className={words>=p.min_words?"ok":""}>{words>=p.min_words?"Minimum reached":`${Math.max(0,p.min_words-words)} to minimum`}</i></div></div><div className="writing-editor-wrap"><textarea value={answer} onChange={e=>setAnswer(e.target.value)} disabled={sending} spellCheck={false} autoCapitalize="sentences" placeholder="Type your response here…" aria-label="Writing answer"/></div><div className="writing-editor-footer"><span><ShieldCheck size={14}/> Draft auto-saved</span><span>{started?(remaining>0?(paused?"Timer paused · "+formatTime(remaining)+" remaining":formatTime(remaining)+" remaining"):"Practice time finished"):"Timer optional · "+formatTime(remaining)}</span></div>{message&&<p className="writing-message">{message}</p>}</section>
  </div>
 </main>
}
