"use client";
import {useEffect,useMemo,useState} from "react";
import AnimatedBackButton from "../../components/animated-back-button";
import {CheckCircle2,Clock3,FileText,RefreshCcw,Search,Send,UserRound,Sparkles} from "lucide-react";
import "./writing-admin.css";

type Row={id:string;day_number:number;payload:any;submitted_at:string;band:number|null;review_status:string;review_feedback?:string|null;reviewed_at?:string|null;active_writing_seconds?:number;student:{first_name:string;last_name:string;username:string}|null};

function dur(seconds:number){const s=Math.max(0,Math.floor(seconds||0));return Math.floor(s/60)+"m "+String(s%60).padStart(2,"0")+"s"}
function when(value:string){return new Date(value).toLocaleString("en-GB",{timeZone:"Asia/Tashkent",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}
function dayDate(day:number){return new Date(Date.UTC(2026,9,day)).toLocaleDateString("en-GB",{timeZone:"UTC",day:"numeric",month:"short"})}

export default function AdminWriting(){
 const [rows,setRows]=useState<Row[]>([]),[loading,setLoading]=useState(true),[message,setMessage]=useState("");
 const [query,setQuery]=useState(""),[filter,setFilter]=useState<"pending"|"checked"|"all">("pending"),[day,setDay]=useState<number|0>(0);
 const [selectedId,setSelectedId]=useState(""),[bands,setBands]=useState<Record<string,string>>({}),[feedback,setFeedback]=useState<Record<string,string>>({}),[busy,setBusy]=useState(""),[aiBusy,setAiBusy]=useState(false);

 async function load(){
  setLoading(true);setMessage("");
  try{
   const res=await fetch("/api/challenge-writing?action=admin_list",{credentials:"same-origin",cache:"no-store"});
   const obj=await res.json();if(!res.ok)throw new Error(obj.detail||"Could not load Writing submissions.");
   const next:Row[]=obj.submissions||[];setRows(next);
   const b:Record<string,string>={},f:Record<string,string>={};
   next.forEach(r=>{if(r.band!==null)b[r.id]=String(r.band);if(r.review_feedback)f[r.id]=r.review_feedback||""});
   setBands(b);setFeedback(f);
   const requested=new URLSearchParams(window.location.search).get("id");
   setSelectedId(current=>requested&&next.some(r=>r.id===requested)?requested:current&&next.some(r=>r.id===current)?current:(next[0]?.id||""));
  }catch(e){setMessage(e instanceof Error?e.message:"Could not contact the server.")}finally{setLoading(false)}
 }
 useEffect(()=>{void load()},[]);

 const days=useMemo(()=>[...new Set(rows.map(r=>r.day_number))].sort((a,b)=>a-b),[rows]);
 const visible=useMemo(()=>rows.filter(r=>filter==="all"||r.review_status===(filter==="checked"?"reviewed":filter)).filter(r=>!day||r.day_number===day).filter(r=>{
  const text=(r.student?(r.student.first_name+" "+r.student.last_name+" "+r.student.username):"")+" "+r.day_number+" "+String(r.payload?.task_type||"");
  return text.toLowerCase().includes(query.trim().toLowerCase());
 }),[rows,filter,query,day]);
 useEffect(()=>{if(visible.length&&!visible.some(r=>r.id===selectedId))setSelectedId(visible[0].id)},[visible,selectedId]);
 const selected=rows.find(r=>r.id===selectedId)||null;
 const pending=rows.filter(r=>r.review_status==="pending").length;

 async function grade(row:Row){
  const band=Number(bands[row.id]);if(!Number.isFinite(band)){setMessage("Select a band score first.");return}
  setBusy(row.id);setMessage("");
  try{
   const res=await fetch("/api/challenge-writing",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({action:"grade",id:row.id,band,feedback:feedback[row.id]||""})});
   const obj=await res.json();if(!res.ok)throw new Error(obj.detail||"Could not save score.");
   await load();
  }catch(e){setMessage(e instanceof Error?e.message:"Could not contact the server.")}finally{setBusy("")}
 }

 async function aiGrade(row:Row){
  setBusy("ai-"+row.id);setMessage("");
  try{
   const res=await fetch("/api/challenge-writing",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({action:"ai_grade",id:row.id})});
   const obj=await res.json();if(!res.ok)throw new Error(obj.detail||"AI assessment failed.");
   await load();
  }catch(e){setMessage(e instanceof Error?e.message:"Could not contact the server.")}finally{setBusy("")}
 }

 async function aiGradePending(){
  setAiBusy(true);setMessage("");
  try{
   let total=0;
   for(let i=0;i<10;i++){
    const res=await fetch("/api/challenge-writing",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({action:"ai_grade_pending",limit:8})});
    const obj=await res.json();if(!res.ok)throw new Error(obj.detail||"Could not run AI assessment.");
    total+=Number(obj.graded||0);
    if(Number(obj.processed||0)===0)break;
   }
   setMessage(total?("AI checked "+total+" pending Writing submissions. Review and approve the suggested scores."):"No unchecked Writing submissions were found.");
   await load();
  }catch(e){setMessage(e instanceof Error?e.message:"Could not contact the server.")}finally{setAiBusy(false)}
 }

 return <main className="wa-shell">
  <header className="wa-top"><AnimatedBackButton href="/admin" ariaLabel="Back to admin"/><div><b>ARK EDUCATION</b><span>WRITING INBOX</span></div><button onClick={load}><RefreshCcw size={15}/> Refresh</button></header>
  <section className="wa-hero"><div><small>TEACHER REVIEW INBOX</small><h1>Writing submissions</h1><p>Every new essay is AI-assessed first. The suggested band, criteria and corrections stay pending until a teacher reviews and approves them.</p><button className="wa-ai-all" disabled={aiBusy||pending===0} onClick={aiGradePending}><Sparkles size={14}/>{aiBusy?"Checking pending Writing…":"AI check pending"}</button></div><div className="wa-kpis"><span><b>{pending}</b> Pending</span><span><b>{rows.length-pending}</b> Checked</span><span><b>{rows.length}</b> In inbox</span></div></section>

  <section className="wa-days"><button className={day===0?"active":""} onClick={()=>setDay(0)}><span>ALL</span><b>{rows.length}</b><small>current inbox</small></button>{days.map(d=><button key={d} className={day===d?"active":""} onClick={()=>setDay(d)}><span>DAY {String(d).padStart(2,"0")}</span><b>{dayDate(d)}</b><small>{rows.filter(r=>r.day_number===d).length} submissions</small></button>)}</section>

  <section className="wa-toolbar"><div className="wa-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search student, day or task…"/></div><div className="wa-tabs">{(["pending","checked","all"] as const).map(x=><button key={x} className={filter===x?"active":""} onClick={()=>setFilter(x)}>{x}</button>)}</div></section>
  {message&&<p className="wa-message">{message}</p>}

  <section className="wa-layout">
   <div className="wa-list">{loading?<div className="wa-empty">Loading submissions…</div>:visible.length===0?<div className="wa-empty"><FileText size={26}/><b>No Writing submissions here.</b></div>:visible.map(row=>{const checked=row.review_status==="reviewed";return <button key={row.id} className={"wa-row "+(selectedId===row.id?"selected ":"")+(checked?"reviewed":"")} onClick={()=>setSelectedId(row.id)}><span className="wa-avatar"><UserRound size={17}/></span><span className="wa-person"><b>{row.student?row.student.first_name+" "+row.student.last_name:"Student"}</b><small>@{row.student?.username||"student"} · Day {String(row.day_number).padStart(2,"0")} · {String(row.payload?.task_type||"writing").toUpperCase()}</small><em>{row.payload?.word_count??"—"} words · {when(row.submitted_at)}</em></span><span className={"wa-state "+(checked?"done":"wait")}>{checked?<CheckCircle2 size={13}/>:<Clock3 size={13}/>} {checked?"Checked":"Pending"}</span></button>})}</div>

   <div className="wa-detail">{!selected?<div className="wa-empty"><FileText size={28}/><b>Select a Writing submission</b><p>The response metrics and grading controls will appear here.</p></div>:<>
    <div className="wa-detail-head"><div><small>DAY {String(selected.day_number).padStart(2,"0")} · {String(selected.payload?.task_type||"WRITING").toUpperCase()}</small><h2>{selected.student?selected.student.first_name+" "+selected.student.last_name:"Student"}</h2><p>@{selected.student?.username||"student"} · Submitted {when(selected.submitted_at)}</p></div><span className={"wa-state "+(selected.review_status==="reviewed"?"done":"wait")}>{selected.review_status==="reviewed"?<CheckCircle2 size={13}/>:<Clock3 size={13}/>} {selected.review_status==="reviewed"?"Checked":"Pending review"}</span></div>
    <div className="wa-metrics"><span><small>WORDS</small><b>{selected.payload?.word_count??"—"}</b></span><span><small>Active Writing Time</small><b>{dur(Number(selected.active_writing_seconds||0))}</b></span><span><small>Task Timer Used</small><b>{dur(Number(selected.payload?.duration_seconds||0))}</b></span><span><small>SUBMITTED</small><b>{when(selected.submitted_at)}</b></span></div>
    <div className="wa-actions"><a href={"/api/challenge-writing?action=pdf&id="+selected.id} target="_blank" rel="noreferrer"><FileText size={15}/> Open assessment PDF</a>{!selected.payload?.ai_assessment&&<button disabled={busy==="ai-"+selected.id} onClick={()=>aiGrade(selected)}><Sparkles size={15}/>{busy==="ai-"+selected.id?"Checking…":"Run AI check"}</button>}</div>
    {selected.payload?.ai_assessment&&<div className="wa-ai-card"><div className="wa-ai-head"><span><Sparkles size={15}/> AI SUGGESTION</span><b>Band {Number(selected.payload.ai_assessment.band??selected.band??0).toFixed(1)}</b><em>Teacher approval required</em></div><div className="wa-ai-scores"><span><small>{selected.payload?.task_type==="task1"?"TASK ACHIEVEMENT":"TASK RESPONSE"}</small><b>{Number(selected.payload.ai_assessment.task_criterion??0).toFixed(1)}</b></span><span><small>COHERENCE</small><b>{Number(selected.payload.ai_assessment.coherence_cohesion??0).toFixed(1)}</b></span><span><small>LEXICAL</small><b>{Number(selected.payload.ai_assessment.lexical_resource??0).toFixed(1)}</b></span><span><small>GRAMMAR</small><b>{Number(selected.payload.ai_assessment.grammar??0).toFixed(1)}</b></span></div><p>{selected.payload.ai_assessment.summary}</p>{Array.isArray(selected.payload.ai_assessment.errors)&&selected.payload.ai_assessment.errors.length>0&&<div className="wa-errors"><b>Key corrections</b>{selected.payload.ai_assessment.errors.map((e:any,i:number)=><article key={i}><strong>{i+1}. {e.category||"Correction"}</strong><span><i>Original</i>{e.original}</span><span><i>Better</i>{e.correction}</span>{e.explanation&&<small>{e.explanation}</small>}</article>)}</div>}</div>}
    <div className="wa-review"><label><span>Teacher final band</span><select value={bands[selected.id]||""} onChange={e=>setBands(v=>({...v,[selected.id]:e.target.value}))}><option value="">Select</option>{Array.from({length:19},(_,i)=>i/2).map(v=><option key={v} value={v}>{v.toFixed(1)}</option>)}</select></label><label className="feedback"><span>Teacher feedback <i>editable before publishing</i></span><textarea value={feedback[selected.id]||""} onChange={e=>setFeedback(v=>({...v,[selected.id]:e.target.value}))} placeholder="Review the AI feedback, edit it if needed, then approve…"/></label><button disabled={busy===selected.id||!bands[selected.id]} onClick={()=>grade(selected)}>{busy===selected.id?"Saving…":selected.review_status==="reviewed"?"Update published result":"Approve & publish"}<Send size={15}/></button></div>
   </>}</div>
  </section>
 </main>;
}
