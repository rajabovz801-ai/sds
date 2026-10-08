"use client";

import {useEffect,useMemo,useState} from "react";
import {Award,Check,Clock3,Coins,Crown,Gift,LogOut,Save,Star,Target,Trophy,X} from "lucide-react";

import {StyleCollection,RewardAvatar,RewardDecoration,ThemeMark,cosmeticCSS,type CosmeticState} from "./reward-style";

type Student={
 cosmetics?:CosmeticState;id:string;first_name:string;last_name:string;username:string;target_band:number;
 date_of_birth?:string|null;gender?:string|null;english_level?:string|null;exam_date?:string|null;
};
type Completed={day_number:number;module:string;score:number|null;band:number|null;review_status:string};
export type HubStats={
 student:Student;today_seconds:number;active_seconds:number;coins:number;
 by_module:Record<string,number>;completed:Completed[];required_by_day:Record<string,string[]>;preview?:boolean;
};
type RewardEvent={id:string;day_number:number;module:string;kind:string;amount:number;created_at:string};
type RewardGift={day:number;kind:string;amount:number;label:string};
type RewardCenter={cosmetics:CosmeticState;claimed_days:number;next_day:number;next_reward:RewardGift;today_reward:RewardGift|null;catalog:RewardGift[];balance:number;claimed_today:boolean;today_amount:number;streak_day:number;next_amount:number;history:RewardEvent[];preview?:boolean};
type LeaderStatus="online"|"idle"|"offline";
type LeaderPeriod="week"|"30d"|"all";
type LeaderRow={cosmetics?:CosmeticState;student_id:string;full_name:string;username:string;coins:number;active_seconds:number;status:LeaderStatus;rank:number};

const fmt=(s:number)=>{const n=Math.max(0,Math.floor(Number(s)||0));const h=Math.floor(n/3600),m=Math.floor((n%3600)/60);return h?h+"h "+String(m).padStart(2,"0")+"m":m+"m"};
const moduleLabel=(m:string)=>m==="daily"?"Daily reward":m==="profile"?"Profile completion":m.split("_").map(x=>x[0]?.toUpperCase()+x.slice(1)).join(" ");

