"use client";

import AnimatedBackButton from "../components/animated-back-button";
import {LeaderboardPanel,ProfilePanel,ProgressPanel,RewardModal,type HubStats} from "../components/challenge-hub-panels";
import {useEffect,useMemo,useState} from "react";
import {
 LayoutDashboard,CalendarDays,ChartNoAxesCombined,Trophy,BookOpen,Headphones,Newspaper,NotebookPen,PenLine,Mic,
 LockKeyhole,Clock3,ChevronRight,Menu,X,Bell,CircleHelp,CheckCircle2,Sun,Moon,Coins,ShieldCheck
} from "lucide-react";

type Day={n:number,date:Date,mock:boolean};
type StudentStats=HubStats;
type ModuleCard={name:string;detail:string;icon:typeof BookOpen;tone:string;time:string};

function duration(seconds:number){
 const s=Math.max(0,Math.floor(seconds));
 return Math.floor(s/3600)+"h "+String(Math.floor((s%3600)/60)).padStart(2,"0")+"m";
}

const DAYS:Day[]=Array.from({length:60},(_,i)=>{
 const date=new Date(Date.UTC(2026,9,1+i));
 return {n:i+1,date,mock:date.getUTCDay()===0};
});
const daysOfWeek=["MON","TUE","WED","THU","FRI","SAT","SUN"];
const regular:ModuleCard[]=[
 {name:"Reading",detail:"2 passages · IELTS CDI",icon:BookOpen,tone:"purple",time:"45–60 min"},
 {name:"Listening",detail:"Full test · 40 questions",icon:Headphones,tone:"blue",time:"35–45 min"},
 {name:"Article",detail:"Academic article · CDI reader",icon:Newspaper,tone:"amber",time:"20–30 min"},
 {name:"Vocabulary",detail:"Daily words + review quiz",icon:NotebookPen,tone:"green",time:"15–25 min"},
 {name:"Writing",detail:"IELTS Task 1 or Task 2",icon:PenLine,tone:"orange",time:"40 min"},
 {name:"Speaking",detail:"Full Speaking · Parts 1–3",icon:Mic,tone:"pink",time:"12–18 min"}
];
const mockModules:ModuleCard[]=[
 {name:"Listening",detail:"4 sections · 40 questions",icon:Headphones,tone:"blue",time:"~30 min"},
 {name:"Reading",detail:"3 passages · 40 questions",icon:BookOpen,tone:"purple",time:"60 min"},
 {name:"Writing",detail:"Task 1 + Task 2",icon:PenLine,tone:"orange",time:"60 min"},
 {name:"Speaking",detail:"Parts 1–3 · recorded",icon:Mic,tone:"pink",time:"11–14 min"}
];

const format=(date:Date,opt:Intl.DateTimeFormatOptions)=>date.toLocaleDateString("en-GB",{timeZone:"UTC",...opt});
function tashkentDate(){
 return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tashkent",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
}
function unlocked(d:Day,today:string){return d.date.toISOString().slice(0,10)<=today}
function modulesFor(day:Day){
 if(day.mock)return mockModules;
 const studyIndex=DAYS.filter(x=>x.n<day.n&&!x.mock).length;
 return regular.map(x=>x.name==="Writing"?{
  ...x,
  detail:studyIndex%2===0?"IELTS Writing Task 1":"IELTS Writing Task 2",
  time:studyIndex%2===0?"20 min":"40 min"
 }:x);
}
function moduleHref(day:number,name:string){
 if(name==="Reading")return "/day/"+day+"/reading";
 if(name==="Article")return "/day/"+day+"/article";
 if(name==="Vocabulary")return "/day/"+day+"/vocabulary";
 if(name==="Writing")return "/day/"+day+"/writing";
 return "/day/"+day;
}

