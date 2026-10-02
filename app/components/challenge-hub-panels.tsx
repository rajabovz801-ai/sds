"use client";

import {useEffect,useMemo,useState} from "react";
import {Check,Clock3,Coins,Crown,LogOut,Save,Star,Target,Trophy,X} from "lucide-react";

type Student={
 id:string;first_name:string;last_name:string;username:string;target_band:number;
 date_of_birth?:string|null;gender?:string|null;english_level?:string|null;exam_date?:string|null;
};
type Completed={day_number:number;module:string;score:number|null;band:number|null;review_status:string};
export type HubStats={
 student:Student;today_seconds:number;active_seconds:number;coins:number;
 by_module:Record<string,number>;completed:Completed[];required_by_day:Record<string,string[]>;preview?:boolean;
};
type RewardEvent={id:string;day_number:number;module:string;kind:string;amount:number;created_at:string};
type RewardCenter={balance:number;claimed_today:boolean;today_amount:number;streak_day:number;next_amount:number;history:RewardEvent[];preview?:boolean};
type LeaderStatus="online"|"idle"|"offline";
type LeaderPeriod="week"|"30d"|"all";
type LeaderRow={student_id:string;full_name:string;username:string;coins:number;active_seconds:number;status:LeaderStatus;rank:number};

const fmt=(s:number)=>{const n=Math.max(0,Math.floor(Number(s)||0));const h=Math.floor(n/3600),m=Math.floor((n%3600)/60);return h?h+"h "+String(m).padStart(2,"0")+"m":m+"m"};
const moduleLabel=(m:string)=>m==="daily"?"Daily reward":m==="profile"?"Profile completion":m.split("_").map(x=>x[0]?.toUpperCase()+x.slice(1)).join(" ");

export function RewardModal({open,onClose,onBalance}:{open:boolean;onClose:()=>void;onBalance:(n:number)=>void}){
 const [data,setData]=useState<RewardCenter|null>(null),[loading,setLoading]=useState(false),[message,setMessage]=useState("");
 async function load(){setLoading(true);setMessage("");try{const r=await fetch("/api/ark60?action=reward_center",{credentials:"same-origin",cache:"no-store"});const j=await r.json();if(!r.ok)throw new Error(j.detail||"Could not load rewards.");setData(j);onBalance(Number(j.balance)||0)}catch(e){setMessage(e instanceof Error?e.message:"Could not load rewards.")}finally{setLoading(false)}}
 useEffect(()=>{if(open)void load()},[open]);
 async function claim(){
  setLoading(true);setMessage("");
  try{const r=await fetch("/api/ark60",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"claim_daily_reward"})});const j=await r.json();if(!r.ok)throw new Error(j.detail||"Reward could not be claimed.");if(j.preview){setMessage("Preview: +1 daily reward simulated. Real student balances are unchanged.");setData(d=>d?{...d,claimed_today:true,today_amount:1,streak_day:1,next_amount:2}:d)}else{onBalance(Number(j.balance)||0);await load()}}catch(e){setMessage(e instanceof Error?e.message:"Reward could not be claimed.")}finally{setLoading(false)}
 }
 if(!open)return null;
 const active=data?.claimed_today?Math.max(1,data.streak_day):Math.max(1,Math.min(7,data?.next_amount||1));
 return <div className="reward-backdrop" role="dialog" aria-modal="true" aria-label="Daily reward">
  <section className="reward-modal">
   <button className="reward-close" onClick={onClose} aria-label="Close reward"><X size={20}/></button>
   <div className="reward-coin"><Star size={22} fill="currentColor"/></div>
   <h2>Daily reward</h2><p>Keep your streak alive. Return each day to unlock a bigger reward.</p>
   <div className="reward-week">{Array.from({length:7},(_,i)=>i+1).map(n=><div key={n} className={"reward-day "+(n===active?"active ":"")+(data?.claimed_today&&n===data.streak_day?"claimed":"")}><small>{n===active&&!data?.claimed_today?"TODAY":n===Math.min(7,active+1)&&!data?.claimed_today?"TOMORROW":"DAY "+n}</small><span className="reward-mini-coin"><Star size={11} fill="currentColor"/></span><b>+{n}</b>{data?.claimed_today&&n===data.streak_day&&<Check size={13}/>}</div>)}</div>
   <button className="reward-claim" disabled={loading||!!data?.claimed_today} onClick={claim}>{data?.claimed_today?"Today's reward claimed":loading?"Loading…":"Claim +"+(data?.next_amount||1)+" coin"+((data?.next_amount||1)>1?"s":"")}</button>
   {message&&<div className="reward-message">{message}</div>}
   <div className="reward-earn"><span><Star size={15} fill="currentColor"/></span><div><b>Earn more coins</b><small>Finish any published task to earn +1 coin.</small></div></div>
   <div className="reward-history-head"><span>Balance: <b>{data?.balance??0}</b> <Coins size={13}/></span><b>Coin history</b></div>
   <div className="reward-history">{loading&&!data?<p>Loading rewards…</p>:(data?.history||[]).length?(data?.history||[]).slice(0,12).map(e=><div key={e.id}><span><b>{moduleLabel(e.module)}</b><small>{e.kind==="completion"?"Day "+e.day_number+" task completed":e.kind.replaceAll("_"," ")}</small></span><strong>+{e.amount}</strong></div>):<p>Complete a task to start your coin history.</p>}</div>
  </section>
 </div>;
}

