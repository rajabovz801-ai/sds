"use client";

import {useEffect,useMemo,useState} from "react";
import {Award,Check,Clock3,Coins,Medal,Save,ShieldCheck,Target,Trophy,UserRound,X,type LucideIcon} from "lucide-react";

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
type LeaderRow={student_id:string;full_name:string;username:string;coins:number;active_seconds:number;completed_tasks:number;rank?:number};

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
   <div className="reward-coin"><Coins size={28}/></div>
   <h2>Daily reward</h2><p>Come back every day — each consecutive day gives more coins.</p>
   <div className="reward-week">{Array.from({length:7},(_,i)=>i+1).map(n=><div key={n} className={"reward-day "+(n===active?"active ":"")+(data?.claimed_today&&n===data.streak_day?"claimed":"")}><small>{n===active&&!data?.claimed_today?"TODAY":"DAY "+n}</small><Coins size={19}/><b>+{n}</b>{data?.claimed_today&&n===data.streak_day&&<Check size={13}/>}</div>)}</div>
   <button className="reward-claim" disabled={loading||!!data?.claimed_today} onClick={claim}>{data?.claimed_today?"Today's reward claimed":loading?"Loading…":"Claim +"+(data?.next_amount||1)+" coin"+((data?.next_amount||1)>1?"s":"")}</button>
   {message&&<div className="reward-message">{message}</div>}
   <div className="reward-earn"><span><Coins size={18}/></span><div><b>Earn more</b><small>Complete any published module · +1 coin</small></div></div>
   <div className="reward-history-head"><span>Balance: <b>{data?.balance??0}</b> <Coins size={13}/></span><b>Coin history</b></div>
   <div className="reward-history">{loading&&!data?<p>Loading rewards…</p>:(data?.history||[]).length?(data?.history||[]).slice(0,12).map(e=><div key={e.id}><span><b>{moduleLabel(e.module)}</b><small>{e.kind==="completion"?"Day "+e.day_number+" task completed":e.kind.replaceAll("_"," ")}</small></span><strong>+{e.amount}</strong></div>):<p>No coin activity yet. Complete your first task tomorrow.</p>}</div>
  </section>
 </div>;
}

export function LeaderboardPanel({studentId}:{studentId:string}){
 const [rows,setRows]=useState<LeaderRow[]>([]),[metric,setMetric]=useState<"coins"|"time"|"tasks">("coins"),[loading,setLoading]=useState(true),[message,setMessage]=useState("");
 useEffect(()=>{let live=true;(async()=>{try{const r=await fetch("/api/ark60?action=leaderboard",{credentials:"same-origin",cache:"no-store"});const j=await r.json();if(!r.ok)throw new Error(j.detail||"Could not load leaderboard.");if(live)setRows(j.leaderboard||[])}catch(e){if(live)setMessage(e instanceof Error?e.message:"Could not load leaderboard.")}finally{if(live)setLoading(false)}})();return()=>{live=false}},[]);
 const sorted=useMemo(()=>rows.slice().sort((a,b)=>metric==="time"?b.active_seconds-a.active_seconds||b.coins-a.coins:metric==="tasks"?b.completed_tasks-a.completed_tasks||b.coins-a.coins:b.coins-a.coins||b.active_seconds-a.active_seconds),[rows,metric]);
 return <section className="hub-panel"><div className="hub-heading"><div><small>LIVE COURSE DATA</small><h1>Leaderboard</h1><p>Rankings are calculated from real earned coins, active study time and completed challenge tasks.</p></div><Trophy size={34}/></div>
  <div className="leader-tabs"><button className={metric==="coins"?"active":""} onClick={()=>setMetric("coins")}><Coins size={15}/> Coins</button><button className={metric==="time"?"active":""} onClick={()=>setMetric("time")}><Clock3 size={15}/> Study time</button><button className={metric==="tasks"?"active":""} onClick={()=>setMetric("tasks")}><Check size={15}/> Tasks</button></div>
  {message?<div className="hub-error">{message}</div>:loading?<div className="hub-loading">Loading real rankings…</div>:sorted.length?<div className="leader-list">{sorted.map((r,i)=><div className={"leader-row "+(r.student_id===studentId?"me":"")} key={r.student_id}><span className={"leader-rank rank-"+(i+1)}>{i<3?<Medal size={18}/>:i+1}</span><div className="leader-person"><b>{r.full_name}</b><small>@{r.username}{r.student_id===studentId?" · You":""}</small></div><div><span>COINS</span><b><Coins size={14}/>{r.coins}</b></div><div><span>STUDY</span><b><Clock3 size={14}/>{fmt(r.active_seconds)}</b></div><div><span>TASKS</span><b><Check size={14}/>{r.completed_tasks}</b></div></div>)}</div>:<div className="hub-empty"><Trophy size={28}/><b>Leaderboard starts with real student activity</b><p>No non-preview student has earned a ranked result yet.</p></div>}
 </section>;
}

