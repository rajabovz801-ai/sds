"use client";
import Link from "next/link";
import {useParams} from "next/navigation";
import {useEffect,useMemo,useRef,useState} from "react";
import {ArrowLeft,CheckCircle2,Clock3,Pause,Play,Send,ShieldCheck} from "lucide-react";
import TaskVisual from "./TaskVisual";
import "./writing.css";

type WritingContent={id:string;day_number:number;title:string;payload:{task_type:"task1"|"task2";duration_seconds:number;min_words:number;prompt:string;visual_kind?:string;instructions?:string[]}};
type Submission={id:string;submitted_at:string;band:number|null;review_status:string;review_feedback:string|null;reviewed_at:string|null;payload?:Record<string,unknown>};
type ApiData={content:WritingContent;submission:Submission|null;preview?:boolean};

function countWords(value:string){return value.trim()?value.trim().split(/\s+/).length:0}
function formatTime(total:number){const s=Math.max(0,Math.floor(total));return `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`}

export default function WritingPage(){
 const params=useParams<{day:string}>();const day=Math.max(1,Math.min(60,Number(params.day)||1));
 const [data,setData]=useState<ApiData|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const [answer,setAnswer]=useState(""),[started,setStarted]=useState(false),[paused,setPaused]=useState(false),[remaining,setRemaining]=useState(0),[sending,setSending]=useState(false),[message,setMessage]=useState("");
 const timerRef=useRef<number|null>(null),lastTick=useRef(Date.now());
 const storageKey=`ark60-writing-day-${day}`;

 useEffect(()=>{let live=true;(async()=>{setLoading(true);setError("");try{const r=await fetch(`/api/challenge-writing?day=${day}`,{credentials:"same-origin",cache:"no-store"});const obj=await r.json();if(!r.ok)throw new Error(obj.detail||"Writing task could not be loaded.");if(!live)return;setData(obj);const duration=Number(obj.content?.payload?.duration_seconds||0);setRemaining(duration);if(!obj.submission){try{const raw=localStorage.getItem(storageKey);if(raw){const saved=JSON.parse(raw);if(typeof saved.answer==="string")setAnswer(saved.answer);if(saved.started){setStarted(true);setPaused(Boolean(saved.paused));let rem=Math.max(0,Number(saved.remaining)||duration);if(!saved.paused&&saved.savedAt)rem=Math.max(0,rem-Math.floor((Date.now()-Number(saved.savedAt))/1000));setRemaining(rem)}}}catch{}}}catch(e){if(live)setError(e instanceof Error?e.message:"Writing task could not be loaded.")}finally{if(live)setLoading(false)}})();return()=>{live=false}},[day,storageKey]);

 useEffect(()=>{if(!data||data.submission)return;const payload={answer,started,paused,remaining,savedAt:Date.now()};try{localStorage.setItem(storageKey,JSON.stringify(payload))}catch{}},[answer,started,paused,remaining,data,storageKey]);

 useEffect(()=>{if(!started||paused||remaining<=0||data?.submission)return;lastTick.current=Date.now();timerRef.current=window.setInterval(()=>{const now=Date.now();const passed=Math.max(1,Math.floor((now-lastTick.current)/1000));lastTick.current=now;setRemaining(v=>Math.max(0,v-passed))},1000);return()=>{if(timerRef.current)window.clearInterval(timerRef.current)}},[started,paused,data?.submission]);

 useEffect(()=>{if(started&&!paused&&remaining===0&&!data?.submission&&!sending&&answer.trim())submit(true)},[remaining,started,paused,data?.submission,sending]);

 const words=useMemo(()=>countWords(answer),[answer]);
 const duration=Number(data?.content?.payload?.duration_seconds||0),used=Math.max(0,duration-remaining);
 const taskLabel=data?.content?.payload?.task_type==="task1"?"Writing Task 1":"Writing Task 2";

 function begin(){setStarted(true);setPaused(false);lastTick.current=Date.now()}
 function togglePause(){setPaused(v=>!v);lastTick.current=Date.now()}
 async function submit(auto=false){if(!data||sending||data.submission)return;if(!answer.trim()){if(!auto)setMessage("Write your response before submitting.");return}if(!auto&&!window.confirm("Submit this Writing response? You will not be able to edit it afterwards."))return;setSending(true);setMessage("");try{const r=await fetch("/api/challenge-writing",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"submit",day,answer,duration_seconds:used})});const obj=await r.json();if(!r.ok)throw new Error(obj.detail||"Could not submit your response.");try{localStorage.removeItem(storageKey)}catch{};setData(prev=>prev?{...prev,submission:obj.submission}:prev);setPaused(true);setMessage("Your response has been submitted. Your result will be available soon.")}catch(e){setMessage(e instanceof Error?e.message:"Could not submit your response.")}finally{setSending(false)}}

 if(loading)return <main className="writing-loading"><span>ARK EDUCATION</span><b>Loading Writing task…</b></main>;
 if(error||!data)return <main className="writing-loading"><span>ARK EDUCATION</span><b>{error||"Writing task unavailable."}</b><Link href={`/day/${day}`}>Back to Day {day}</Link></main>;
 if(data.submission)return <main className="writing-finish"><section><div className="writing-finish-icon"><CheckCircle2 size={34}/></div><small>DAY {String(day).padStart(2,"0")} · {taskLabel.toUpperCase()}</small><h1>Writing submitted</h1><p>Your response has been submitted. Your result will be available soon.</p><div className="writing-result-strip"><span>STATUS<b>{data.submission.review_status==="checked"?"Checked":"Pending review"}</b></span><span>WORDS<b>{String(data.submission.payload?.word_count||words||"—")}</b></span>{data.submission.review_status==="checked"&&<span>BAND<b>{data.submission.band??"—"}</b></span>}</div>{data.submission.review_status==="checked"&&data.submission.review_feedback&&<div className="writing-feedback"><b>Teacher feedback</b><p>{data.submission.review_feedback}</p></div>}<Link className="writing-back" href={`/day/${day}`}><ArrowLeft size={16}/> Back to Day {day}</Link></section></main>;

 const p=data.content.payload;
 return <main className="writing-shell">
  <header className="writing-topbar"><Link href={`/day/${day}`} className="writing-back-link" aria-label="Back to day"><ArrowLeft size={18}/></Link><div className="writing-brand"><b>ARK</b> EDUCATION <span>· IELTS CDI WRITING</span></div><div className="writing-top-meta"><span>DAY {String(day).padStart(2,"0")}</span><strong className={remaining<=300&&started?"urgent":""}><Clock3 size={16}/>{formatTime(remaining)}</strong></div></header>
  <section className="writing-toolbar"><div><span className="writing-task-chip">{taskLabel}</span><span className="writing-rule">{p.min_words}+ words · {Math.round(p.duration_seconds/60)} minutes</span></div><div className="writing-controls">{!started?<button className="primary" onClick={begin}><Play size={16}/> Start</button>:<button onClick={togglePause}>{paused?<><Play size={16}/> Resume</>:<><Pause size={16}/> Pause</>}</button>}<button className="submit" onClick={()=>submit(false)} disabled={!started||paused||sending||remaining<=0}><Send size={16}/>{sending?"Submitting…":"Submit"}</button></div></section>
  <div className="writing-stage">
   <section className="writing-task-pane"><div className="writing-pane-head"><span>QUESTION</span><b>{taskLabel}</b></div><div className="writing-paper"><p className="writing-time-note">You should spend about {Math.round(p.duration_seconds/60)} minutes on this task.</p>{p.task_type==="task2"&&<p className="writing-topic-note">Write about the following topic:</p>}<div className="writing-prompt">{p.prompt}</div>{p.task_type==="task1"&&p.visual_kind&&<figure className="writing-visual"><TaskVisual kind={p.visual_kind}/></figure>}{(p.instructions||[]).map((line,i)=><p key={i} className="writing-instruction">{line}</p>)}<p className="writing-min">Write at least {p.min_words} words.</p></div></section>
   <section className="writing-answer-pane"><div className="writing-pane-head"><span>YOUR ANSWER</span><div><b>{words} words</b><i className={words>=p.min_words?"ok":""}>{words>=p.min_words?"Minimum reached":`${Math.max(0,p.min_words-words)} to minimum`}</i></div></div><div className="writing-editor-wrap">{!started&&<div className="writing-editor-lock"><Play size={26}/><b>Start the task to begin writing</b><span>The timer will start at {formatTime(p.duration_seconds)}.</span><button onClick={begin}>Start Writing</button></div>}{remaining===0&&started&&!data.submission?<div className="writing-editor-lock pause"><Clock3 size={26}/><b>Time is over</b><span>Your response is locked. If text was entered, it is submitted automatically.</span></div>:paused&&started&&<div className="writing-editor-lock pause"><Pause size={26}/><b>Writing paused</b><span>Your draft is saved on this device.</span><button onClick={togglePause}>Resume</button></div>}<textarea value={answer} onChange={e=>setAnswer(e.target.value)} disabled={!started||paused||sending||remaining<=0} spellCheck={false} autoCapitalize="sentences" placeholder="Type your response here…" aria-label="Writing answer"/></div><div className="writing-editor-footer"><span><ShieldCheck size={14}/> Draft auto-saved</span><span>{formatTime(remaining)} remaining</span></div>{message&&<p className="writing-message">{message}</p>}</section>
  </div>
 </main>
}