export function LeaderboardPanel({studentId}:{studentId:string}){
 const [rows,setRows]=useState<LeaderRow[]>([]),[period,setPeriod]=useState<LeaderPeriod>("week"),[loading,setLoading]=useState(true),[message,setMessage]=useState("");

 useEffect(()=>{
  let live=true;
  setRows([]);setMessage("");
  async function load(silent=false){
   if(!silent)setLoading(true);
   try{
    const r=await fetch("/api/ark60?action=leaderboard&period="+period,{credentials:"same-origin",cache:"no-store"});
    const j=await r.json();
    if(!r.ok)throw new Error(j.detail||"Could not load leaderboard.");
    if(live){setRows(j.leaderboard||[]);setMessage("")}
   }catch(e){
    if(live)setMessage(e instanceof Error?e.message:"Could not load leaderboard.");
   }finally{
    if(live&&!silent)setLoading(false);
   }
  }
  void load();
  const refresh=()=>{if(document.visibilityState==="visible")void load(true)};
  const id=window.setInterval(refresh,60000);
  document.addEventListener("visibilitychange",refresh);
  return()=>{live=false;window.clearInterval(id);document.removeEventListener("visibilitychange",refresh)};
 },[period]);

 const sorted=useMemo(()=>rows.slice().sort((a,b)=>b.coins-a.coins||b.active_seconds-a.active_seconds||a.full_name.localeCompare(b.full_name)),[rows]);
 const top=sorted.slice(0,3);
 const table=sorted.slice(3,10);
 const current=sorted.find(row=>row.student_id===studentId);
 const initials=(row:LeaderRow)=>row.full_name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()).join("")||"ST";
 const statusLabel=(status:LeaderStatus)=>status==="online"?"Online":status==="idle"?"Idle":"Offline";
 const periodLabel=period==="week"?"This week":period==="30d"?"Last 30 days":"All time";

 return <section className="hub-panel leaderboard-v2">
  <div className="hub-heading lb-heading"><div><small>LIVE COURSE DATA</small><h1>Leaderboard</h1><p>Rankings are based on earned coins and active study time.</p></div><Trophy size={34}/></div>

  <div className="lb-board">
   {sorted.some(row=>row.status==="online")&&<div className="lb-live-strip"><span><i/>{sorted.filter(row=>row.status==="online").length} student{sorted.filter(row=>row.status==="online").length===1?"":"s"} online now</span><div>{sorted.filter(row=>row.status==="online").slice(0,3).map(row=><b key={row.student_id}>{row.full_name}</b>)}</div></div>}
   <div className="lb-period-tabs" aria-label="Leaderboard period">
    <button className={period==="week"?"active":""} onClick={()=>setPeriod("week")}>This week</button>
    <button className={period==="30d"?"active":""} onClick={()=>setPeriod("30d")}>Last 30 days</button>
    <button className={period==="all"?"active":""} onClick={()=>setPeriod("all")}>All time</button>
   </div>

   {message?<div className="hub-error">{message}</div>:loading?<div className="hub-loading">Loading real rankings…</div>:sorted.length?<>
   <div className={"lb-podium lb-podium-"+Math.min(3,top.length)} aria-label={periodLabel+" top students"}>
    {top.map(row=><article className={"lb-podium-card rank-"+row.rank+" "+(row.student_id===studentId?"me":"")} key={row.student_id}>
     {row.rank===1&&<Crown className="lb-crown" size={28}/>}
     <div className="lb-avatar">{initials(row)}</div>
     <span className="lb-rank-badge">{row.rank}</span>
     <h2>{row.full_name}</h2>
     <p>@{row.username}{row.student_id===studentId?" · You":""}</p>
     <div className="lb-podium-metrics"><span><Coins size={15}/><b>{row.coins}</b><small>Coins</small></span><span><Clock3 size={15}/><b>{fmt(row.active_seconds)}</b><small>Study time</small></span></div>
     <div className={"lb-status "+row.status}><i/>{statusLabel(row.status)}</div>
    </article>)}
   </div>

   {table.length>0&&<div className="lb-table-wrap">
    <div className="lb-table-head"><span>#</span><span>Student</span><span>Coins</span><span>Study time</span><span>Status</span></div>
    {table.map(row=><div className={"lb-table-row "+(row.student_id===studentId?"me":"")} key={row.student_id}>
     <b className="lb-table-rank">{row.rank}</b>
     <div className="lb-table-person"><span className="lb-mini-avatar">{initials(row)}</span><div><b>{row.full_name}</b><small>@{row.username}{row.student_id===studentId?" · You":""}</small></div></div>
     <strong><Coins size={14}/>{row.coins}</strong>
     <strong><Clock3 size={14}/>{fmt(row.active_seconds)}</strong>
     <span className={"lb-status "+row.status}><i/>{statusLabel(row.status)}</span>
    </div>)}
   </div>}

   {current&&current.rank>10&&<div className="lb-current-row"><span>Your rank</span><b>#{current.rank}</b><div><strong>{current.full_name}</strong><small>@{current.username}</small></div><span><Coins size={14}/>{current.coins}</span><span><Clock3 size={14}/>{fmt(current.active_seconds)}</span><span className={"lb-status "+current.status}><i/>{statusLabel(current.status)}</span></div>}
  </>:<div className="hub-empty"><Trophy size={28}/><b>No leaderboard activity in this period yet.</b><p>Earn coins or record active study time to appear here.</p></div>}
  </div>
 </section>;
}

