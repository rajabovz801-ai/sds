"use client";
import Link from "next/link";
import ArkWordmark from "../components/ark-wordmark";
import {useEffect,useMemo,useState} from "react";
import {LayoutDashboard,CalendarDays,ChartNoAxesCombined,Trophy,Medal,BookOpen,Headphones,Newspaper,NotebookPen,PenLine,Mic,LockKeyhole,Clock3,Flame,ChevronRight,Menu,X,Bell,Settings,LogOut,CalendarCheck,Target,CircleHelp,ArrowUpRight,CheckCircle2,FileText,ChevronLeft,Sun,Moon,Coins,ShieldCheck} from "lucide-react";

type Day={n:number,date:Date,mock:boolean};
type StudentStats={student:{id:string,first_name:string,last_name:string,username:string,target_band:number},today_seconds:number,active_seconds:number,coins:number,by_module:Record<string,number>,completed:{day_number:number,module:string,score:number|null,band:number|null,review_status:string}[]};
function duration(seconds:number){const s=Math.max(0,Math.floor(seconds));return Math.floor(s/3600)+"h "+String(Math.floor((s%3600)/60)).padStart(2,"0")+"m";}
const DAYS:Day[]=Array.from({length:60},(_,i)=>{const date=new Date(Date.UTC(2026,9,1+i));return {n:i+1,date,mock:date.getUTCDay()===0}});
const daysOfWeek=["MON","TUE","WED","THU","FRI","SAT","SUN"];
const regular=[
 {name:"Reading",detail:"2 passages · IELTS CDI",icon:BookOpen,tone:"purple",time:"45–60 min"},
 {name:"Listening",detail:"Full test · 40 questions",icon:Headphones,tone:"blue",time:"35–45 min"},
 {name:"Article",detail:"Academic article · CDI reader",icon:Newspaper,tone:"amber",time:"20–30 min"},
 {name:"Vocabulary",detail:"Daily words + review quiz",icon:NotebookPen,tone:"green",time:"15–25 min"},
 {name:"Writing",detail:"IELTS Task 1 or Task 2",icon:PenLine,tone:"orange",time:"40 min"},
 {name:"Speaking",detail:"Practice + audio recording",icon:Mic,tone:"pink",time:"15–20 min"}
];
const mockModules=[
 {name:"Listening",detail:"4 sections · 40 questions",icon:Headphones,tone:"blue",time:"~30 min"},
 {name:"Reading",detail:"3 passages · 40 questions",icon:BookOpen,tone:"purple",time:"60 min"},
 {name:"Writing",detail:"Task 1 + Task 2",icon:PenLine,tone:"orange",time:"60 min"},
 {name:"Speaking",detail:"Parts 1–3 · recorded",icon:Mic,tone:"pink",time:"11–14 min"}
];
const start=new Date(Date.UTC(2026,9,1));
const end=new Date(Date.UTC(2026,10,29));
const format=(date:Date,opt:Intl.DateTimeFormatOptions)=>date.toLocaleDateString("en-GB",{timeZone:"UTC",...opt});
function tashkentDate(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tashkent",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
function unlocked(d:Day,today:string){const iso=d.date.toISOString().slice(0,10);return iso<=today}
export default function Dashboard(){
 const [today,setToday]=useState("2026-09-24");
 const [clock,setClock]=useState("");
 const [selected,setSelected]=useState(1);
 const [view,setView]=useState("Dashboard");
 const [sidebar,setSidebar]=useState(false);
 const [month,setMonth]=useState<"all"|"oct"|"nov">("oct");
 const [stats,setStats]=useState<StudentStats|null>(null);
 const [authChecked,setAuthChecked]=useState(false);
 useEffect(()=>{let mounted=true;async function refresh(){try{const res=await fetch("/api/ark60?action=me",{credentials:"same-origin",cache:"no-store"});if(res.ok){const obj=await res.json();if(mounted)setStats(obj)}else if(mounted)setStats(null)}catch{}finally{if(mounted)setAuthChecked(true)}}refresh();const id=setInterval(refresh,60000);return()=>{mounted=false;clearInterval(id)}},[]);
 async function exit(){if(stats){try{await fetch("/api/ark60",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({action:"logout"})})}catch{}}window.location.assign("/")}
 const completedDays=stats?DAYS.filter(d=>{const required=d.mock?["listening","reading","writing","speaking"]:regular.map(x=>x.name.toLowerCase());return required.every(module=>stats.completed.some(x=>x.day_number===d.n&&x.module===module))}).length:0;
 const initials=stats?(stats.student.first_name[0]+stats.student.last_name[0]).toUpperCase():"AR";
 useEffect(()=>{
  function tick(){const iso=tashkentDate();setToday(iso);setClock(new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Tashkent",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(new Date()))}
  tick();const id=setInterval(tick,1000);return()=>clearInterval(id);
 },[]);
 useEffect(()=>{const d=DAYS.find(x=>x.date.toISOString().slice(0,10)===today);if(d)setSelected(d.n)},[today]);
 const chosen=DAYS[selected-1];
 const live=unlocked(chosen,today);
 const currentDay=DAYS.find(x=>x.date.toISOString().slice(0,10)===today)?.n||0;
 const navigation=[{name:"Dashboard",icon:LayoutDashboard},{name:"60-Day Plan",icon:CalendarDays},{name:"Progress",icon:ChartNoAxesCombined},{name:"Leaderboard",icon:Trophy},{name:"Achievements",icon:Medal}];
 const visible=month==="all"?DAYS:DAYS.filter(x=>month==="oct"?x.date.getUTCMonth()===9:x.date.getUTCMonth()===10);
 const display=useMemo(()=>{const dayNumber=DAYS.filter(x=>x.n<chosen.n&&!x.mock).length;return chosen.mock?mockModules:regular.map(x=>x.name==="Writing"?{...x,detail:dayNumber%2===0?"IELTS Writing Task 1":"IELTS Writing Task 2"}:x)},[chosen]);
 return <div className="learning-shell">
  <aside className={"learning-sidebar "+(sidebar?"open":"")}>
   <div className="learning-brand"><ArkWordmark/><button className="mobile-close" aria-label="Close menu" onClick={()=>setSidebar(false)}><X size={18}/></button></div>
   <div className="side-overline">WORKSPACE</div>
   <nav className="learning-nav">{navigation.map(({name,icon:Icon})=><button key={name} className={view===name?"active":""} onClick={()=>{setView(name);setSidebar(false)}}><Icon size={18} strokeWidth={1.85}/><span>{name}</span>{view===name&&<ChevronRight size={14}/>}</button>)}</nav>
   <div className="side-overline" style={{marginTop:30}}>MY MODULES</div>
   <nav className="learning-nav small">{regular.map(({name,icon:Icon,tone})=><button key={name} onClick={()=>{setView("Dashboard");setSidebar(false);document.getElementById("day-detail")?.scrollIntoView({behavior:"smooth"})}}><span className={"mini-icon "+tone}><Icon size={14}/></span><span>{name}</span></button>)}</nav>
   <div className="sidebar-bottom"><div className="side-promo"><Target size={18}/><b>One day at a time.</b><p>Stay consistent through your 60-day IELTS journey.</p></div><button className="back-login" onClick={exit}><LogOut size={15}/> {stats?"Log out":"Back to sign in"}</button><div className="user-tile"><span className="user-avatar">{initials}</span><div><b>{stats?stats.student.first_name+" "+stats.student.last_name:"Student preview"}</b><small>{stats?"Target band · "+Number(stats.student.target_band).toFixed(1):"Target band · Set at signup"}</small></div></div></div>
  </aside>
  {sidebar&&<button className="sidebar-overlay" aria-label="Close navigation" onClick={()=>setSidebar(false)}/>}
  <div className="learning-main">
   <header className="learning-topbar"><div className="topbar-left"><button className="menu-toggle" aria-label="Open menu" onClick={()=>setSidebar(true)}><Menu size={20}/></button><span className="topbar-section">{view}</span><div className="topbar-line"/><span className="topbar-status"><span className="status-pulse"/> {currentDay?"Day "+currentDay+" of 60":"Course starts 1 October"}</span></div><div className="topbar-right"><span className="time-chip"><Clock3 size={14}/>{clock||"--:--:--"} <small>UZT</small></span><span className="coins-chip"><Coins size={15}/> {stats?.coins??0}</span><button aria-label="Notifications" className="top-icon" onClick={()=>setView("Notifications")}><Bell size={18}/></button><span className="profile-chip"><span>{initials}</span> {stats?stats.student.first_name:"Student preview"}</span></div></header>
   <main className="learning-content">
    {view==="Dashboard"||view==="60-Day Plan"?<>
     <div className="page-heading"><div className="hero-landscape" aria-hidden="true"/><div className="hero-copy"><div className="section-eyebrow"><span className="rocket-mark">✦</span> YOUR IELTS JOURNEY <span className="eyebrow-line"/></div><h1>{view==="Dashboard"?(stats?"Welcome, "+stats.student.first_name+".":"Your 60-day plan"):"60-Day Calendar"}</h1><p>1 October – 29 November 2026 · Six focused modules each study day, Full Mock every Sunday.</p></div><span className="date-badge"><CalendarDays size={15}/> 1 Oct – 29 Nov</span></div>
     <div className="kpi-row"><div className="kpi-card"><div><span>TOTAL DAYS</span><b>60</b><small>51 study days + 9 mocks</small></div><CalendarDays size={22}/></div><div className="kpi-card"><div><span>COURSE PROGRESS</span><b>{completedDays} <i>/ 60</i></b><small>Days completed</small></div><ChartNoAxesCombined size={22}/></div><div className="kpi-card"><div><span>ACTIVE STUDY TIME</span><b>{stats?duration(stats.today_seconds):"—"}</b><small>{stats?"Today · total "+duration(stats.active_seconds):"Starts after sign-in"}</small></div><Clock3 size={22}/></div><div className="kpi-card kpi-highlight"><div><span>CHALLENGE</span><b>{currentDay?"Day "+currentDay:"1 OCT"}</b><small>{currentDay?"Today's study plan":"Course opening day"}</small></div><Flame size={24}/></div></div>
     <div className="study-layout">
      <section className="calendar-panel"><div className="panel-title-row"><div className="cal-title-stack"><div className="calendar-heading-icon"><CalendarDays size={25}/></div><div><h2>60-day challenge calendar</h2><p>Click a day to view its tasks. Future days are locked.</p></div></div><div className="month-switch"><button className={month==="all"?"selected":""} onClick={()=>setMonth("all")}>All</button><button className={month==="oct"?"selected":""} onClick={()=>setMonth("oct")}>Oct</button><button className={month==="nov"?"selected":""} onClick={()=>setMonth("nov")}>Nov</button></div></div><div className="weekday-row">{daysOfWeek.map(x=><span key={x}>{x}</span>)}</div><div className="calendar-grid">{Array.from({length:((visible[0].date.getUTCDay()+6)%7)},(_,i)=><span key={"blank-"+i} className="empty-cal"/>)}
       {visible.map(d=><button key={d.n} className={"cal-cell "+(d.mock?"sunday ":"")+(selected===d.n?"selected ":"")+(today===d.date.toISOString().slice(0,10)?"is-today ":"")} onClick={()=>setSelected(d.n)} aria-label={"Day "+d.n+" "+format(d.date,{day:"numeric",month:"long"})+(d.mock?" Full Mock":"")}>
        <span className="cal-upper"><span>Day {d.n}</span>{unlocked(d,today)?<CheckCircle2 size={11}/>:<LockKeyhole size={11}/>}</span><b>{format(d.date,{day:"numeric",month:"short"})}</b><div className="cal-dots">{d.mock?[0,1,2,3].map(i=><i key={i} className={["blue","purple","orange","pink"][i]}/>):regular.map((m,i)=><i key={i} className={m.tone}/>)}</div>{d.mock&&<small className="mock-label">FULL MOCK</small>}
       </button>)}</div><div className="calendar-legend"><span><i className="dot-small purple"/>Reading</span><span><i className="dot-small blue"/>Listening</span><span><i className="dot-small amber"/>Article</span><span><i className="dot-small green"/>Vocabulary</span><span><i className="dot-small orange"/>Writing</span><span><i className="dot-small pink"/>Speaking</span><span><Sun size={13}/> Sunday mock</span></div></section>
      <aside className="detail-panel" id="day-detail"><div className="day-details-top"><div className="detail-overline">{chosen.mock?"FULL IELTS MOCK":"DAILY TRAINING PLAN"}</div><div className="day-row"><h2>Day {String(chosen.n).padStart(2,"0")}</h2><span className="day-inline-date">{format(chosen.date,{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</span><span className={"detail-status "+(live?"ready":"locked")}>{live?"Available":"Locked"}</span></div><p>{chosen.mock?"Complete all four exam sections in one uninterrupted session.":"Complete all six modules to finish the day’s study."}</p><div className="detail-subhead"><span>{chosen.mock?"4 exam sections · continuous session":"6 learning modules"}</span><span>{chosen.mock?"No breaks":"IELTS practice"}</span></div></div>
       <div className="detail-list">{display.map(({name,detail,icon:Icon,tone,time},i)=><div key={name} className="detail-item"><span className={"task-icon "+tone}><Icon size={19} strokeWidth={1.8}/></span><div className="task-copy"><strong>{name}</strong><small>{detail}</small><span><Clock3 size={11}/>{time}</span></div><button type="button" className={"task-action "+(live?"can-open":"future")} disabled={!live} title={!live?"Available on "+format(chosen.date,{day:"numeric",month:"long"}):"Open "+name} onClick={()=>{if(live)window.location.assign("/day/"+chosen.n)}}>{live?(stats?.completed.some(x=>x.day_number===chosen.n&&x.module===name.toLowerCase())?"Done":"Start"):"Locked"}{live?<ChevronRight size={15}/>:<LockKeyhole size={13}/>}</button></div>)}</div>
       <div className="day-detail-footer"><div><span>DAY STATUS</span><b>{live?"Materials pending upload":"Available on "+format(chosen.date,{day:"numeric",month:"short"})}</b></div><button disabled={!live} className="detail-btn" onClick={()=>{if(live)location.href="/day/"+chosen.n}}>{live?"View study day":"Future day locked"}<ChevronRight size={16}/></button></div></aside>
     </div>
     <section className="bottom-insights"><article><div className="insight-icon"><ShieldCheck size={20}/></div><div><b>Calendar-based access</b><p>Each day unlocks at 00:00 Uzbekistan time. Previous unfinished days stay available without late coins.</p></div></article><article><div className="insight-icon"><Clock3 size={20}/></div><div><b>Automatic study-time tracking</b><p>Article and every other module will log active platform time after account activation.</p></div></article></section>
    </>:<section className="empty-view"><div className="empty-icon">{view==="Leaderboard"?<Trophy size={31}/>:view==="Progress"?<ChartNoAxesCombined size={31}/>:view==="Achievements"?<Medal size={31}/>:<Bell size={31}/>}</div><h1>{view}</h1><p>This section will display real course data once student accounts and backend tracking are activated. No demonstration scores are shown as real results.</p><button onClick={()=>setView("Dashboard")}>Back to your calendar <ChevronRight size={17}/></button></section>}
   </main>
  </div>
 </div>;
}