export function ProgressPanel({stats,completedDays}:{stats:HubStats;completedDays:number}){
 const modules=["reading","article","vocabulary","writing","listening","speaking"];
 const total=stats.completed.length,required=Object.values(stats.required_by_day||{}).reduce((n,x)=>n+x.length,0);
 return <section className="hub-panel"><div className="hub-heading"><div><small>REAL ACTIVITY</small><h1>Your progress</h1><p>Only saved challenge activity is counted here.</p></div><Target size={34}/></div>
  <div className="hub-kpis"><article><span>Completed days</span><b>{completedDays}<small>/60</small></b></article><article><span>Completed tasks</span><b>{total}<small>/{required||"—"}</small></b></article><article><span>Total study time</span><b>{fmt(stats.active_seconds)}</b></article><article><span>Coins earned</span><b>{stats.coins}</b></article></div>
  <div className="module-progress-list">{modules.map(m=>{const count=stats.completed.filter(x=>x.module===m).length;const seconds=Number(stats.by_module?.[m]||0);return <div key={m}><span className="module-progress-name">{moduleLabel(m)}</span><div className="module-progress-bar"><i style={{width:Math.min(100,Math.max(count?8:0,(seconds/3600)*12))+"%"}}/></div><b>{count} tasks · {fmt(seconds)}</b></div>})}</div>
 </section>;
}

export function AchievementsPanel({stats,completedDays}:{stats:HubStats;completedDays:number}){
 const tasks=stats.completed.length,profile=Boolean(stats.student.date_of_birth&&stats.student.gender&&stats.student.english_level&&stats.student.exam_date);
 const items:Array<[string,string,boolean,number,LucideIcon]>=[
  ["First task","Complete your first challenge task",tasks>=1,Math.min(100,tasks*100),Award],
  ["Five tasks","Complete 5 challenge tasks",tasks>=5,Math.min(100,tasks/5*100),Check],
  ["Ten tasks","Complete 10 challenge tasks",tasks>=10,Math.min(100,tasks/10*100),Medal],
  ["One focused hour","Study actively for 1 hour",stats.active_seconds>=3600,Math.min(100,stats.active_seconds/3600*100),Clock3],
  ["Five focused hours","Study actively for 5 hours",stats.active_seconds>=18000,Math.min(100,stats.active_seconds/18000*100),Clock3],
  ["Coin starter","Earn 5 coins",stats.coins>=5,Math.min(100,stats.coins/5*100),Coins],
  ["Coin collector","Earn 15 coins",stats.coins>=15,Math.min(100,stats.coins/15*100),Coins],
  ["Full profile","Complete your IELTS profile",profile,profile?100:40,UserRound],
  ["Day finisher","Complete every published task in one day",completedDays>=1,completedDays?100:0,ShieldCheck],
 ];
 return <section className="hub-panel"><div className="hub-heading"><div><small>MILESTONES</small><h1>Achievements</h1><p>Achievements unlock from actual saved course progress — no demo scores.</p></div><Medal size={34}/></div>
  <div className="achievement-grid">{items.map(([title,desc,done,progress,Icon])=><article className={done?"unlocked":""} key={title}><span><Icon size={21}/>{done&&<Check size={12}/>}</span><b>{title}</b><p>{desc}</p><div><i style={{width:progress+"%"}}/></div><small>{done?"Unlocked":Math.round(progress)+"%"}</small></article>)}</div>
 </section>;
}

