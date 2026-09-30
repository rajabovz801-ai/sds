"use client";

import AnimatedBackButton from "../../../components/animated-back-button";
import StudyTimeHeartbeat from "../../../components/study-time-heartbeat";
import {useParams,useRouter} from "next/navigation";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import {
 Check,CheckCircle2,Clock3,Headphones,LockKeyhole,Maximize2,Mic,Minimize2,Pause,
 Play,RefreshCcw,Send,ShieldCheck,Square,Volume2
} from "lucide-react";
import "./speaking.css";

type Question={key:string;text:string};
type SpeakingPayload={
 version:string;
 part1:{topic:string;questions:Question[]};
 part2:{topic:string;key:string;prompt:string;bullets:string[];preparation_seconds:number;max_answer_seconds:number};
 part3:{topic:string;questions:Question[]};
};
type Content={id:string;day_number:number;title:string;payload:SpeakingPayload};
type SavedAnswer={id:string;part_number:number;question_key:string;question_text:string;mime_type:string;duration_seconds:number;created_at:string;audio_url?:string|null};
type Attempt={
 id:string;day_number:number;status:string;part2_preparation_started_at?:string|null;part2_preparation_expires_at?:string|null;
 submitted_at?:string|null;expires_at?:string|null;review_status?:string;band?:number|null;feedback?:string|null;
 reviewed_at?:string|null;audio_expired?:boolean;answer_count?:number;total_audio_seconds?:number;answers?:SavedAnswer[];
};
type ApiData={content:Content;attempt:Attempt|null;preview?:boolean};
type Stage="intro"|"part1"|"part2"|"part3"|"review"|"complete";

function pad(value:number){return String(value).padStart(2,"0")}
function secondsLabel(value:number){
 const s=Math.max(0,Math.floor(value||0));
 return Math.floor(s/60)+":"+String(s%60).padStart(2,"0");
}
function preferredMime(){
 if(typeof MediaRecorder==="undefined")return "";
 for(const mime of ["audio/webm;codecs=opus","audio/webm","audio/mp4","audio/ogg"]){
  if(MediaRecorder.isTypeSupported?.(mime))return mime;
 }
 return "";
}

