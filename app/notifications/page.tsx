"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {ArrowLeft,Bell,CheckCircle2,Clock3,MessageSquareText,Mic,PenLine} from "lucide-react";
import StudentPresence from "../components/student-presence";
import "./notifications.css";
type Note={id:string;day_number:number;payload?:any;band:number|null;review_feedback?:string|null;feedback?:string|null;reviewed_at?:string|null;submitted_at:string;review_status:string;module:"writing"|"speaking";audio_expired?:boolean};
export default function Notifications(){
 const [items,setItems]=useState<Note[]>([]),[loading,setLoading]=useState(true),[message,setMessage]=useState("");
 useEffect(()=>{let live=true;(async()=>{try{
   const [wr,sr]=await Promise.all([
    fetch("/api/challenge-writing?action=notifications",{credentials:"same-origin",cache:"no-store"}),
    fetch("/api/challenge-speaking?action=notifications",{credentials:"same-origin",cache:"no-store"})
   ]);
   const [w,s]=await Promise.all([wr.json(),sr.json()]);
   if(!wr.ok&&!sr.ok){if(live)setMessage(w.detail||s.detail||"Could not load notifications.");return}
   const writing:Note[]=(wr.ok?w.notifications||[]:[]).map((n:any)=>({...n,module:"writing" as const}));
   const speaking:Note[]=(sr.ok?s.notifications||[]:[]).map((n:any)=>({...n,module:"speaking" as const}));
   if(live)setItems([...writing,...speaking].sort((a,b)=>Date.parse(b.reviewed_at||b.submitted_at)-Date.parse(a.reviewed_at||a.submitted_at)));
  }catch{if(live)setMessage("Could not contact the server.")}finally{if(live)setLoading(false)}})();return()=>{live=false}},[]);
 return <main className="nt-shell"><StudentPresence area="Notifications"/><header className="nt-top"><Link href="/dashboard"><ArrowLeft size={17}/> Dashboard</Link><b>ARK EDUCATION</b><span><Bell size={17}/> Notifications</span></header><section className="nt-head"><small>STUDENT UPDATES</small><h1>Notifications</h1><p>Your reviewed Writing and Speaking results appear here as soon as your teacher saves them.</p></section><section className="nt-list">{loading?<div className="nt-empty">Loading…</div>:message?<div className="nt-empty">{message}</div>:items.length===0?<div className="nt-empty"><Bell size={28}/><b>No reviewed results yet.</b><p>Teacher-reviewed Writing and Speaking results will appear here automatically.</p></div>:items.map(n=>{const speaking=n.module==="speaking";const fb=speaking?n.feedback:n.review_feedback;return <article className={"nt-card "+(speaking?"speaking":"")} key={n.module+"-"+n.id}><span className="nt-icon">{speaking?<Mic size={20}/>:<PenLine size={20}/>}</span><div className="nt-copy"><div className="nt-row"><small>{speaking?"SPEAKING":"WRITING"} RESULT · DAY {String(n.day_number).padStart(2,"0")}</small><span><Clock3 size={12}/>{n.reviewed_at?new Date(n.reviewed_at).toLocaleString("en-GB",{timeZone:"Asia/Tashkent",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):"Reviewed"}</span></div><h2>{speaking?"Full Speaking reviewed":String(n.payload?.task_type||"Writing").toUpperCase()+" checked"}</h2><p>Your {speaking?"Speaking attempt":"Writing response"} has been reviewed.</p>{fb&&<div className="nt-feedback"><MessageSquareText size={15}/><span>{fb}</span></div>}{speaking&&n.audio_expired&&<p className="nt-expired">Audio retention period ended.</p>}<Link href={"/day/"+n.day_number+"/"+(speaking?"speaking":"writing")}>View result <CheckCircle2 size={14}/></Link></div><div className="nt-band"><small>BAND</small><b>{Number(n.band).toFixed(1)}</b></div></article>})}</section></main>;
}