export function ProgressPanel({stats,completedDays}:{stats:HubStats;completedDays:number}){
 const modules=["reading","article","vocabulary","writing","listening","speaking"];
 const total=stats.completed.length,required=Object.values(stats.required_by_day||{}).reduce((n,x)=>n+x.length,0);
 return <section className="hub-panel progress-v2"><div className="hub-heading"><div><small>REAL ACTIVITY</small><h1>Your progress</h1><p>Only saved challenge activity is counted here.</p></div><Target size={34}/></div>
  <div className="hub-kpis"><article><span>Completed days</span><b>{completedDays}<small>/60</small></b></article><article><span>Completed tasks</span><b>{total}<small>/{required||"—"}</small></b></article><article><span>Total study time</span><b>{fmt(stats.active_seconds)}</b></article><article><span>Coins earned</span><b>{stats.coins}</b></article></div>
  <div className="module-progress-list">{modules.map(m=>{const count=stats.completed.filter(x=>x.module===m).length;const seconds=Number(stats.by_module?.[m]||0);return <div key={m}><span className="module-progress-name">{moduleLabel(m)}</span><div className="module-progress-bar"><i style={{width:Math.min(100,Math.max(count?8:0,(seconds/3600)*12))+"%"}}/></div><b>{count} tasks · {fmt(seconds)}</b></div>})}</div>
 </section>;
}