export function RewardModal({open,onClose,onBalance,onStyle}:{open:boolean;onClose:()=>void;onBalance:(n:number)=>void;onStyle:(s:CosmeticState)=>void}){
 const [data,setData]=useState<RewardCenter|null>(null),[loading,setLoading]=useState(false),[message,setMessage]=useState(""),[demoDay,setDemoDay]=useState(8),[page,setPage]=useState(0);
 async function load(day=demoDay){setLoading(true);setMessage("");try{const r=await fetch("/api/ark60?action=reward_center&demo_day="+day,{credentials:"same-origin",cache:"no-store"});const j=await r.json();if(!r.ok)throw new Error(j.detail||"Could not load rewards.");setData(j);onBalance(Number(j.balance)||0);setPage(Math.floor(((j.claimed_today?j.claimed_days:j.next_day)-1)/7))}catch(e){setMessage(e instanceof Error?e.message:"Could not load rewards.")}finally{setLoading(false)}}
 useEffect(()=>{if(open)void load()},[open]);
 async function claim(){
  setLoading(true);setMessage("");
  try{const r=await fetch("/api/ark60",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"claim_daily_reward",demo_day:demoDay})});const j=await r.json();if(!r.ok)throw new Error(j.detail||"Reward could not be claimed.");setData(j);onBalance(Number(j.balance)||0);onStyle(j.cosmetics);setMessage(j.preview?"Demo reward unlocked. Choose a style below and press Apply style.":j.today_reward?.kind!=="coins"?"Reward unlocked! Your collection is ready below.":"Today's coins have been added.")}
  catch(e){setMessage(e instanceof Error?e.message:"Reward could not be claimed.")}finally{setLoading(false)}
 }
 if(!open)return null;
 const active=data?.claimed_today?Math.max(1,data.claimed_days):data?.next_day||1;
 const gifts=(data?.catalog||[]).slice(page*7,page*7+7);
 return <div className="reward-backdrop" role="dialog" aria-modal="true" aria-label="Daily reward"><section className="reward-modal reward-modal-extended">
  <button className="reward-close" onClick={onClose} aria-label="Close reward"><X size={20}/></button>
  <div className="reward-coin"><Gift size={24}/></div><h2>A little reward, every day</h2><p>Coins, scenic themes, avatars and milestones. Your collection keeps growing.</p>
  {data?.preview&&<div className="reward-demo-controls"><span><b>Rustam · Try demo</b><small>Simulated claims · real coin balance stays unchanged</small></span><label>Reward day<select value={demoDay} disabled={loading} onChange={e=>{const n=Number(e.target.value);setDemoDay(n);void load(n)}}>{[8,9,10,11,12,13,14,21,28,60].map(n=><option key={n} value={n}>Day {n}</option>)}</select></label><button disabled={loading} onClick={()=>void load(demoDay)}>Reset demo</button></div>}
  <div className="reward-progress-line"><b>{data?.claimed_days||0} rewards collected</b><span>Days {page*7+1}–{Math.min(60,page*7+7)}</span></div>
  <div className="reward-week">{gifts.map(g=><div key={g.day} className={"reward-day "+(g.day===active?"active ":"")+(g.day<=(data?.claimed_days||0)?"claimed":"")}><small>DAY {g.day}</small>{g.kind==="coins"?<span className="reward-mini-coin"><Star size={11} fill="currentColor"/></span>:g.kind==="theme"?<img className="reward-gift-thumb" src="/images/rewards/dawn.png" alt="Theme reward"/>:g.kind==="avatar"?<img className="reward-gift-avatar" src="/images/rewards/girl.png" alt="Avatar reward"/>:<Award size={23}/>}<b>{g.kind==="coins"?"+"+g.amount:g.kind==="decoration"?"Decor":g.kind[0].toUpperCase()+g.kind.slice(1)}</b>{g.day<=(data?.claimed_days||0)&&<Check size={13}/>}</div>)}</div>
  <div className="reward-page-nav"><button disabled={page===0} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Rewards continue through day 60</span><button disabled={page>=8} onClick={()=>setPage(p=>p+1)}>Next</button></div>
  <button className="reward-claim" disabled={loading||!data||!!data.claimed_today} onClick={claim}>{loading?"Loading…":data?.claimed_today?"Today's reward claimed":"Claim "+(data?.next_reward.label||"reward")}</button>
  {message&&<div className="reward-message" role="status">{message}</div>}
  {data&&<StyleCollection state={data.cosmetics} preview={data.preview} onApplied={style=>{setData(d=>d?{...d,cosmetics:style}:d);onStyle(style)}}/>}
  <div className="reward-history-head"><span>Balance: <b>{data?.balance??0}</b> <Coins size={13}/></span><b>Coin history</b></div><div className="reward-history">{!data?.history?.length&&<p>Complete a task to start your coin history.</p>}{(data?.history||[]).slice(0,12).map(e=><div key={e.id}><span><b>{moduleLabel(e.module)}</b><small>Day {e.day_number} · {e.kind.replaceAll("_"," ")}</small></span><strong>+{e.amount}</strong></div>)}</div>
 </section></div>;
}

