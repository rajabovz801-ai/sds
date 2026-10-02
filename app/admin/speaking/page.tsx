"use client";
import {useEffect,useMemo,useState} from "react";
import AnimatedBackButton from "../../components/animated-back-button";
import {CheckCircle2,Clock3,Headphones,Mic,Play,RefreshCcw,Search,Send,UserRound} from "lucide-react";
import "./speaking-admin.css";

type Student={first_name:string;last_name:string;username:string}|null;
type Row={id:string;student_id:string;day_number:number;status:string;submitted_at:string;expires_at:string|null;review_status:string;band:number|null;feedback?:string|null;reviewed_at?:string|null;audio_expired:boolean;answer_count:number;total_audio_seconds:number;student:Student};
type Answer={id:string;part_number:number;question_key:string;question_text:string;duration_seconds:number;audio_url:string};
type Detail={id:string;day_number:number;submitted_at:string;expires_at:string|null;review_status:string;band:number|null;feedback?:string|null;reviewed_at?:string|null;audio_expired:boolean;answer_count:number;total_audio_seconds:number;student:Student;content:any;answers:Answer[]};

function dur(seconds:number){const s=Math.max(0,Math.floor(seconds||0));return Math.floor(s/60)+":"+String(s%60).padStart(2,"0")}
function when(value:string|null){if(!value)return"—";return new Date(value).toLocaleString("en-GB",{timeZone:"Asia/Tashkent",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}
function dayDate(day:number){return new Date(Date.UTC(2026,9,day)).toLocaleDateString("en-GB",{timeZone:"UTC",day:"numeric",month:"short"})}
function expiresIn(value:string|null){if(!value)return"72h window";const ms=Date.parse(value)-Date.now();if(ms<=0)return"Expired";const hours=Math.floor(ms/3600000);const days=Math.floor(hours/24);return days>0?"Expires in "+days+"d "+(hours%24)+"h":"Expires in "+Math.max(0,hours)+"h"}

export default function AdminSpeaking(){
 const [rows,setRows]=useState<Row[]>([]),[loading,setLoading]=useState(true),[message,setMessage]=useState("");
 const [query,setQuery]=useState(""),[filter,setFilter]=useState<"pending"|"reviewed"|"all">("pending"),[day,setDay]=useState<number|0>(0);
 const [selected,setSelected]=useState<Detail|null>(null),[detailBusy,setDetailBusy]=useState(false);
 const [bands,setBands]=useState<Record<string,string>>({}),[feedback,setFeedback]=useState<Record<string,string>>({}),[saving,setSaving]=useState("");
 const [playingAll,setPlayingAll]=useState(false);

 async function load(){
  setLoading(true);setMessage("");
  try{
   const res=await fetch("/api/challenge-speaking?action=admin_list",{credentials:"same-origin",cache:"no-store"});
   const obj=await res.json();if(!res.ok)throw new Error(obj.detail||"Could not load Speaking submissions.");
   const next:Row[]=obj.submissions||[];setRows(next);
   const b:Record<string,string>={},f:Record<string,string>={};
   next.forEach(row=>{if(row.band!==null)b[row.id]=String(row.band);if(row.feedback)f[row.id]=row.feedback||""});
   setBands(b);setFeedback(f);
   const requested=new URLSearchParams(window.location.search).get("id");
   const target=requested?next.find(r=>r.id===requested):next[0];
   if(target)void open(target);else setSelected(null);
  }catch(e){setMessage(e instanceof Error?e.message:"Could not contact the server.")}finally{setLoading(false)}
 }
 useEffect(()=>{void load()},[]);

 const days=useMemo(()=>[...new Set(rows.map(r=>r.day_number))].sort((a,b)=>a-b),[rows]);
 const visible=useMemo(()=>rows.filter(r=>filter==="all"||r.review_status===filter).filter(r=>!day||r.day_number===day).filter(r=>{
  const hay=(r.student?(r.student.first_name+" "+r.student.last_name+" "+r.student.username):"")+" day "+r.day_number;
  return hay.toLowerCase().includes(query.trim().toLowerCase());
 }),[rows,filter,query,day]);
 const pending=rows.filter(r=>r.review_status==="pending").length;

 async function open(row:Row){
  setDetailBusy(true);setMessage("");
  try{
   const res=await fetch("/api/challenge-speaking?action=admin_detail&id="+encodeURIComponent(row.id),{credentials:"same-origin",cache:"no-store"});
   const obj=await res.json();if(!res.ok)throw new Error(obj.detail||"Could not load Speaking submission.");
   setSelected(obj.submission);
  }catch(e){setMessage(e instanceof Error?e.message:"Could not load submission.")}finally{setDetailBusy(false)}
 }

 async function grade(row:Detail){
  const band=Number(bands[row.id]);if(!Number.isFinite(band)){setMessage("Select a band score first.");return}
  setSaving(row.id);setMessage("");
  try{
   const res=await fetch("/api/challenge-speaking",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"grade",id:row.id,band,feedback:feedback[row.id]||""})});
   const obj=await res.json();if(!res.ok)throw new Error(obj.detail||"Could not save Speaking review.");
   await load();
  }catch(e){setMessage(e instanceof Error?e.message:"Could not save review.")}finally{setSaving("")}
 }

 async function playAll(){
  if(!selected||selected.audio_expired||!selected.answers.length)return;
  setPlayingAll(true);
  for(const answer of selected.answers){
   if(!answer.audio_url)continue;
   await new Promise<void>(resolve=>{const audio=new Audio(answer.audio_url);audio.onended=()=>resolve();audio.onerror=()=>resolve();audio.play().catch(()=>resolve())});
  }
  setPlayingAll(false);
 }

 const groups=selected?[
  {part:1,title:selected.content?.payload?.part1?.topic||"Part 1",answers:selected.answers.filter(a=>a.part_number===1)},
  {part:2,title:selected.content?.payload?.part2?.topic||"Part 2",answers:selected.answers.filter(a=>a.part_number===2)},
  {part:3,title:selected.content?.payload?.part3?.topic||"Part 3",answers:selected.answers.filter(a=>a.part_number===3)}
 ]:[];

 return <main className="sa-shell">
  <header className="sa-top"><AnimatedBackButton href="/admin" ariaLabel="Back to admin"/><div><b>ARK EDUCATION</b><span>SPEAKING INBOX</span></div><button onClick={load}><RefreshCcw size={15}/> Refresh</button></header>
  <section className="sa-hero"><div><small>72-HOUR AUDIO INBOX</small><h1>Speaking submissions</h1><p>Review recordings before their 72-hour audio retention window ends. Band and feedback history remain after audio expiry.</p></div><div className="sa-kpis"><span><b>{pending}</b> Pending</span><span><b>{rows.length-pending}</b> Reviewed</span><span><b>{rows.length}</b> In inbox</span></div></section>

  <section className="sa-days"><button className={day===0?"active":""} onClick={()=>setDay(0)}><span>ALL</span><b>{rows.length}</b><small>current inbox</small></button>{days.map(d=><button key={d} className={day===d?"active":""} onClick={()=>setDay(d)}><span>DAY {String(d).padStart(2,"0")}</span><b>{dayDate(d)}</b><small>{rows.filter(r=>r.day_number===d).length} submissions</small></button>)}</section>

  <section className="sa-toolbar"><div className="sa-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search student or day…"/></div><div className="sa-tabs">{(["pending","reviewed","all"] as const).map(x=><button key={x} className={filter===x?"active":""} onClick={()=>setFilter(x)}>{x}</button>)}</div></section>
  {message&&<p className="sa-message">{message}</p>}

  <section className="sa-layout">
   <div className="sa-list">{loading?<div className="sa-empty">Loading submissions…</div>:visible.length===0?<div className="sa-empty"><Mic size={26}/><b>No Speaking submissions here.</b></div>:visible.map(row=>{const checked=row.review_status==="reviewed";return <button className={"sa-row "+(selected?.id===row.id?"selected ":"")+(checked?"reviewed":"")} key={row.id} onClick={()=>open(row)}><span className="sa-avatar"><UserRound size={17}/></span><span className="sa-person"><b>{row.student?row.student.first_name+" "+row.student.last_name:"Student"}</b><small>@{row.student?.username||"student"} · Day {String(row.day_number).padStart(2,"0")}</small><em>{row.answer_count} answers · {dur(row.total_audio_seconds)} audio</em></span><span className={"sa-status "+(checked?"done":"wait")}>{checked?<CheckCircle2 size={13}/>:<Clock3 size={13}/>} {checked?"Reviewed":"New"}</span><span className="sa-expiry">{expiresIn(row.expires_at)}</span></button>})}</div>

   <div className="sa-detail">{detailBusy?<div className="sa-empty">Opening submission…</div>:!selected?<div className="sa-empty"><Headphones size={28}/><b>Select a Speaking submission</b><p>Questions and recordings will appear here.</p></div>:<>
    <div className="sa-detail-head"><div><small>DAY {String(selected.day_number).padStart(2,"0")} · FULL SPEAKING</small><h2>{selected.student?selected.student.first_name+" "+selected.student.last_name:"Student"}</h2><p>@{selected.student?.username||"student"} · Submitted {when(selected.submitted_at)} · {expiresIn(selected.expires_at)}{selected.expires_at?" · available until "+when(selected.expires_at):""}</p></div>{!selected.audio_expired&&selected.answers.length>0&&<button disabled={playingAll} onClick={playAll}><Play size={14}/>{playingAll?"Playing…":"Play all answers"}</button>}</div>
    {selected.audio_expired?<div className="sa-expired-box"><Clock3 size={20}/><div><b>Audio expired</b><p>The 72-hour recording retention period ended. Review summary and saved result remain available.</p></div></div>:<div className="sa-parts">{groups.map(group=><section key={group.part}><header><span>PART {group.part}</span><b>{group.title}</b></header>{group.part===2&&<div className="sa-cue"><strong>{selected.content?.payload?.part2?.prompt}</strong><small>You should say:</small><ul>{(selected.content?.payload?.part2?.bullets||[]).map((x:string)=><li key={x}>{x}</li>)}</ul></div>}{group.answers.map((answer,i)=><article className="sa-answer" key={answer.id}><div><small>{group.part===2?"PART 2 ANSWER":"QUESTION "+String(i+1).padStart(2,"0")}</small><p>{group.part===2?selected.content?.payload?.part2?.prompt:answer.question_text}</p></div><div className="sa-player"><audio controls preload="none" src={answer.audio_url}/><span>{dur(answer.duration_seconds)}</span></div></article>)}</section>)}</div>}
    <div className="sa-review"><label><span>Overall Speaking Band</span><select value={bands[selected.id]||""} onChange={e=>setBands(v=>({...v,[selected.id]:e.target.value}))}><option value="">Select</option>{Array.from({length:19},(_,i)=>i/2).map(v=><option key={v} value={v}>{v.toFixed(1)}</option>)}</select></label><label className="feedback"><span>Teacher feedback <i>optional</i></span><textarea value={feedback[selected.id]||""} onChange={e=>setFeedback(v=>({...v,[selected.id]:e.target.value}))} placeholder="Short feedback for the student…"/></label><button disabled={saving===selected.id||!bands[selected.id]} onClick={()=>grade(selected)}>{saving===selected.id?"Saving…":selected.review_status==="reviewed"?"Update review":"Save review"}<Send size={14}/></button></div>
   </>}</div>
  </section>
 </main>;
}