export function ProfilePanel({stats,onStudent,onCoins,onLogout}:{stats:HubStats;onStudent:(s:Student)=>void;onCoins:(n:number)=>void;onLogout:()=>void}){
 const s=stats.student;
 const [form,setForm]=useState({first_name:s.first_name||"",last_name:s.last_name||"",date_of_birth:s.date_of_birth||"",gender:s.gender||"",english_level:s.english_level||"",target_band:String(s.target_band||""),exam_date:s.exam_date||""});
 const [saving,setSaving]=useState(false),[message,setMessage]=useState("");
 async function save(){
  setSaving(true);setMessage("");
  try{const r=await fetch("/api/ark60",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"update_profile",...form,target_band:Number(form.target_band)})});const j=await r.json();if(!r.ok)throw new Error(j.detail||"Could not save profile.");onStudent(j.student);if(j.profile_bonus_awarded){onCoins(stats.coins+1);setMessage("Changes saved · +1 coin earned.")}else setMessage("Changes saved.")}catch(e){setMessage(e instanceof Error?e.message:"Could not save profile.")}finally{setSaving(false)}
 }
 async function logoutAll(){if(!window.confirm("Sign out this account on every device?"))return;try{await fetch("/api/ark60",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"logout_all"})})}finally{onLogout()}}
 const initials=(s.first_name[0]+s.last_name[0]).toUpperCase();
 return <section className="profile-page"><div className="profile-hero-card"><span className="profile-big-avatar">{initials}</span><div className="profile-main-copy"><h1>{s.first_name} {s.last_name}</h1><p>@{s.username} <i>Student</i></p></div><div className="profile-summary"><div><span>TARGET BAND</span><b>{Number(s.target_band).toFixed(1)}</b></div><div><span>COINS EARNED</span><b>{stats.coins}</b></div><div><span>EXAM DATE</span><b>{s.exam_date||"Not set"}</b></div></div></div>
  <div className="profile-bonus-note"><Star size={14} fill="currentColor"/> Complete all profile details once to unlock a +1 coin profile bonus.</div>
  <div className="profile-section"><h3>PERSONAL DETAILS</h3><div className="profile-fields"><label><span>Name</span><div className="profile-name-grid"><div><small>First name</small><input value={form.first_name} onChange={e=>setForm({...form,first_name:e.target.value})} placeholder="First name"/></div><div><small>Last name</small><input value={form.last_name} onChange={e=>setForm({...form,last_name:e.target.value})} placeholder="Last name"/></div></div></label><label><span>Date of birth</span><input type="date" lang="en-GB" value={form.date_of_birth} onChange={e=>setForm({...form,date_of_birth:e.target.value})}/></label><label><span>Gender</span><select value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}><option value="">Not set</option><option value="male">Male</option><option value="female">Female</option><option value="prefer_not_to_say">Prefer not to say</option></select></label></div></div>
  <div className="profile-section"><h3>IELTS GOALS</h3><div className="profile-fields"><label><span>English level</span><select value={form.english_level} onChange={e=>setForm({...form,english_level:e.target.value})}><option value="">Not set</option>{["A1","A2","B1","B2","C1","C2"].map(x=><option key={x}>{x}</option>)}</select></label><label><span>Target band</span><select value={form.target_band} onChange={e=>setForm({...form,target_band:e.target.value})}>{[6,6.5,7,7.5,8,8.5,9].map(x=><option key={x} value={x}>{x.toFixed(1)}</option>)}</select></label><label><span>Exam date</span><input type="date" value={form.exam_date} onChange={e=>setForm({...form,exam_date:e.target.value})}/></label></div></div>
  <div className="profile-actions"><button onClick={save} disabled={saving}><Save size={15}/>{saving?"Saving…":"Save changes"}</button>{message&&<span>{message}</span>}</div>
  <div className="profile-account-card"><div><b>Account session</b><small>Manage where this student account is signed in.</small></div><div className="profile-signout"><button onClick={onLogout}><LogOut size={14}/> Sign out</button><button className="danger" onClick={logoutAll}>Sign out on all devices</button></div></div>
 </section>;
}