export function ProfilePanel({stats,onStudent,onCoins,onLogout}:{stats:HubStats;onStudent:(s:Student)=>void;onCoins:(n:number)=>void;onLogout:()=>void}){
 const s=stats.student;
 const [form,setForm]=useState({first_name:s.first_name||"",last_name:s.last_name||"",date_of_birth:s.date_of_birth||"",gender:s.gender||"",english_level:s.english_level||"",target_band:String(s.target_band||""),exam_date:s.exam_date||""});
 const [saving,setSaving]=useState(false),[message,setMessage]=useState("");
 async function save(){
  setSaving(true);setMessage("");
  try{const r=await fetch("/api/ark60",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"update_profile",...form,target_band:Number(form.target_band)})});const j=await r.json();if(!r.ok)throw new Error(j.detail||"Could not save profile.");onStudent(j.student);if(j.profile_bonus_awarded){onCoins(stats.coins+1);setMessage("Profile saved · +1 coin earned.")}else setMessage("Profile saved.")}catch(e){setMessage(e instanceof Error?e.message:"Could not save profile.")}finally{setSaving(false)}
 }
 async function logoutAll(){if(!window.confirm("Sign out this account on every device?"))return;try{await fetch("/api/ark60",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"logout_all"})})}finally{onLogout()}}
 const initials=(s.first_name[0]+s.last_name[0]).toUpperCase();
 return <section className="profile-page"><div className="profile-hero-card"><span className="profile-big-avatar">{initials}</span><div className="profile-main-copy"><h1>{s.first_name} {s.last_name}</h1><p>@{s.username} <i>Student</i></p></div><div className="profile-summary"><div><span>TARGET BAND</span><b>{Number(s.target_band).toFixed(1)}</b></div><div><span>CONNECTED ACCOUNTS</span><b>1</b></div><div><span>EXAM DATE</span><b>{s.exam_date||"—"}</b></div></div></div>
  <div className="profile-bonus-note"><Coins size={16}/> Complete every profile field with real information and earn a one-time +1 coin.</div>
  <div className="profile-section"><h3>ABOUT YOU</h3><div className="profile-fields"><label><span>Name</span><div className="two-input"><input value={form.first_name} onChange={e=>setForm({...form,first_name:e.target.value})} placeholder="First name"/><input value={form.last_name} onChange={e=>setForm({...form,last_name:e.target.value})} placeholder="Last name"/></div></label><label><span>Date of birth</span><input type="date" value={form.date_of_birth} onChange={e=>setForm({...form,date_of_birth:e.target.value})}/></label><label><span>Gender</span><select value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}><option value="">Not set</option><option value="male">Male</option><option value="female">Female</option><option value="prefer_not_to_say">Prefer not to say</option></select></label></div></div>
  <div className="profile-section"><h3>IELTS</h3><div className="profile-fields"><label><span>English level</span><select value={form.english_level} onChange={e=>setForm({...form,english_level:e.target.value})}><option value="">Not set</option>{["A1","A2","B1","B2","C1","C2"].map(x=><option key={x}>{x}</option>)}</select></label><label><span>Target band</span><select value={form.target_band} onChange={e=>setForm({...form,target_band:e.target.value})}>{[6,6.5,7,7.5,8,8.5,9].map(x=><option key={x} value={x}>{x.toFixed(1)}</option>)}</select></label><label><span>Exam date</span><input type="date" value={form.exam_date} onChange={e=>setForm({...form,exam_date:e.target.value})}/></label></div></div>
  <div className="profile-actions"><button onClick={save} disabled={saving}><Save size={16}/>{saving?"Saving…":"Save profile"}</button>{message&&<span>{message}</span>}</div>
  <div className="profile-signout"><button onClick={onLogout}>Sign out</button><button onClick={logoutAll}>Sign out everywhere</button></div>
 </section>;
}
