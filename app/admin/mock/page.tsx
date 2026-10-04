"use client";
import {useEffect,useMemo,useState} from "react";
import {BookOpen,CheckCircle2,Clock3,FileText,Headphones,PenLine,RefreshCcw,Search,UserRound,X} from "lucide-react";
import AnimatedBackButton from "../../components/animated-back-button";
import "./mock-admin.css";

type Student={first_name:string;last_name:string;username:string};
type Attempt={
 id:string;student_id:string;day_number:number;stage:"listening"|"reading"|"writing"|"assessing"|"completed";status:string;
 listening_score:number|null;listening_band:number|null;listening_part_scores:number[]|null;listening_submitted_at:string|null;
 reading_score:number|null;reading_band:number|null;reading_part_scores:number[]|null;reading_submitted_at:string|null;
 writing_band:number|null;writing_assessment:any;writing_task1:string;writing_task2:string;writing_submitted_at:string|null;
 grading_error:string|null;started_at:string;updated_at:string;completed_at:string|null;student:Student|null;
};
const when=(v:string|null)=>v?new Date(v).toLocaleString("en-GB",{timeZone:"Asia/Tashkent",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):"—";
const band=(v:number|null)=>v===null||v===undefined?"—":Number(v).toFixed(1);
const overall=(r:Attempt)=>r.listening_band!=null&&r.reading_band!=null&&r.writing_band!=null?Math.round(((Number(r.listening_band)+Number(r.reading_band)+Number(r.writing_band))/3)*2)/2:null;
const status=(r:Attempt)=>{
 if(r.stage==="completed")return {label:"Completed",tone:"done"};
 if(r.stage==="assessing")return {label:"AI assessing",tone:"ai"};
 if(r.stage==="writing")return {label:"Writing",tone:"active"};
 if(r.stage==="reading")return {label:"Reading",tone:"active"};
 return {label:"Listening",tone:"active"};
};

export default function AdminFullMock(){
 const [rows,setRows]=useState<Attempt[]>([]),[loading,setLoading]=useState(true),[message,setMessage]=useState(""),[query,setQuery]=useState(""),[selected,setSelected]=useState<Attempt|null>(null),[lastUpdated,setLastUpdated]=useState("");
 async function load(silent=false){
  if(!silent)setLoading(true);setMessage("");
  try{
   const res=await fetch("/api/challenge-mock?action=admin_list",{credentials:"same-origin",cache:"no-store"});
   const obj=await res.json();
   if(res.status===401){window.location.assign("/admin");return}
   if(!res.ok)throw new Error(obj.detail||"Could not load Full Mock results.");
   setRows(obj.attempts||[]);
   setLastUpdated(new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Tashkent",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(new Date()));
   if(selected){const fresh=(obj.attempts||[]).find((x:Attempt)=>x.id===selected.id);if(fresh)setSelected(fresh)}
  }catch(e){setMessage(e instanceof Error?e.message:"Could not contact the server.")}
  finally{if(!silent)setLoading(false)}
 }
 useEffect(()=>{void load();const id=window.setInterval(()=>{if(document.visibilityState==="visible")void load(true)},5000);const focus=()=>void load(true);window.addEventListener("focus",focus);return()=>{window.clearInterval(id);window.removeEventListener("focus",focus)}},[]);
 const visible=useMemo(()=>{const q=query.trim().toLowerCase();return rows.filter(r=>!q||((r.student?.first_name||"")+" "+(r.student?.last_name||"")+" "+(r.student?.username||"")).toLowerCase().includes(q))},[rows,query]);
 const completed=rows.filter(r=>r.stage==="completed").length;
 const readingDone=rows.filter(r=>r.reading_score!=null).length;
 const listeningDone=rows.filter(r=>r.listening_score!=null).length;
 return <main className="ma-shell">
  <header className="ma-top"><AnimatedBackButton href="/admin" ariaLabel="Back to admin"/><div><b>ARK EDUCATION</b><span>4 OCT · FULL MOCK RESULTS</span></div><button onClick={()=>load()} disabled={loading}><RefreshCcw size={15}/> Refresh</button></header>
  <section className="ma-hero"><div><small>LIVE ADMIN RESULTS</small><h1>4 October Full Mock</h1><p>Listening and Reading appear as soon as each section is submitted. Writing appears after AI assessment. Students still see scores only after the full mock is complete.</p></div><div className="ma-live"><i/><span>Auto refresh · 5s</span><b>{lastUpdated||"--:--:--"}</b></div></section>
  <section className="ma-kpis"><article><Headphones/><span>LISTENING SUBMITTED</span><b>{listeningDone}</b></article><article><BookOpen/><span>READING SUBMITTED</span><b>{readingDone}</b></article><article><CheckCircle2/><span>FULLY COMPLETED</span><b>{completed}</b></article><article><UserRound/><span>STARTED MOCK</span><b>{rows.length}</b></article></section>
  <section className="ma-toolbar"><div><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search student…"/></div><span>4 OCTOBER · DAY 04</span></section>
  {message&&<p className="ma-message">{message}</p>}
  <section className="ma-table-wrap">
   <div className="ma-table-head"><div><small>SECTION-BY-SECTION RESULTS</small><h2>Student progress and scores</h2></div><span>{visible.length} students</span></div>
   <div className="ma-overflow"><table><thead><tr><th>Student</th><th>Listening /40</th><th>L Band</th><th>Reading /40</th><th>R Band</th><th>Writing</th><th>Mock Overall</th><th>Status</th></tr></thead><tbody>
    {loading&&!rows.length?<tr><td colSpan={8} className="ma-empty">Loading live mock results…</td></tr>:visible.length?visible.map(r=>{const st=status(r),ov=overall(r);return <tr key={r.id} onClick={()=>setSelected(r)}>
     <td><b>{r.student?r.student.first_name+" "+r.student.last_name:"Student"}</b><small>@{r.student?.username||"student"}</small></td>
     <td className={r.listening_score!=null?"ready":""}>{r.listening_score!=null?r.listening_score+"/40":"—"}<small>{r.listening_submitted_at?when(r.listening_submitted_at):""}</small></td>
     <td>{band(r.listening_band)}</td>
     <td className={r.reading_score!=null?"ready":""}>{r.reading_score!=null?r.reading_score+"/40":"—"}<small>{r.reading_submitted_at?when(r.reading_submitted_at):""}</small></td>
     <td>{band(r.reading_band)}</td>
     <td className={r.writing_band!=null?"ready":""}>{r.writing_band!=null?"Band "+band(r.writing_band):r.stage==="assessing"?"Assessing…":"—"}<small>{r.writing_submitted_at?when(r.writing_submitted_at):""}</small></td>
     <td>{ov!=null?<strong>{ov.toFixed(1)}</strong>:"—"}</td>
     <td><span className={"ma-status "+st.tone}>{st.label}</span></td>
    </tr>}):<tr><td colSpan={8} className="ma-empty">No student has started the Full Mock yet.</td></tr>}
   </tbody></table></div>
  </section>
  {selected&&<div className="ma-modal-bg" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><section className="ma-modal">
   <header><div><small>4 OCT · FULL MOCK</small><h2>{selected.student?selected.student.first_name+" "+selected.student.last_name:"Student"}</h2><p>@{selected.student?.username||"student"} · Started {when(selected.started_at)}</p></div><button onClick={()=>setSelected(null)}><X size={18}/></button></header>
   <div className="ma-modal-body">
    <div className="ma-section-card"><div><Headphones/><h3>Listening</h3></div><strong>{selected.listening_score!=null?selected.listening_score+"/40":"Not submitted"}</strong><span>{selected.listening_band!=null?"Band "+band(selected.listening_band):"—"}</span>{selected.listening_part_scores&&<small>Sections: {selected.listening_part_scores.join(" · ")}</small>}</div>
    <div className="ma-section-card"><div><BookOpen/><h3>Reading</h3></div><strong>{selected.reading_score!=null?selected.reading_score+"/40":"Not submitted"}</strong><span>{selected.reading_band!=null?"Band "+band(selected.reading_band):"—"}</span>{selected.reading_part_scores&&<small>Parts: {selected.reading_part_scores.join(" · ")}</small>}</div>
    <div className="ma-section-card writing"><div><PenLine/><h3>Writing</h3></div><strong>{selected.writing_band!=null?"Band "+band(selected.writing_band):selected.stage==="assessing"?"AI assessing…":"Not submitted"}</strong>{selected.grading_error&&<p className="ma-grade-error">{selected.grading_error}</p>}
     {selected.writing_assessment&&<div className="ma-criteria">
      <h4>Task 1 · Band {band(selected.writing_assessment.task1?.band??null)}</h4><p>TA {band(selected.writing_assessment.task1?.task_achievement??null)} · CC {band(selected.writing_assessment.task1?.coherence_cohesion??null)} · LR {band(selected.writing_assessment.task1?.lexical_resource??null)} · GRA {band(selected.writing_assessment.task1?.grammar??null)}</p>
      <h4>Task 2 · Band {band(selected.writing_assessment.task2?.band??null)}</h4><p>TR {band(selected.writing_assessment.task2?.task_response??null)} · CC {band(selected.writing_assessment.task2?.coherence_cohesion??null)} · LR {band(selected.writing_assessment.task2?.lexical_resource??null)} · GRA {band(selected.writing_assessment.task2?.grammar??null)}</p>
      {selected.writing_assessment.summary&&<em>{selected.writing_assessment.summary}</em>}
     </div>}
    </div>
    {(selected.writing_task1||selected.writing_task2)&&<div className="ma-writing-answers"><h3><FileText size={17}/> Writing answers</h3><article><b>Task 1</b><p>{selected.writing_task1||"—"}</p></article><article><b>Task 2</b><p>{selected.writing_task2||"—"}</p></article></div>}
   </div>
  </section></div>}
 </main>
}
