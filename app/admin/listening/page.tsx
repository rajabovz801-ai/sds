"use client";
import {useEffect,useMemo,useState} from "react";
import AnimatedBackButton from "../../components/animated-back-button";
import {CheckCircle2,Clock3,Headphones,RefreshCw,Search,UserRound,XCircle} from "lucide-react";
import "./listening-admin.css";

type Student={first_name:string;last_name:string;username:string}|null;
type Row={id:string;student_id:string;day_number:number;status:string;submitted_at:string;elapsed_seconds:number;part_scores:number[];score:number;band:number;student:Student};
type DayMeta={day_number:number;title:string;submission_count:number};
type ReviewItem={number:number;submitted:string;correct:string[];status:"correct"|"wrong"|"empty"};
type Detail=Row&{answers:Record<string,string>;review:ReviewItem[];content:{title:string;payload:any}};

function dur(seconds:number){const s=Math.max(0,Math.floor(seconds||0));return Math.floor(s/60)+"m "+String(s%60).padStart(2,"0")+"s"}
function when(value:string){return new Date(value).toLocaleString("en-GB",{timeZone:"Asia/Tashkent",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}
function dayDate(day:number){return new Date(Date.UTC(2026,9,day)).toLocaleDateString("en-GB",{timeZone:"UTC",day:"numeric",month:"short"})}
function tokenText(tokens:any[]){return (tokens||[]).map(t=>typeof t==="string"?t:"_____").join("").replace(/\s+/g," ").trim()}
function promptMap(payload:any){
 const map=new Map<number,string>();
 for(const section of payload?.sections||[])for(const block of section.blocks||[]){
  if(block.kind==="mcq")for(const q of block.questions||[])map.set(Number(q.q),String(q.text));
  if(block.kind==="matching")for(const q of block.items||[])map.set(Number(q.q),String(q.text));
  if(block.kind==="choose_two")for(const q of block.questions||[])map.set(Number(q),String(block.question));
  if(block.kind==="table")for(const row of block.rows||[])for(const cell of row||[])for(const t of cell||[])if(typeof t!=="string"&&t?.q)map.set(Number(t.q),tokenText(cell));
  if(block.kind==="notes")for(const item of block.items||[])for(const t of item||[])if(typeof t!=="string"&&t?.q)map.set(Number(t.q),tokenText(item));
  if(block.kind==="notes_groups")for(const group of block.groups||[])for(const item of group.items||[])for(const t of item||[])if(typeof t!=="string"&&t?.q)map.set(Number(t.q),tokenText(item));
 }
 return map;
}

export default function AdminListening(){
 const [rows,setRows]=useState<Row[]>([]),[days,setDays]=useState<DayMeta[]>([]),[selectedDay,setSelectedDay]=useState(1);
 const [loading,setLoading]=useState(true),[message,setMessage]=useState(""),[query,setQuery]=useState("");
 const [selected,setSelected]=useState<Detail|null>(null),[detailBusy,setDetailBusy]=useState(false);

 async function load(day=selectedDay){
  setLoading(true);setMessage("");
  try{
   const res=await fetch("/api/challenge-listening?action=admin_list&day="+day,{credentials:"same-origin",cache:"no-store"});
   const obj=await res.json();if(!res.ok)throw new Error(obj.detail||"Could not load Listening results.");
   const available:DayMeta[]=obj.available_days||[];
   setDays(available);
   if(available.length&&!available.some(d=>d.day_number===day)){setSelectedDay(available[0].day_number);return}
   setRows(obj.submissions||[]);
   setSelected(null);
  }catch(e){setMessage(e instanceof Error?e.message:"Could not load Listening results.")}finally{setLoading(false)}
 }
 useEffect(()=>{void load(selectedDay)},[selectedDay]);

 async function open(row:Row){
  setDetailBusy(true);setMessage("");
  try{
   const res=await fetch("/api/challenge-listening?action=admin_detail&id="+encodeURIComponent(row.id),{credentials:"same-origin",cache:"no-store"});
   const obj=await res.json();if(!res.ok)throw new Error(obj.detail||"Could not open result.");
   setSelected({...obj.submission,student:obj.submission.student});
  }catch(e){setMessage(e instanceof Error?e.message:"Could not open result.")}finally{setDetailBusy(false)}
 }

 const visible=useMemo(()=>rows.filter(r=>{
  const text=(r.student?(r.student.first_name+" "+r.student.last_name+" "+r.student.username):"")+" "+r.score+" "+r.band;
  return text.toLowerCase().includes(query.trim().toLowerCase());
 }),[rows,query]);
 const selectedMeta=days.find(d=>d.day_number===selectedDay);
 const prompts=selected?promptMap(selected.content?.payload):new Map<number,string>();
 const avgScore=rows.length?Math.round(rows.reduce((a,r)=>a+Number(r.score||0),0)/rows.length):0;
 const avgBand=rows.length?(rows.reduce((a,r)=>a+Number(r.band||0),0)/rows.length).toFixed(1):"—";

 return <main className="la-shell">
  <header className="la-top"><AnimatedBackButton href="/admin" ariaLabel="Back to admin"/><div><b>ARK EDUCATION</b><span>LISTENING REPORTS</span></div><span>Day {String(selectedDay).padStart(2,"0")} · {selectedMeta?.title||"Listening"}</span></header>

  <section className="la-hero"><div><small>AUTOMATIC RESULTS</small><h1>Listening results</h1><p>Choose a challenge day, then open any student result to review all submitted answers against the official answer key.</p></div><div className="la-summary"><span><b>{rows.length}</b> Students</span><span><b>{avgScore}</b> Avg / 40</span><span><b>{avgBand}</b> Avg band</span></div></section>

  <section className="la-days" aria-label="Listening result days">{days.length?days.map(d=><button key={d.day_number} className={selectedDay===d.day_number?"active":""} onClick={()=>setSelectedDay(d.day_number)}><span>DAY {String(d.day_number).padStart(2,"0")}</span><b>{dayDate(d.day_number)}</b><small>{d.title} · {d.submission_count}</small></button>):<span className="la-no-days">No Listening submissions yet.</span>}</section>

  <section className="la-toolbar"><div><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search student, score or band…"/></div><button onClick={()=>load(selectedDay)}><RefreshCw size={14}/> Refresh</button></section>
  {message&&<p className="la-message">{message}</p>}

  <section className="la-layout">
   <div className="la-list">{loading?<div className="la-empty">Loading results…</div>:visible.length===0?<div className="la-empty"><Headphones size={25}/><b>No Day {selectedDay} Listening results yet.</b></div>:visible.map(row=><button key={row.id} className={"la-row "+(selected?.id===row.id?"selected":"")} onClick={()=>open(row)}><span className="la-avatar"><UserRound size={17}/></span><span className="la-person"><b>{row.student?row.student.first_name+" "+row.student.last_name:"Student"}</b><small>@{row.student?.username||"student"} · {when(row.submitted_at)}</small></span><span className="la-score"><b>{row.score}/40</b><small>Band {Number(row.band).toFixed(1)}</small></span></button>)}</div>

   <div className="la-detail">{detailBusy?<div className="la-empty">Opening result…</div>:!selected?<div className="la-empty"><Headphones size={28}/><b>Select a Listening result</b><p>The student's score, sections and all answers will appear here.</p></div>:<>
    <div className="la-detail-head"><div><small>DAY {String(selected.day_number).padStart(2,"0")} · LISTENING · {selected.content?.title||selectedMeta?.title||"TEST"}</small><h2>{selected.student?selected.student.first_name+" "+selected.student.last_name:"Student"}</h2><p>@{selected.student?.username||"student"} · {when(selected.submitted_at)} · {dur(selected.elapsed_seconds)}</p></div><div className="la-total"><span>SCORE</span><b>{selected.score}/40</b><small>Band {Number(selected.band).toFixed(1)}</small></div></div>
    <div className="la-parts">{(selected.part_scores||[]).map((score,i)=><div key={i}><span>Section {i+1}</span><b>{score}/10</b></div>)}</div>
    <div className="la-review">{selected.review.map(item=><article key={item.number} className={"la-answer "+item.status}><span className="la-num">{item.number}</span><div className="la-copy"><small>QUESTION {String(item.number).padStart(2,"0")}</small><p>{prompts.get(item.number)||"Listening answer"}</p><div><span>{item.submitted?"Your answer: "+item.submitted:"No answer"}</span><b>Correct: {item.correct.join(" / ")}{[21,22,23,24].includes(item.number)?" · either order":""}</b></div></div><span className="la-mark">{item.status==="correct"?<CheckCircle2 size={17}/>:<XCircle size={17}/>}</span></article>)}</div>
   </>}</div>
  </section>
 </main>;
}
