"use client";
import Link from "next/link";
import ArkWordmark from "../components/ark-wordmark";
import {useEffect,useMemo,useState} from "react";
import {LayoutDashboard,Users,CalendarDays,FileText,Mic,ChartNoAxesCombined,Trophy,Clock3,Settings,BookOpen,Headphones,Newspaper,NotebookPen,PenLine,Bell,Menu,X,ShieldCheck,ChevronRight,CheckCircle2,LockKeyhole,LogOut,UserPlus,UserCog,Eye,EyeOff} from "lucide-react";

type Admin={id:string;display_name:string;username:string;role:"super_admin"|"admin";status?:string;created_at?:string};
type DashboardData={admin:Admin;students:any[];total_students:number;active_today:number;today_seconds:number;pending_writing:number;pending_speaking:number};
const courseDays=Array.from({length:60},(_,i)=>{const d=new Date(Date.UTC(2026,9,i+1));return {n:i+1,date:d,mock:d.getUTCDay()===0}});
const contentModules=[{name:"Reading",icon:BookOpen,desc:"2 academic passages + answer keys"},{name:"Listening",icon:Headphones,desc:"Full listening test + audio + transcript"},{name:"Article",icon:Newspaper,desc:"CDI academic article + comprehension"},{name:"Vocabulary",icon:NotebookPen,desc:"Daily B2–C1 set and quiz"},{name:"Writing",icon:PenLine,desc:"Task 1 / Task 2 alternating"},{name:"Speaking",icon:Mic,desc:"Practice prompts + browser recording"}];
function duration(seconds:number){const s=Math.max(0,Math.floor(seconds||0));return Math.floor(s/3600)+"h "+String(Math.floor((s%3600)/60)).padStart(2,"0")+"m"}