function RecorderCard({
 day,attemptId,questionKey,questionText,part,saved,preview,maxSeconds,onSaved
}:{
 day:number;attemptId:string;questionKey:string;questionText:string;part:number;saved?:SavedAnswer;preview:boolean;maxSeconds:number;
 onSaved:(answer:SavedAnswer)=>void;
}){
 const [recording,setRecording]=useState(false);
 const [elapsed,setElapsed]=useState(0);
 const [blob,setBlob]=useState<Blob|null>(null);
 const [localUrl,setLocalUrl]=useState("");
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const recorderRef=useRef<MediaRecorder|null>(null);
 const streamRef=useRef<MediaStream|null>(null);
 const chunksRef=useRef<Blob[]>([]);
 const timerRef=useRef<number|null>(null);
 const hardStopRef=useRef<number|null>(null);
 const canvasRef=useRef<HTMLCanvasElement|null>(null);
 const rafRef=useRef<number|null>(null);
 const audioCtxRef=useRef<AudioContext|null>(null);

 useEffect(()=>()=>{cleanupMedia();if(localUrl)URL.revokeObjectURL(localUrl)},[localUrl]);

 function cleanupMedia(){
  if(timerRef.current)window.clearInterval(timerRef.current);
  if(hardStopRef.current)window.clearTimeout(hardStopRef.current);
  if(rafRef.current)cancelAnimationFrame(rafRef.current);
  streamRef.current?.getTracks().forEach(t=>t.stop());
  streamRef.current=null;
  if(audioCtxRef.current){void audioCtxRef.current.close().catch(()=>{});audioCtxRef.current=null}
 }
 function drawWave(stream:MediaStream){
  const AudioCtx=window.AudioContext||(window as any).webkitAudioContext;
  if(!AudioCtx)return;
  const ctx=new AudioCtx();audioCtxRef.current=ctx;
  const analyser=ctx.createAnalyser();analyser.fftSize=64;
  const source=ctx.createMediaStreamSource(stream);source.connect(analyser);
  const data=new Uint8Array(analyser.frequencyBinCount);
  const draw=()=>{
   const canvas=canvasRef.current;if(!canvas)return;
   analyser.getByteFrequencyData(data);
   const g=canvas.getContext("2d");if(!g)return;
   const w=canvas.width,h=canvas.height;g.clearRect(0,0,w,h);
   const bar=Math.max(2,w/data.length-2);
   for(let i=0;i<data.length;i++){
    const v=Math.max(3,(data[i]/255)*(h-4));
    g.fillStyle="#a76525";g.fillRect(i*(bar+2),h-v,bar,v);
   }
   rafRef.current=requestAnimationFrame(draw);
  };
  draw();
 }
 async function start(){
  setError("");setBlob(null);if(localUrl){URL.revokeObjectURL(localUrl);setLocalUrl("")}
  const mime=preferredMime();
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"||!mime){setError("Audio recording is not supported in this browser.");return}
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
   streamRef.current=stream;chunksRef.current=[];
   const recorder=new MediaRecorder(stream,{mimeType:mime,audioBitsPerSecond:64000});recorderRef.current=recorder;
   recorder.ondataavailable=e=>{if(e.data.size)chunksRef.current.push(e.data)};
   recorder.onstop=()=>{
    const data=new Blob(chunksRef.current,{type:mime});
    setBlob(data);const url=URL.createObjectURL(data);setLocalUrl(url);
    setRecording(false);cleanupMedia();
   };
   recorder.start(500);setElapsed(0);setRecording(true);drawWave(stream);
   const started=Date.now();
   timerRef.current=window.setInterval(()=>setElapsed(Math.min(maxSeconds,Math.floor((Date.now()-started)/1000))),250);
   hardStopRef.current=window.setTimeout(()=>{if(recorder.state==="recording")recorder.stop()},maxSeconds*1000);
  }catch(e:any){
   cleanupMedia();
   setError(e?.name==="NotAllowedError"?"Microphone access was denied. Allow microphone access and try again.":"Could not access the microphone.");
  }
 }
 function stop(){if(recorderRef.current?.state==="recording")recorderRef.current.stop()}
 async function save(){
  if(!blob||elapsed<1)return;
  setBusy(true);setError("");
  try{
   const form=new FormData();
   form.set("action","upload");form.set("day",String(day));form.set("attempt_id",attemptId);form.set("question_key",questionKey);form.set("duration_seconds",String(elapsed));
   const baseMime=(blob.type||"audio/webm").split(";")[0];
   const ext=baseMime==="audio/mp4"?"m4a":baseMime==="audio/ogg"?"ogg":"webm";
   form.set("audio",new File([blob],"answer."+ext,{type:baseMime}));
   const res=await fetch("/api/challenge-speaking",{method:"POST",credentials:"same-origin",body:form});
   const obj=await res.json();if(!res.ok)throw new Error(obj.detail||"Could not save recording.");
   const answer:SavedAnswer={...obj.answer,audio_url:obj.answer?.audio_url||(preview?localUrl:null)};
   onSaved(answer);setBlob(null);
  }catch(e){setError(e instanceof Error?e.message:"Could not save recording. Try again.")}finally{setBusy(false)}
 }

 if(saved)return <article className="sp-question saved">
  <div className="sp-q-number"><Check size={14}/></div>
  <div className="sp-q-main"><p>{questionText}</p><div className="sp-saved-row"><span><CheckCircle2 size={14}/> Answer recorded · {secondsLabel(saved.duration_seconds)}</span>{saved.audio_url?<audio controls preload="none" src={saved.audio_url}/>:<span className="sp-preview-audio">Preview answer saved for this session</span>}</div></div>
 </article>;

 return <article className={"sp-question "+(recording?"recording":"")}>
  <div className="sp-q-number">{String(questionKey).replace(/.*q/,"").replace("p2_main","2")||"•"}</div>
  <div className="sp-q-main">
   <p>{questionText}</p>
   {recording&&<div className="sp-recording-live"><canvas ref={canvasRef} width={250} height={34}/><strong>{secondsLabel(elapsed)}</strong><span>Recording</span></div>}
   {!recording&&blob&&<div className="sp-preview-row"><audio controls src={localUrl}/><button onClick={start} type="button"><RefreshCcw size={14}/> Record again</button><button className="primary" disabled={busy} onClick={save} type="button"><Check size={14}/>{busy?"Saving…":"Save answer"}</button></div>}
   {!recording&&!blob&&<button className="sp-record-btn" onClick={start} type="button"><Mic size={17}/> Record answer</button>}
   {recording&&<button className="sp-stop-btn" onClick={stop} type="button"><Square size={14} fill="currentColor"/> Stop recording</button>}
   {error&&<p className="sp-inline-error">{error}</p>}
  </div>
 </article>;
}