export default function Dashboard(){
 const [today,setToday]=useState("2026-09-30");
 const [selected,setSelected]=useState(1);
 const [view,setView]=useState("Dashboard");
 const [sidebar,setSidebar]=useState(false);
 const [month,setMonth]=useState<"all"|"oct"|"nov">("oct");
 const [stats,setStats]=useState<StudentStats|null>(null);
 const [authChecked,setAuthChecked]=useState(false);
 const [loadError,setLoadError]=useState("");
 const [rewardOpen,setRewardOpen]=useState(false);
 const [theme,setTheme]=useState<"light"|"dark">("light");
 const [typedWelcome,setTypedWelcome]=useState("");
 const [typing,setTyping]=useState(false);

 useEffect(()=>{
  let mounted=true,inFlight=false;
  async function refresh(){
   if(inFlight)return;
   inFlight=true;
   try{
    const res=await fetch("/api/ark60?action=me",{credentials:"same-origin",cache:"no-store"});
    if(res.status===401){window.location.replace("/");return}
    if(!res.ok)throw new Error("Could not load your challenge data.");
    const obj=await res.json();
    if(mounted){setStats(obj);setLoadError("")}
   }catch(e){
    if(mounted)setLoadError(e instanceof Error?e.message:"Could not load your challenge data.");
   }finally{
    inFlight=false;
    if(mounted)setAuthChecked(true);
   }
  }
  const onVisible=()=>{if(document.visibilityState==="visible")void refresh()};
  void refresh();
  window.addEventListener("focus",onVisible);
  document.addEventListener("visibilitychange",onVisible);
  const id=window.setInterval(()=>{if(document.visibilityState==="visible")void refresh()},300000);
  return()=>{mounted=false;window.clearInterval(id);window.removeEventListener("focus",onVisible);document.removeEventListener("visibilitychange",onVisible)};
 },[]);

 useEffect(()=>{
  const saved=localStorage.getItem("ark60-theme");
  setTheme(saved==="dark"?"dark":"light");
 },[]);
 useEffect(()=>{localStorage.setItem("ark60-theme",theme)},[theme]);

 useEffect(()=>{
  const tick=()=>setToday(tashkentDate());
  tick();
  const id=window.setInterval(tick,60000);
  return()=>window.clearInterval(id);
 },[]);

 useEffect(()=>{
  const d=DAYS.find(x=>x.date.toISOString().slice(0,10)===today);
  if(d)setSelected(d.n);
 },[today]);

 useEffect(()=>{
  if(view!=="Dashboard"||!stats)return;
  const full="Welcome, "+stats.student.first_name+".";
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){
   setTypedWelcome(full);setTyping(false);return;
  }
  setTypedWelcome("");setTyping(true);
  let index=0;
  const id=window.setInterval(()=>{
   index+=1;
   setTypedWelcome(full.slice(0,index));
   if(index>=full.length){window.clearInterval(id);window.setTimeout(()=>setTyping(false),850)}
  },78);
  return()=>window.clearInterval(id);
 },[view,stats?.student.first_name]);

 async function exit(){
  if(stats){
   try{await fetch("/api/ark60",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({action:"logout"})})}catch{}
  }
  window.location.assign("/");
 }

 const completedDays=stats?DAYS.filter(d=>{
  const required=stats.required_by_day?.[String(d.n)]||[];
  return required.length>0&&required.every(module=>stats.completed.some(x=>x.day_number===d.n&&x.module===module));
 }).length:0;
 const initials=stats?(stats.student.first_name[0]+stats.student.last_name[0]).toUpperCase():"AR";
 const currentDay=DAYS.find(x=>x.date.toISOString().slice(0,10)===today)?.n||0;
 const preview=Boolean(stats?.preview);
 const planDayNumber=currentDay||1;
 const planDay=DAYS[planDayNumber-1];
 const planRequired=stats?.required_by_day?.[String(planDayNumber)]||[];
 const planModules=modulesFor(planDay).filter(x=>planRequired.includes(x.name.toLowerCase()));
 const planDone=stats?planRequired.filter(module=>stats.completed.some(x=>x.day_number===planDayNumber&&x.module===module)).length:0;
 const planLive=unlocked(planDay,today)||preview;

 const chosen=DAYS[selected-1];
 const live=unlocked(chosen,today)||preview;
 const chosenRequired=stats?.required_by_day?.[String(chosen.n)]||[];
 const display=useMemo(()=>modulesFor(chosen),[chosen]);
 const moduleReady=(name:string)=>chosenRequired.includes(name.toLowerCase());
 const navigation=[
  {name:"Dashboard",icon:LayoutDashboard},
  {name:"60-Day Plan",icon:CalendarDays},
  {name:"Progress",icon:ChartNoAxesCombined},
  {name:"Leaderboard",icon:Trophy}
 ];
 const visible=month==="all"?DAYS:DAYS.filter(x=>month==="oct"?x.date.getUTCMonth()===9:x.date.getUTCMonth()===10);

 if(!authChecked&&!stats)return <main className="empty-view"><div className="empty-icon"><Clock3 size={28}/></div><h1>Loading your challenge…</h1><p>Checking your account and course progress.</p></main>;
 if(authChecked&&!stats&&loadError)return <main className="empty-view"><div className="empty-icon"><CircleHelp size={28}/></div><h1>Could not load your dashboard</h1><p>{loadError}</p><button type="button" onClick={()=>window.location.reload()}>Try again</button></main>;

 return <div className={"learning-shell "+(theme==="dark"?"theme-dark":"theme-light")}>
  <aside className={"learning-sidebar "+(sidebar?"open":"")}>
   <div className="learning-brand learning-brand-minimal"><button className="mobile-close" aria-label="Close menu" onClick={()=>setSidebar(false)}><X size={18}/></button></div>
   <div className="side-overline">WORKSPACE</div>
   <nav className="learning-nav">{navigation.map(({name,icon:Icon})=><button key={name} className={view===name?"active":""} onClick={()=>{setView(name);setSidebar(false)}}><Icon size={18} strokeWidth={1.85}/><span>{name}</span>{view===name&&<ChevronRight size={14}/>}</button>)}</nav>
   <div className="sidebar-bottom">
    <button className="sidebar-reward-btn" onClick={()=>{setRewardOpen(true);setSidebar(false)}}><span><Coins size={16}/></span><div><b>Daily reward</b><small>Build your 7-day coin streak</small></div><ChevronRight size={14}/></button>
    <button className="user-tile sidebar-profile-tile" onClick={()=>{setView("Profile");setSidebar(false)}}><span className="user-avatar">{initials}</span><div><b>{stats?stats.student.first_name+" "+stats.student.last_name:"Student"}</b><small>{stats?"Target band · "+Number(stats.student.target_band).toFixed(1):"Profile"}</small></div><ChevronRight size={14}/></button>
   </div>
  </aside>

  {sidebar&&<button className="sidebar-overlay" aria-label="Close navigation" onClick={()=>setSidebar(false)}/>}
  <div className="learning-main">
   <header className="learning-topbar">
    <div className="topbar-left">
     <button className="menu-toggle" aria-label="Open menu" onClick={()=>setSidebar(true)}><Menu size={20}/></button>
     <span className="topbar-section">{view}</span><div className="topbar-line"/>
     <span className={"topbar-status "+(preview?"preview-mode":"")}><span className="status-pulse"/> {preview?"Preview mode":currentDay?"Day "+currentDay+" of 60":"Challenge opens 1 October"}</span>
    </div>
    <div className="topbar-right">
     <button className="coins-chip" onClick={()=>setRewardOpen(true)} aria-label="Open rewards"><Coins size={15}/> {stats?.coins??0}</button>
     <button className="top-icon theme-toggle" aria-label={theme==="dark"?"Switch to light mode":"Switch to dark mode"} title={theme==="dark"?"Light mode":"Dark mode"} onClick={()=>setTheme(v=>v==="dark"?"light":"dark")}>{theme==="dark"?<Sun size={18}/>:<Moon size={18}/>}</button>
     <button aria-label="Notifications" className="top-icon" onClick={()=>location.assign("/notifications")}><Bell size={18}/></button>
    </div>
   </header>

   <main className="learning-content">
    {loadError&&stats&&<div role="status" className="dashboard-live-warning">{loadError} Live stats may be temporarily out of date.</div>}

    {view==="Dashboard"?<>
     <div className="page-heading dashboard-heading">
      <div className="hero-landscape" aria-hidden="true"/>
      <div className="hero-copy">
       <div className="section-eyebrow"><span className="rocket-mark">✦</span> YOUR IELTS JOURNEY <span className="eyebrow-line"/></div>
       <h1 className="typewriter-title" aria-label={stats?"Welcome, "+stats.student.first_name+".":"Welcome."}><span aria-hidden="true">{typedWelcome||" "}</span>{typing&&<i className="typewriter-caret" aria-hidden="true"/>}</h1>
       <p>Stay focused on today. Every completed task moves your 60-day IELTS challenge forward.</p>
      </div>
      <span className="date-badge"><CalendarDays size={15}/> 1 Oct – 29 Nov</span>
     </div>

     <div className="kpi-row dashboard-kpis">
      <div className="kpi-card"><div><span>COURSE PROGRESS</span><b>{completedDays} <i>/ 60</i></b><small>Days completed</small></div><ChartNoAxesCombined size={22}/></div>
      <div className="kpi-card"><div><span>{currentDay?"TODAY":"NEXT STUDY DAY"}</span><b>{planDone} <i>/ {planRequired.length||"—"}</i></b><small>{planRequired.length?"Published tasks completed":"No published tasks yet"}</small></div><CheckCircle2 size={22}/></div>
      <div className="kpi-card"><div><span>STUDY TIME</span><b>{stats?duration(stats.today_seconds):"—"}</b><small>{stats?"Total "+duration(stats.active_seconds):"Starts after sign-in"}</small></div><Clock3 size={22}/></div>
      <div className="kpi-card kpi-highlight"><div><span>COINS</span><b>{stats?.coins??0}</b><small>Earn +1 for each completed task</small></div><Coins size={23}/></div>
     </div>

     <section className="today-panel">
      <div className="today-panel-head">
       <div><span className="section-eyebrow">{currentDay?"TODAY'S PLAN":preview?"PREVIEW DAY":"NEXT STUDY DAY"}</span><h2>Day {String(planDayNumber).padStart(2,"0")} · {format(planDay.date,{weekday:"long",day:"numeric",month:"long"})}</h2><p>{planRequired.length?planRequired.length+" published task"+(planRequired.length===1?"":"s")+" ready for this day.":"Materials have not been published for this day yet."}</p></div>
       <div className="today-progress"><strong>{planDone}/{planRequired.length||0}</strong><span>completed</span></div>
      </div>
      <div className="today-task-list">
       {planModules.length?planModules.map(({name,detail,icon:Icon,tone,time})=>{
        const done=stats?.completed.some(x=>x.day_number===planDayNumber&&x.module===name.toLowerCase());
        return <div key={name} className={"detail-item dashboard-task "+(done?"task-completed ":"")+(planLive?"task-ready":"task-pending")}>
         <span className={"task-icon "+tone}><Icon size={19} strokeWidth={1.8}/></span>
         <div className="task-copy"><strong>{name}<span className="task-coin-badge"><Coins size={11}/> +1 coin</span></strong><small>{detail}</small><span><Clock3 size={11}/>{time}</span></div>
         <button type="button" className={"task-action "+(planLive?"can-open":"future")+" "+(done?"completed":"")} disabled={!planLive} onClick={()=>{if(planLive)window.location.assign(moduleHref(planDayNumber,name))}}>
          {done?"Completed":planLive?"Start":"Locked"}{done?<CheckCircle2 size={15}/>:planLive?<ChevronRight size={15}/>:<LockKeyhole size={13}/>}
         </button>
        </div>;
       }):<div className="today-empty"><CalendarDays size={22}/><div><b>No published tasks yet</b><p>When materials are published, they will appear here automatically.</p></div></div>}
      </div>
      <div className="today-panel-footer"><span>{planLive?"Your unfinished published tasks stay available after their original day.":"This day unlocks on "+format(planDay.date,{day:"numeric",month:"long"})+"."}</span><button onClick={()=>{setSelected(planDayNumber);setView("60-Day Plan")}}>Open 60-Day Plan <ChevronRight size={14}/></button></div>
     </section>
    </>:view==="60-Day Plan"?<>
     <div className="page-heading plan-heading">
      <div className="hero-copy"><div className="section-eyebrow"><CalendarDays size={13}/> COURSE ROADMAP <span className="eyebrow-line"/></div><h1>60-Day Plan</h1><p>Explore the full challenge calendar, published tasks and Full Mock Sundays.</p></div>
      <span className="date-badge"><CalendarDays size={15}/> 1 Oct – 29 Nov</span>
     </div>

     <div className="study-layout plan-layout">
      <section className="calendar-panel">
       <div className="panel-title-row"><div className="cal-title-stack"><div className="calendar-heading-icon"><CalendarDays size={25}/></div><div><h2>Challenge calendar</h2><p>Choose a day to inspect its published tasks. Future days remain locked.</p></div></div><div className="month-switch"><button className={month==="all"?"selected":""} onClick={()=>setMonth("all")}>All</button><button className={month==="oct"?"selected":""} onClick={()=>setMonth("oct")}>Oct</button><button className={month==="nov"?"selected":""} onClick={()=>setMonth("nov")}>Nov</button></div></div>
       <div className="weekday-row">{daysOfWeek.map(x=><span key={x}>{x}</span>)}</div>
       <div className="calendar-grid">
        {Array.from({length:((visible[0].date.getUTCDay()+6)%7)},(_,i)=><span key={"blank-"+i} className="empty-cal"/>)}
        {visible.map(d=>{
         const required=stats?.required_by_day?.[String(d.n)]||[];
         const cells=modulesFor(d);
         return <button key={d.n} className={"cal-cell "+(d.mock?"sunday ":"")+(selected===d.n?"selected ":"")+(today===d.date.toISOString().slice(0,10)?"is-today ":"")} onClick={()=>setSelected(d.n)} aria-label={"Day "+d.n+" "+format(d.date,{day:"numeric",month:"long"})+(d.mock?" Full Mock":"")}>
          <span className="cal-upper"><span>Day {d.n}</span>{(unlocked(d,today)||preview)?<CheckCircle2 size={11}/>:<LockKeyhole size={11}/>}</span>
          <b>{format(d.date,{day:"numeric",month:"short"})}</b>
          <div className="cal-dots">{cells.map((m,i)=><i key={i} className={required.includes(m.name.toLowerCase())?m.tone:"muted"}/>)}</div>
          {d.mock&&<small className="mock-label">FULL MOCK</small>}
         </button>;
        })}
       </div>
       <div className="calendar-legend"><span><i className="dot-small purple"/>Published</span><span><i className="dot-small muted"/>Not published</span><span><Sun size={13}/> Sunday mock</span></div>
      </section>

      <aside className="detail-panel" id="day-detail">
       <div className="day-details-top"><div className="detail-overline">{chosen.mock?"FULL IELTS MOCK":"DAILY TRAINING PLAN"}</div><div className="day-row"><h2>Day {String(chosen.n).padStart(2,"0")}</h2><span className="day-inline-date">{format(chosen.date,{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</span><span className={"detail-status "+(live?"ready":"locked")}>{live?"Available":"Locked"}</span></div><p>{chosen.mock?"Complete the published mock sections for this date.":"Complete the published modules for this study day."}</p><div className="detail-subhead"><span>{chosenRequired.length?chosenRequired.length+" published task"+(chosenRequired.length===1?"":"s"):"Materials not published yet"}</span><span>{chosen.mock?"Full Mock":"IELTS practice"}</span></div></div>
       <div className="detail-list">{display.map(({name,detail,icon:Icon,tone,time})=>{
        const ready=live&&moduleReady(name);
        const done=stats?.completed.some(x=>x.day_number===chosen.n&&x.module===name.toLowerCase());
        return <div key={name} className={"detail-item "+(done?"task-completed ":"")+(ready?"task-ready":"task-pending")}>
         <span className={"task-icon "+tone}><Icon size={19} strokeWidth={1.8}/></span>
         <div className="task-copy"><strong>{name}{moduleReady(name)&&<span className="task-coin-badge"><Coins size={11}/> +1 coin</span>}</strong><small>{moduleReady(name)?detail:"Material not published yet"}</small><span><Clock3 size={11}/>{time}</span></div>
         <button type="button" className={"task-action "+(ready?"can-open":"future")+" "+(done?"completed":"")} disabled={!ready} title={!live?"Available on "+format(chosen.date,{day:"numeric",month:"long"}):!moduleReady(name)?"Material not published yet":"Open "+name} onClick={()=>{if(ready)window.location.assign(moduleHref(chosen.n,name))}}>
          {done?"Completed":ready?"Start":live?"Soon":"Locked"}{done?<CheckCircle2 size={15}/>:ready?<ChevronRight size={15}/>:<LockKeyhole size={13}/>}
         </button>
        </div>;
       })}</div>
       <div className="day-detail-footer"><div><span>DAY STATUS</span><b>{live?(chosenRequired.length?chosenRequired.length+" published modules":"Materials pending upload"):"Available on "+format(chosen.date,{day:"numeric",month:"short"})}</b></div><button disabled={!live} className="detail-btn" onClick={()=>{if(live)location.href="/day/"+chosen.n}}>{live?"View study day":"Future day locked"}<ChevronRight size={16}/></button></div>
      </aside>
     </div>

     <section className="bottom-insights"><article><div className="insight-icon"><ShieldCheck size={20}/></div><div><b>Calendar-based access</b><p>Each day unlocks at 00:00 Uzbekistan time. Previous unfinished days remain available.</p></div></article><article><div className="insight-icon"><Clock3 size={20}/></div><div><b>Active study tracking</b><p>Only visible, recently active supported study time is recorded.</p></div></article></section>
    </>:view==="Leaderboard"&&stats?<LeaderboardPanel studentId={stats.student.id}/>:view==="Progress"&&stats?<ProgressPanel stats={stats} completedDays={completedDays}/>:view==="Profile"&&stats?<ProfilePanel stats={stats} onStudent={student=>setStats(prev=>prev?{...prev,student:{...prev.student,...student}}:prev)} onCoins={coins=>setStats(prev=>prev?{...prev,coins}:prev)} onLogout={exit}/>:<section className="empty-view"><div className="empty-icon"><Bell size={31}/></div><h1>{view}</h1><p>This section is not available yet.</p><AnimatedBackButton onClick={()=>setView("Dashboard")} ariaLabel="Back to dashboard"/></section>}
   </main>
  </div>

  <RewardModal open={rewardOpen} onClose={()=>setRewardOpen(false)} onBalance={coins=>setStats(prev=>prev?{...prev,coins}:prev)}/>
 </div>;
}