export default function AdminPage(){
 const [admin,setAdmin]=useState<Admin|null>(null);
 const [checked,setChecked]=useState(false);
 const [username,setUsername]=useState("");
 const [password,setPassword]=useState("");
 const [showPassword,setShowPassword]=useState(false);
 const [authMessage,setAuthMessage]=useState("");
 const [authBusy,setAuthBusy]=useState(false);
 const [view,setView]=useState("Overview");
 const [selected,setSelected]=useState(1);
 const [mobile,setMobile]=useState(false);
 const [clock,setClock]=useState("");
 const [dashboard,setDashboard]=useState<DashboardData|null>(null);
 const [admins,setAdmins]=useState<Admin[]>([]);
 const [newName,setNewName]=useState("");
 const [newUsername,setNewUsername]=useState("");
 const [newPassword,setNewPassword]=useState("");
 const [adminMessage,setAdminMessage]=useState("");
 const [adminBusy,setAdminBusy]=useState(false);

 useEffect(()=>{function tick(){setClock(new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Tashkent",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}).format(new Date()))}tick();const id=setInterval(tick,1000);return()=>clearInterval(id)},[]);
 useEffect(()=>{let live=true;(async()=>{try{const res=await fetch("/api/ark60?action=admin_me",{credentials:"same-origin",cache:"no-store"});if(res.ok){const obj=await res.json();if(live){setAdmin(obj.admin);await loadDashboard(obj.admin)}}}catch{}finally{if(live)setChecked(true)}})();return()=>{live=false}},[]);

 async function loadDashboard(current=admin){
  try{const res=await fetch("/api/ark60?action=admin_dashboard",{credentials:"same-origin",cache:"no-store"});if(res.ok){const obj=await res.json();setDashboard(obj);if(!current)setAdmin(obj.admin)}}catch{}
 }
 async function loadAdmins(){
  if(admin?.role!=="super_admin")return;
  try{const res=await fetch("/api/ark60?action=admin_admins",{credentials:"same-origin",cache:"no-store"});if(res.ok){const obj=await res.json();setAdmins(obj.admins||[])}}catch{}
 }
 useEffect(()=>{if(view==="Admins"&&admin?.role==="super_admin")loadAdmins()},[view,admin?.role]);

 async function login(e:React.FormEvent){
  e.preventDefault();setAuthBusy(true);setAuthMessage("");
  try{
   const res=await fetch("/api/ark60",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({action:"admin_login",username:username.trim().toLowerCase(),password})});
   const obj=await res.json();
   if(!res.ok){setAuthMessage(obj.detail||"Unable to sign in.");return}
   setAdmin(obj.admin);setPassword("");await loadDashboard(obj.admin);
  }catch{setAuthMessage("Unable to contact the server.")}
  finally{setAuthBusy(false)}
 }
 async function logout(){
  try{await fetch("/api/ark60",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({action:"admin_logout"})})}catch{}
  setAdmin(null);setDashboard(null);setAdmins([]);setView("Overview");
 }
 async function createAdmin(e:React.FormEvent){
  e.preventDefault();setAdminBusy(true);setAdminMessage("");
  try{
   const res=await fetch("/api/ark60",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({action:"create_admin",display_name:newName.trim(),username:newUsername.trim().toLowerCase(),password:newPassword})});
   const obj=await res.json();
   if(!res.ok){setAdminMessage(obj.detail||"Unable to create admin.");return}
   setAdminMessage("Admin created successfully.");setNewName("");setNewUsername("");setNewPassword("");await loadAdmins();
  }catch{setAdminMessage("Unable to contact the server.")}
  finally{setAdminBusy(false)}
 }
 async function setStatus(item:Admin,status:"active"|"disabled"){
  setAdminMessage("");
  try{
   const res=await fetch("/api/ark60",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify({action:"set_admin_status",admin_id:item.id,status})});
   const obj=await res.json();if(!res.ok){setAdminMessage(obj.detail||"Unable to update admin.");return}await loadAdmins();
  }catch{setAdminMessage("Unable to contact the server.")}
 }

 const sections=useMemo(()=>[
  {name:"Overview",icon:LayoutDashboard},{name:"Students",icon:Users},{name:"Content manager",icon:CalendarDays},{name:"Writing inbox",icon:FileText},{name:"Speaking inbox",icon:Mic},{name:"Results",icon:ChartNoAxesCombined},{name:"Leaderboard",icon:Trophy},{name:"Study time",icon:Clock3},
  ...(admin?.role==="super_admin"?[{name:"Admins",icon:UserCog}]:[]),{name:"Settings",icon:Settings}
 ],[admin?.role]);
 const chosen=courseDays[selected-1];
 const items=chosen.mock?[contentModules[1],contentModules[0],contentModules[4],contentModules[5]]:contentModules;

 if(!checked)return <main className="admin-auth-shell"><div className="admin-auth-loading">ARK IELTS</div></main>;
 if(!admin)return <main className="admin-auth-shell">
   <section className="admin-login-card">
    <ArkWordmark subtitle="ADMIN PANEL"/>
    <div className="admin-login-heading"><span><ShieldCheck size={21}/></span><div><small>SECURE ADMIN ACCESS</small><h1>Admin sign in</h1><p>Enter your administrator username and password.</p></div></div>
    <form onSubmit={login} className="admin-login-form">
      <label>Username<div><UserCog size={16}/><input autoFocus required value={username} onChange={e=>setUsername(e.target.value)} placeholder="Admin username" autoComplete="username"/></div></label>
      <label>Password<div><LockKeyhole size={16}/><input required value={password} onChange={e=>setPassword(e.target.value)} type={showPassword?"text":"password"} placeholder="Admin password" autoComplete="current-password"/><button type="button" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Hide password":"Show password"}>{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label>
      {authMessage&&<p className="admin-auth-message">{authMessage}</p>}
      <button className="admin-login-btn" disabled={authBusy}>{authBusy?"Signing in…":"Open admin panel"}<ChevronRight size={17}/></button>
    </form>
   </section>
 </main>;

 return <div className="learning-shell admin-v2">
  <aside className={"learning-sidebar "+(mobile?"open":"")}>
   <div className="learning-brand"><ArkWordmark subtitle="ADMIN WORKSPACE"/><button className="mobile-close" onClick={()=>setMobile(false)} aria-label="Close navigation"><X size={18}/></button></div>
   <div className="side-overline">MANAGEMENT</div>
   <nav className="learning-nav">{sections.map(({name,icon:Icon})=><button key={name} className={view===name?"active":""} onClick={()=>{setView(name);setMobile(false)}}><Icon size={18} strokeWidth={1.8}/><span>{name}</span>{view===name&&<ChevronRight size={14}/>}</button>)}</nav>
   <div className="sidebar-bottom"><button className="back-login" onClick={logout}><LogOut size={15}/> Log out</button><div className="user-tile"><span className="user-avatar">{admin.display_name.slice(0,2).toUpperCase()}</span><div><b>{admin.display_name}</b><small>{admin.role==="super_admin"?"Super Admin":"Admin"}</small></div></div></div>
  </aside>
  {mobile&&<button className="sidebar-overlay" onClick={()=>setMobile(false)} aria-label="Close navigation"/>}
  <div className="learning-main"><header className="learning-topbar"><div className="topbar-left"><button className="menu-toggle" aria-label="Open navigation" onClick={()=>setMobile(true)}><Menu size={20}/></button><b className="topbar-section">{view}</b><div className="topbar-line"/><span className="topbar-status"><span className="status-pulse"/> Course starts 1 October</span></div><div className="topbar-right"><span className="time-chip"><Clock3 size={15}/>{clock||"--:--:--"} <small>UZT</small></span><button className="top-icon" onClick={()=>setView("Notifications")} aria-label="Notifications"><Bell size={18}/></button><span className="profile-chip"><span>{admin.display_name.slice(0,2).toUpperCase()}</span> {admin.display_name} · {admin.role==="super_admin"?"Super Admin":"Admin"}</span></div></header>
   <main className="learning-content"><div className="page-heading admin-page-heading"><div className="hero-copy"><div className="section-eyebrow"><ShieldCheck size={16}/> ADMINISTRATION <span className="eyebrow-line"/></div><h1>{view==="Overview"?"Course control centre":view}</h1><p>ARK IELTS · 60-day challenge · 1 October – 29 November 2026</p></div></div>
   {view==="Overview"?<>
    <div className="kpi-row"><div className="kpi-card"><div><span>REGISTERED STUDENTS</span><b>{dashboard?.total_students??0}</b><small>Active course accounts</small></div><Users size={22}/></div><div className="kpi-card"><div><span>ACTIVE TODAY</span><b>{dashboard?.active_today??0}</b><small>{duration(dashboard?.today_seconds||0)} total study today</small></div><Clock3 size={22}/></div><div className="kpi-card"><div><span>WRITING TO REVIEW</span><b>{dashboard?.pending_writing??0}</b><small>Pending teacher feedback</small></div><FileText size={22}/></div><div className="kpi-card kpi-highlight"><div><span>SPEAKING TO REVIEW</span><b>{dashboard?.pending_speaking??0}</b><small>Pending audio reviews</small></div><Mic size={22}/></div></div>
    <div className="study-layout"><section className="calendar-panel"><div className="panel-title-row"><div><div className="section-eyebrow">COURSE STRUCTURE</div><h2>60-day content manager</h2><p>Preview every day and prepare material before its release date.</p></div><button className="admin-inline-btn" onClick={()=>setView("Content manager")}>Manage content <ChevronRight size={15}/></button></div><div className="admin-day-strip">{courseDays.map(d=><button key={d.n} onClick={()=>setSelected(d.n)} className={(selected===d.n?"picked ":"")+(d.mock?"mock":"")}><span>DAY {String(d.n).padStart(2,"0")}</span><b>{d.date.toLocaleDateString("en-GB",{timeZone:"UTC",day:"numeric",month:"short"})}</b><small>{d.mock?"MOCK":"6 MODULES"}</small></button>)}</div><div className="admin-shortcuts"><button onClick={()=>setView("Students")}><Users size={19}/><b>Student management</b><ChevronRight size={15}/></button><button onClick={()=>setView("Study time")}><Clock3 size={19}/><b>Study time reports</b><ChevronRight size={15}/></button>{admin.role==="super_admin"&&<button onClick={()=>setView("Admins")}><UserCog size={19}/><b>Assign administrators</b><ChevronRight size={15}/></button>}<button onClick={()=>setView("Writing inbox")}><FileText size={19}/><b>Writing feedback</b><ChevronRight size={15}/></button></div></section><aside className="detail-panel"><div className="day-details-top"><div className="day-row"><h2>Day {String(chosen.n).padStart(2,"0")}</h2><span className="detail-status locked">No content</span></div><p>{chosen.date.toLocaleDateString("en-GB",{timeZone:"UTC",weekday:"long",day:"numeric",month:"long"})}</p></div><div className="detail-list">{items.map(({name,icon:Icon,desc})=><div className="detail-item" key={name}><span className="task-icon purple"><Icon size={18}/></span><div className="task-copy"><strong>{name}</strong><small>{desc}</small></div><span className="task-action future">Draft</span></div>)}</div><div className="day-detail-footer"><button className="detail-btn" onClick={()=>setView("Content manager")}>Open content manager <ChevronRight size={16}/></button></div></aside></div>
   </>:view==="Admins"&&admin.role==="super_admin"?<section className="admin-role-layout">
      <article className="admin-role-card"><div className="admin-role-head"><span><UserPlus size={20}/></span><div><small>SUPER ADMIN ONLY</small><h2>Assign a new admin</h2><p>New accounts receive the Admin role. Only your Super Admin account can manage administrators.</p></div></div>
       <form onSubmit={createAdmin} className="admin-create-form"><label>Full name<input required value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Administrator name"/></label><label>Username<input required value={newUsername} onChange={e=>setNewUsername(e.target.value)} placeholder="username" pattern="[A-Za-z0-9._-]{3,32}"/></label><label>Temporary password<input required minLength={10} value={newPassword} onChange={e=>setNewPassword(e.target.value)} type="password" placeholder="At least 10 characters"/></label>{adminMessage&&<p>{adminMessage}</p>}<button disabled={adminBusy}>{adminBusy?"Creating…":"Create admin"}<UserPlus size={16}/></button></form>
      </article>
      <article className="admin-role-card admin-list-card"><div className="admin-role-head"><span><ShieldCheck size={20}/></span><div><small>ACCESS CONTROL</small><h2>Administrators</h2><p>Super Admin remains protected. Admin accounts can be enabled or disabled here.</p></div></div><div className="admin-list">{admins.map(item=><div className="admin-list-row" key={item.id}><span className="admin-list-avatar">{item.display_name.slice(0,2).toUpperCase()}</span><div><b>{item.display_name}</b><small>@{item.username} · {item.role==="super_admin"?"Super Admin":"Admin"}</small></div><em className={item.status==="active"?"on":"off"}>{item.status}</em>{item.role!=="super_admin"&&<button onClick={()=>setStatus(item,item.status==="active"?"disabled":"active")}>{item.status==="active"?"Disable":"Enable"}</button>}</div>)}</div></article>
    </section>:view==="Content manager"?<section className="calendar-panel admin-full"><div className="panel-title-row"><div><div className="section-eyebrow">CONTENT LIBRARY</div><h2>Prepare 60 course days</h2><p>Select a day to inspect its required slots.</p></div></div><div className="admin-day-strip">{courseDays.map(d=><button key={d.n} onClick={()=>setSelected(d.n)} className={(selected===d.n?"picked ":"")+(d.mock?"mock":"")}><span>DAY {String(d.n).padStart(2,"0")}</span><b>{d.date.toLocaleDateString("en-GB",{timeZone:"UTC",day:"numeric",month:"short"})}</b><small>{d.mock?"MOCK":"6 MODULES"}</small></button>)}</div><div className="admin-upload-grid">{items.map(({name,icon:Icon,desc})=><div className="admin-upload-card" key={name}><Icon size={22}/><h3>{name}</h3><p>{desc}</p><span>Ready for material upload</span></div>)}</div></section>:<section className="empty-view admin-empty"><div className="empty-icon">{view==="Study time"?<Clock3 size={30}/>:view==="Students"?<Users size={30}/>:view==="Leaderboard"?<Trophy size={30}/>:view==="Writing inbox"?<FileText size={30}/>:view==="Speaking inbox"?<Mic size={30}/>:<Settings size={30}/>}</div><h1>{view}</h1><p>This section will use live student and course data as the workflow is completed.</p><button onClick={()=>setView("Overview")}>Return to overview <ChevronRight size={17}/></button></section>}
   </main>
  </div>
 </div>;
}