export default function SpeakingPage(){
 const params=useParams<{day:string}>();const day=Math.max(1,Math.min(60,Number(params.day)||1));
 const router=useRouter();
 const [data,setData]=useState<ApiData|null>(null);
 const [stage,setStage]=useState<Stage>("intro");
 const [answers,setAnswers]=useState<Record<string,SavedAnswer>>({});
 const [loading,setLoading]=useState(true);
 const [message,setMessage]=useState("");
 const [attemptId,setAttemptId]=useState("");
 const [micReady,setMicReady]=useState(false);
 const [micChecking,setMicChecking]=useState(false);
 const [prepRemaining,setPrepRemaining]=useState(60);
 const [notes,setNotes]=useState("");
 const [submitting,setSubmitting]=useState(false);
 const [fullScreen,setFullScreen]=useState(false);

 const payload=data?.content.payload;
 const p1=payload?.part1.questions||[],p3=payload?.part3.questions||[];
 const part2Key=payload?.part2.key||"p2_main";
 const p1Done=p1.length>0&&p1.every(q=>answers[q.key]);
 const p2Done=Boolean(answers[part2Key]);
 const p3Done=p3.length>0&&p3.every(q=>answers[q.key]);
 const expectedCount=p1.length+1+p3.length;

 const load=useCallback(async()=>{
  setLoading(true);setMessage("");
  try{
   const res=await fetch("/api/challenge-speaking?day="+day,{credentials:"same-origin",cache:"no-store"});
   const obj=await res.json();if(!res.ok)throw new Error(obj.detail||"Could not load Speaking.");
   setData(obj);const attempt=obj.attempt as Attempt|null;
   if(attempt?.id)setAttemptId(attempt.id);
   const map:Record<string,SavedAnswer>={};for(const a of attempt?.answers||[])map[a.question_key]=a;setAnswers(map);
   if(attempt?.status==="submitted"){setStage("complete");return}
   if(attempt){
    const content=obj.content?.payload as SpeakingPayload;
    const pp1=content?.part1?.questions||[],pp3=content?.part3?.questions||[],p2key=content?.part2?.key||"p2_main";
    const done1=pp1.length>0&&pp1.every(q=>map[q.key]);
    const done2=Boolean(map[p2key]);const done3=pp3.length>0&&pp3.every(q=>map[q.key]);
    setStage(done1&&done2&&done3?"review":done2?"part3":done1?"part2":"part1");
   }else setStage("intro");
  }catch(e){setMessage(e instanceof Error?e.message:"Could not load Speaking.")}finally{setLoading(false)}
 },[day]);
 useEffect(()=>{void load()},[load]);
 useEffect(()=>{const fn=()=>setFullScreen(!!document.fullscreenElement);document.addEventListener("fullscreenchange",fn);return()=>document.removeEventListener("fullscreenchange",fn)},[]);
 useEffect(()=>{
  const expiry=data?.attempt?.part2_preparation_expires_at;if(!expiry){setPrepRemaining(60);return}
  const tick=()=>setPrepRemaining(Math.max(0,Math.ceil((Date.parse(expiry)-Date.now())/1000)));
  tick();const id=window.setInterval(tick,250);return()=>window.clearInterval(id);
 },[data?.attempt?.part2_preparation_expires_at]);
 useEffect(()=>{
  if(!attemptId)return;const key="ark60-speaking-notes-"+attemptId;try{setNotes(localStorage.getItem(key)||"")}catch{}
 },[attemptId]);
 useEffect(()=>{if(!attemptId)return;try{localStorage.setItem("ark60-speaking-notes-"+attemptId,notes)}catch{}},[attemptId,notes]);

 function putAnswer(answer:SavedAnswer){setAnswers(prev=>({...prev,[answer.question_key]:answer}))}
 async function checkMic(){
  setMicChecking(true);setMessage("");
  try{
   if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"||!preferredMime())throw new Error("This browser does not support microphone recording.");
   const stream=await navigator.mediaDevices.getUserMedia({audio:true});stream.getTracks().forEach(t=>t.stop());setMicReady(true);return true;
  }catch(e:any){setMicReady(false);setMessage(e?.name==="NotAllowedError"?"Microphone permission is blocked. Allow microphone access in your browser, then retry.":e instanceof Error?e.message:"Microphone is unavailable.");return false}
  finally{setMicChecking(false)}
 }
 async function startSpeaking(){
  const ok=micReady||await checkMic();if(!ok)return;
  try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen?.().catch(()=>{})}catch{}
  if(data?.preview){setAttemptId("preview-speaking-"+day);setStage("part1");return}
  const res=await fetch("/api/challenge-speaking",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"start",day})});
  const obj=await res.json();if(!res.ok){setMessage(obj.detail||"Could not start Speaking.");return}
  setAttemptId(obj.attempt.id);setData(prev=>prev?{...prev,attempt:obj.attempt}:prev);setStage(obj.already_submitted?"complete":"part1");
 }
 async function startPreparation(){
  setMessage("");
  const res=await fetch("/api/challenge-speaking",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"start_preparation",day,attempt_id:attemptId})});
  const obj=await res.json();if(!res.ok){setMessage(obj.detail||"Could not start preparation.");return}
  setData(prev=>prev?{...prev,attempt:{...(prev.attempt||{id:attemptId,day_number:day,status:"in_progress"}),part2_preparation_started_at:obj.started_at,part2_preparation_expires_at:obj.expires_at}}:prev);
 }
 async function submit(){
  if(!p1Done||!p2Done||!p3Done)return;
  if(!window.confirm("Submit your Full Speaking attempt?\n\nYou will not be able to replace the submitted attempt."))return;
  setSubmitting(true);setMessage("");
  try{
   const res=await fetch("/api/challenge-speaking",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"submit",day,attempt_id:attemptId})});
   const obj=await res.json();if(!res.ok)throw new Error(obj.detail||"Could not submit Full Speaking.");
   setStage("complete");
   if(!obj.preview)await load();
  }catch(e){setMessage(e instanceof Error?e.message:"Could not submit Full Speaking.")}finally{setSubmitting(false)}
 }
 async function goBack(){try{if(document.fullscreenElement)await document.exitFullscreen()}catch{}router.push("/day/"+day)}
 async function toggleFullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{}}

 if(loading)return <main className="sp-shell sp-center"><div className="sp-loader"/><b>Loading Speaking…</b></main>;
 if(message&&!data)return <main className="sp-shell sp-center"><Mic size={28}/><h1>Speaking unavailable</h1><p>{message}</p><AnimatedBackButton href={"/day/"+day} ariaLabel="Back to day"/></main>;
 if(!data||!payload)return null;

 const prepStarted=Boolean(data.attempt?.part2_preparation_started_at)||Boolean(data.preview&&data.attempt?.part2_preparation_expires_at);
 const prepReady=prepStarted&&prepRemaining<=0;
 const submitted=data.attempt?.status==="submitted"||stage==="complete";

 return <main className="sp-shell">
  <StudyTimeHeartbeat day={day} module="speaking"/>
  <header className="sp-topbar"><AnimatedBackButton onClick={goBack} ariaLabel="Back to study day"/><div><b>ARK IELTS SPEAKING</b><span>DAY {pad(day)} · FULL SPEAKING</span></div><button className="sp-full" onClick={toggleFullscreen} aria-label={fullScreen?"Exit fullscreen":"Enter fullscreen"}>{fullScreen?<Minimize2 size={18}/>:<Maximize2 size={18}/>}</button></header>

  <div className="sp-progress"><span className={stage==="part1"?"active":p1Done?"done":""}>01 <b>Part 1</b></span><i/><span className={stage==="part2"?"active":p2Done?"done":""}>02 <b>Part 2</b></span><i/><span className={stage==="part3"?"active":p3Done?"done":""}>03 <b>Part 3</b></span><i/><span className={stage==="review"||stage==="complete"?"active":""}>04 <b>Review</b></span></div>

  <section className="sp-content">
   {message&&<div className="sp-message">{message}<button onClick={()=>setMessage("")}>×</button></div>}

   {stage==="intro"&&<div className="sp-intro">
    <span className="sp-intro-icon"><Mic size={28}/></span><small>DAY {pad(day)} · IELTS SPEAKING</small><h1>Full Speaking Practice</h1><p>Answer every question with your microphone. Your saved recordings are sent securely to your teacher for review.</p>
    <div className="sp-intro-parts"><div><b>Part 1</b><span>{p1.length} questions</span></div><div><b>Part 2</b><span>1-minute preparation</span></div><div><b>Part 3</b><span>{p3.length} questions</span></div></div>
    <div className="sp-mic-check"><ShieldCheck size={17}/><span>{micReady?"Microphone ready":"Microphone permission is required"}</span>{!micReady&&<button onClick={checkMic} disabled={micChecking}>{micChecking?"Checking…":"Check microphone"}</button>}</div>
    <button className="sp-start" onClick={startSpeaking}><Mic size={17}/> Start Speaking</button>
    {data.preview&&<p className="sp-preview-note">Preview mode: recordings stay temporary and do not enter real student results.</p>}
   </div>}

   {stage==="part1"&&<div className="sp-part">
    <div className="sp-part-head"><small>PART 1</small><h1>{payload.part1.topic}</h1><p>Record and save one answer for each question.</p></div>
    <div className="sp-questions">{p1.map(q=><RecorderCard key={q.key} day={day} attemptId={attemptId} questionKey={q.key} questionText={q.text} part={1} saved={answers[q.key]} preview={!!data.preview} maxSeconds={90} onSaved={putAnswer}/>)}</div>
    <div className="sp-part-footer"><span>{Object.values(answers).filter(a=>a.part_number===1).length}/{p1.length} answers saved</span><button disabled={!p1Done} onClick={()=>setStage("part2")}>Continue to Part 2 <Send size={14}/></button></div>
   </div>}

   {stage==="part2"&&<div className="sp-part">
    <div className="sp-part-head"><small>PART 2 · CUE CARD</small><h1>{payload.part2.topic}</h1></div>
    <article className="sp-cue"><h2>{payload.part2.prompt}</h2><h3>You should say:</h3><ul>{payload.part2.bullets.map(x=><li key={x}>{x}</li>)}</ul></article>
    {!p2Done&&<div className="sp-prep">
     <div><Clock3 size={20}/><span><small>PREPARATION</small><b>{prepStarted?secondsLabel(prepRemaining):"1:00"}</b></span></div>
     {!prepStarted?<button onClick={startPreparation}>Start preparation</button>:prepRemaining>0?<span className="sp-prep-live">Preparation is running — this timer cannot be restarted.</span>:<span className="sp-prep-done"><Check size={14}/> Preparation finished</span>}
    </div>}
    {prepStarted&&<label className="sp-notes"><span>Private notes <i>not sent to your teacher</i></span><textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Write short notes while you prepare…" disabled={p2Done}/></label>}
    {prepReady||p2Done?<div className="sp-questions"><RecorderCard day={day} attemptId={attemptId} questionKey={part2Key} questionText={payload.part2.prompt} part={2} saved={answers[part2Key]} preview={!!data.preview} maxSeconds={payload.part2.max_answer_seconds||120} onSaved={putAnswer}/></div>:null}
    <div className="sp-part-footer"><button className="ghost" onClick={()=>setStage("part1")}>Back to Part 1</button><button disabled={!p2Done} onClick={()=>setStage("part3")}>Continue to Part 3 <Send size={14}/></button></div>
   </div>}

   {stage==="part3"&&<div className="sp-part">
    <div className="sp-part-head"><small>PART 3</small><h1>{payload.part3.topic}</h1><p>Record and save one answer for each question.</p></div>
    <div className="sp-questions">{p3.map(q=><RecorderCard key={q.key} day={day} attemptId={attemptId} questionKey={q.key} questionText={q.text} part={3} saved={answers[q.key]} preview={!!data.preview} maxSeconds={90} onSaved={putAnswer}/>)}</div>
    <div className="sp-part-footer"><button className="ghost" onClick={()=>setStage("part2")}>Back to Part 2</button><button disabled={!p3Done} onClick={()=>setStage("review")}>Review answers <Check size={14}/></button></div>
   </div>}

   {stage==="review"&&<div className="sp-review">
    <small>DAY {pad(day)} · FULL SPEAKING</small><h1>Ready to submit</h1><p>Check that every part is complete. After submission, recordings cannot be replaced.</p>
    <div className="sp-review-grid"><article><b>Part 1</b><strong>{p1.filter(q=>answers[q.key]).length}/{p1.length}</strong><span>recorded</span></article><article><b>Part 2</b><strong>{p2Done?1:0}/1</strong><span>recorded</span></article><article><b>Part 3</b><strong>{p3.filter(q=>answers[q.key]).length}/{p3.length}</strong><span>recorded</span></article></div>
    <button className="sp-submit" disabled={submitting||Object.keys(answers).length!==expectedCount} onClick={submit}><Send size={16}/>{submitting?"Submitting…":"Submit Full Speaking"}</button>
    <button className="sp-review-back" onClick={()=>setStage("part3")}>Return to Part 3</button>
   </div>}

   {submitted&&stage==="complete"&&<div className="sp-complete"><span><CheckCircle2 size={30}/></span><small>DAY {pad(day)}</small><h1>Speaking complete</h1><p>{data.preview?"Preview completed. No real submission, coin or admin record was created.":"Your Full Speaking attempt was submitted for teacher review."}</p>
    {!data.preview&&<div className="sp-result-state"><b>{data.attempt?.review_status==="reviewed"?"Teacher review complete":"Teacher review pending"}</b>{data.attempt?.review_status==="reviewed"&&<><strong>Band {Number(data.attempt.band).toFixed(1)}</strong>{data.attempt.feedback&&<p>{data.attempt.feedback}</p>}</>}</div>}
    {!data.preview&&data.attempt?.audio_expired&&<div className="sp-expired"><LockKeyhole size={15}/> Audio expired · recording retention period ended.</div>}
    <button onClick={goBack}>Back to Day {pad(day)}</button>
   </div>}
  </section>
 </main>;
}
