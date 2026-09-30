"use client";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {ArrowLeft,CheckCircle2,Clock3,Headphones,Search,UserRound,XCircle} from "lucide-react";
import "./listening-admin.css";

type Student={first_name:string;last_name:string;username:string}|null;
type Row={id:string;student_id:string;day_number:number;status:string;submitted_at:string;elapsed_seconds:number;part_scores:number[];score:number;band:number;student:Student};
type ReviewItem={number:number;submitted:string;correct:string[];status:"correct"|"wrong"|"empty"};
type Detail=Row&{answers:Record<string,string>;review:ReviewItem[];content:{title:string;payload:any}};

function dur(seconds:number){const s=Math.max(0,Math.floor(seconds||0));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")}
function when(value:string){return new Date(value).toLocaleString("en-GB",{timeZone:"Asia/Tashkent",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}
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
 const [rows,setRows]=useState<Row[]>([]),[loading,setLoading]=useState(true),[message,setMessage]=useState("");
 const [query,setQuery]=useState(""),[selected,setSelected]=useState<Detail|null>(null),[detailBusy,setDetailBusy]=useState(false);
 async function load(){
  setLoading(true);setMessage("");
  try{
   const res=await fetch("/api/challenge-listening?action=admin_list&day=1",{credentials:"same-origin",cache:"no-store"});
   const obj=await res.json();if(!res.ok)throw new Error(obj.detail||"Could not load Listening results.");
   setRows(obj.submissions||[]);
  }catch(e){setMessage(e instanceof Error?e.message:"Could not load Listening results.")}finally{setLoading(false)}
 }
 useEffect(()=>{void load()},[]);
 async function open(row:Row){
  setDetailBusy(true);setMessage("");
  try{
   const res=await fetch("/api/challenge-listening?action=admin_detail&day=1&id="+encodeURIComponent(row.id),{credentials:"same-origin",cache:"no-store"});
   const obj=await res.json();if(!res.ok)throw new Error(obj.detail||"Could not open result.");
   setSelected({...obj.submission,student:obj.submission.student});
  }catch(e){setMessage(e instanceof Error?e.message:"Could not open result.")}finally{setDetailBusy(false)}
 }
 const visible=useMemo(()=>rows.filter(r=>{
  const text=(r.student?(r.student.first_name+" "+r.student.last_name+" "+r.student.username):"")+" "+r.score+" "+r.band;
  return text.toLowerCase().includes(query.trim().toLowerCase());
 }),[rows,query]);
 const prompts=selected?promptMap(selected.content?.payload):new Map<number,string>();
 return <main className="la-shell">
  <header className="la-top"><Link href="/admin"><ArrowLeft size={17}/> Admin</Link><div><b>ARK EDUCATION</b><span>LISTENING RESULTS</span></div><span>Day 01 · Test 206</span></header>
  <section className="la-hero"><div><small>AUTOMATIC RESULTS</small><h1>Listening results</h1><p>Open a student result to review all 40 submitted answers against the official answer key.</p></div><div className="la-summary"><span><b>{rows.length}</b> Submissions</span><span><b>{rows.length?Math.round(rows.reduce((a,r)=>a+Number(r.score||0),0)/rows.length):0}</b> Avg / 40</span></div></section>
  <section className="la-toolbar"><div><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search student, score or band…"/></div><button onClick={load}>Refresh</button></section>
  {message&&<p className="la-message">{message}</p>}
  <section className="la-layout">
   <div className="la-list">{loading?<div className="la-empty">Loading results…</div>:visible.length===0?<div className="la-empty"><Headphones size={25}/><b>No Day 1 Listening results yet.</b></div>:visible.map(row=><button key={row.id} className={"la-row "+(selected?.id===row.id?"selected":"")} onClick={()=>open(row)}><span className="la-avatar"><UserRound size={18}/></span><span className="la-person"><b>{row.student?row.student.first_name+" "+row.student.last_name:"Student"}</b><small>@{row.student?.username||"student"} · {when(row.submitted_at)}</small></span><span className="la-score"><b>{row.score}/40</b><small>Band {Number(row.band).toFixed(1)}</small></span></button>)}</div>
   <div className="la-detail">{detailBusy?<div className="la-empty">Opening result…</div>:!selected?<div className="la-empty"><Headphones size={28}/><b>Select a Listening result</b><p>The student's answers and correct answers will appear here.</p></div>:<>
    <div className="la-detail-head"><div><small>DAY 01 · LISTENING</small><h2>{selected.student?selected.student.first_name+" "+selected.student.last_name:"Student"}</h2><p>@{selected.student?.username||"student"} · {when(selected.submitted_at)} · {dur(selected.elapsed_seconds)}</p></div><div className="la-total"><span>SCORE</span><b>{selected.score}/40</b><small>Band {Number(selected.band).toFixed(1)}</small></div></div>
    <div className="la-parts">{(selected.part_scores||[]).map((s,i)=><div key={i}><span>Section {i+1}</span><b>{s}/10</b></div>)}</div>
    <div className="la-review">{selected.review.map(item=><article key={item.number} className={"la-answer "+item.status}><span className="la-num">{item.number}</span><div className="la-copy"><small>QUESTION {String(item.number).padStart(2,"0")}</small><p>{prompts.get(item.number)||"Listening answer"}</p><div><span>{item.submitted?"Your answer: "+item.submitted:"No answer"}</span><b>Correct: {item.correct.join(" / ")}{[21,22,23,24].includes(item.number)?" · either order":""}</b></div></div><span className="la-mark">{item.status==="correct"?<CheckCircle2 size={17}/>:<XCircle size={17}/>}</span></article>)}</div>
   </>}</div>
  </section>
 </main>;
}