export function LeaderboardPanel({studentId,cosmetics,preview=false}:{studentId:string;cosmetics?:CosmeticState;preview?:boolean}){
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

 const sorted=useMemo(()=>rows.map(row=>row.student_id===studentId?{...row,cosmetics:cosmetics||row.cosmetics}:row).sort((a,b)=>b.coins-a.coins||b.active_seconds-a.active_seconds||a.full_name.localeCompare(b.full_name)),[rows,studentId,cosmetics]);
 const top=sorted.slice(0,3);
 const table=sorted.slice(3,10);
 const current=sorted.find(row=>row.student_id===studentId);
 const initials=(row:LeaderRow)=>row.full_name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]?.toUpperCase()).join("")||"ST";
 const statusLabel=(status:LeaderStatus)=>status==="online"?"Online":status==="idle"?"Idle":"Offline";
 const periodLabel=period==="week"?"This week":period==="30d"?"Last 30 days":"All time";

 return <section className="hub-panel leaderboard-v2">
  <div className="hub-heading lb-heading"><div><small>LIVE COURSE DATA</small><h1>Leaderboard</h1><p>Rankings are based on earned coins and active study time.</p></div><Trophy size={34}/></div>

  {preview&&<article className="demo-leaderboard-card has-reward-theme" style={cosmeticCSS(cosmetics)}><RewardAvatar avatar={cosmetics?.avatar} initials="RU"/><div><b>Rustam <ThemeMark theme={cosmetics?.theme}/></b><small>Your demo leaderboard card · no ranking or coins added</small></div><span className="demo-label">TRY DEMO</span></article>}
  <div className="lb-board">
   {sorted.some(row=>row.status==="online")&&<div className="lb-live-strip"><span><i/>{sorted.filter(row=>row.status==="online").length} student{sorted.filter(row=>row.status==="online").length===1?"":"s"} online now</span><div>{sorted.filter(row=>row.status==="online").slice(0,3).map(row=><b key={row.student_id}>{row.full_name}</b>)}</div></div>}
   <div className="lb-period-tabs" aria-label="Leaderboard period">
    <button className={period==="week"?"active":""} onClick={()=>setPeriod("week")}>This week</button>
    <button className={period==="30d"?"active":""} onClick={()=>setPeriod("30d")}>Last 30 days</button>
    <button className={period==="all"?"active":""} onClick={()=>setPeriod("all")}>All time</button>
   </div>

   {message?<div className="hub-error">{message}</div>:loading?<div className="hub-loading">Loading real rankings…</div>:sorted.length?<>
   <div className={"lb-podium lb-podium-"+Math.min(3,top.length)} aria-label={periodLabel+" top students"}>
    {top.map(row=><article className={"lb-podium-card rank-"+row.rank+" "+(row.student_id===studentId?"me ":"")+(row.cosmetics?.theme?"has-reward-theme":"")} style={cosmeticCSS(row.cosmetics)} key={row.student_id}>
     {row.rank===1&&<Crown className="lb-crown" size={28}/>}
     <RewardAvatar className="lb-avatar" avatar={row.cosmetics?.avatar} initials={initials(row)}/>
     <span className="lb-rank-badge">{row.rank}</span>
     <h2>{row.full_name} <ThemeMark theme={row.cosmetics?.theme}/>{row.cosmetics?.badge&&<Award size={14} aria-label={row.cosmetics.badge}/>}</h2>
     <p>@{row.username}{row.student_id===studentId?" · You":""}</p>
     <div className="lb-podium-metrics"><span><Coins size={15}/><b>{row.coins}</b><small>Coins</small></span><span><Clock3 size={15}/><b>{fmt(row.active_seconds)}</b><small>Study time</small></span></div>
     <div className={"lb-status "+row.status}><i/>{statusLabel(row.status)}</div>
    </article>)}
   </div>

   {table.length>0&&<div className="lb-table-wrap">
    <div className="lb-table-head"><span>#</span><span>Student</span><span>Coins</span><span>Study time</span><span>Status</span></div>
    {table.map(row=><div className={"lb-table-row "+(row.student_id===studentId?"me ":"")+(row.cosmetics?.theme?"has-reward-theme":"")} style={cosmeticCSS(row.cosmetics)} key={row.student_id}>
     <b className="lb-table-rank">{row.rank}</b>
     <div className="lb-table-person"><RewardAvatar className="lb-mini-avatar" avatar={row.cosmetics?.avatar} initials={initials(row)}/><div><b>{row.full_name} <ThemeMark theme={row.cosmetics?.theme}/></b><small>@{row.username}{row.student_id===studentId?" · You":""}</small></div></div>
     <strong><Coins size={14}/>{row.coins}</strong>
     <strong><Clock3 size={14}/>{fmt(row.active_seconds)}</strong>
     <span className={"lb-status "+row.status}><i/>{statusLabel(row.status)}</span>
    </div>)}
   </div>}

   {current&&current.rank>10&&<div className={"lb-current-row "+(current.cosmetics?.theme?"has-reward-theme":"")} style={cosmeticCSS(current.cosmetics)}><span>Your rank</span><b>#{current.rank}</b><div><RewardAvatar className="lb-mini-avatar" avatar={current.cosmetics?.avatar} initials={initials(current)}/><span><strong>{current.full_name} <ThemeMark theme={current.cosmetics?.theme}/></strong><small>@{current.username}</small></span></div><span><Coins size={14}/>{current.coins}</span><span><Clock3 size={14}/>{fmt(current.active_seconds)}</span><span className={"lb-status "+current.status}><i/>{statusLabel(current.status)}</span></div>}
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
 return <section className="profile-page"><div className={"profile-hero-card "+(s.cosmetics?.theme?"has-reward-theme":"")} style={cosmeticCSS(s.cosmetics)}>{s.cosmetics?.theme&&<div className="profile-scene-cover">{s.cosmetics?.unlocked?.decorations&&<RewardDecoration theme={s.cosmetics.theme}/>}</div>}<RewardAvatar className="profile-big-avatar" avatar={s.cosmetics?.avatar} initials={initials}/><div className="profile-main-copy"><h1>{s.first_name} {s.last_name} <ThemeMark theme={s.cosmetics?.theme}/></h1>{s.cosmetics?.badge&&<span className="reward-name-badge"><Award size={14}/>{s.cosmetics.badge.replace("day-","Day ")}</span>}<p>@{s.username} <i>Student</i></p></div><div className="profile-summary"><div><span>TARGET BAND</span><b>{Number(s.target_band).toFixed(1)}</b></div><div><span>COINS EARNED</span><b>{stats.coins}</b></div><div><span>EXAM DATE</span><b>{s.exam_date||"Not set"}</b></div></div></div>
  <StyleCollection state={s.cosmetics||{}} preview={stats.preview} onApplied={cosmetics=>onStudent({...s,cosmetics})}/>
  <div className="profile-bonus-note"><Star size={14} fill="currentColor"/> Complete all profile details once to unlock a +1 coin profile bonus.</div>
  <div className="profile-section"><h3>PERSONAL DETAILS</h3><div className="profile-fields"><label><span>Name</span><div className="profile-name-grid"><div><small>First name</small><input value={form.first_name} onChange={e=>setForm({...form,first_name:e.target.value})} placeholder="First name"/></div><div><small>Last name</small><input value={form.last_name} onChange={e=>setForm({...form,last_name:e.target.value})} placeholder="Last name"/></div></div></label><label><span>Date of birth</span><input type="date" lang="en-GB" value={form.date_of_birth} onChange={e=>setForm({...form,date_of_birth:e.target.value})}/></label><label><span>Gender</span><select value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}><option value="">Not set</option><option value="male">Male</option><option value="female">Female</option><option value="prefer_not_to_say">Prefer not to say</option></select></label></div></div>
  <div className="profile-section"><h3>IELTS GOALS</h3><div className="profile-fields"><label><span>English level</span><select value={form.english_level} onChange={e=>setForm({...form,english_level:e.target.value})}><option value="">Not set</option>{["A1","A2","B1","B2","C1","C2"].map(x=><option key={x}>{x}</option>)}</select></label><label><span>Target band</span><select value={form.target_band} onChange={e=>setForm({...form,target_band:e.target.value})}>{[6,6.5,7,7.5,8,8.5,9].map(x=><option key={x} value={x}>{x.toFixed(1)}</option>)}</select></label><label><span>Exam date</span><input type="date" value={form.exam_date} onChange={e=>setForm({...form,exam_date:e.target.value})}/></label></div></div>
  <div className="profile-actions"><button onClick={save} disabled={saving}><Save size={15}/>{saving?"Saving…":"Save changes"}</button>{message&&<span>{message}</span>}</div>
  <div className="profile-account-card"><div><b>Account session</b><small>Manage where this student account is signed in.</small></div><div className="profile-signout"><button onClick={onLogout}><LogOut size={14}/> Sign out</button><button className="danger" onClick={logoutAll}>Sign out on all devices</button></div></div>
 </section>;
}
