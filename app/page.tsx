"use client";
import Link from "next/link";
import {useState} from "react";
import {ArrowRight,BookOpen,CalendarDays,CheckCircle2,Eye,EyeOff,GraduationCap,LockKeyhole,LogIn,ShieldCheck,Sparkles,Target,UserRound,Users} from "lucide-react";

export default function Home(){
 const [mode,setMode]=useState<"register"|"login">("register");
 const [target,setTarget]=useState("");
 const [showPassword,setShowPassword]=useState(false);
 const [message,setMessage]=useState("");
 const [first,setFirst]=useState("");
 const [last,setLast]=useState("");
 const [access,setAccess]=useState("");
 const [username,setUsername]=useState("");
 const [password,setPassword]=useState("");
 function handleSubmit(e:React.FormEvent){e.preventDefault();setMessage(mode==="register"?"Account creation opens when the teacher activates invitation codes. Your target band and name are ready.":"Student authentication is being connected to the secure backend. Please use the preview while setup is completed.");}
 return <main className="auth-v2">
  <div className="auth-v2-top"><Link href="/" className="auth-v2-logo"><span>A</span><b>ARK <em>IELTS</em></b><small>60-DAY CHALLENGE</small></Link><span className="auth-v2-top-right"><ShieldCheck size={15}/> PRIVATE IELTS WORKSPACE</span></div>
  <section className="auth-v2-center">
   <div className="auth-v2-intro"><span className="auth-v2-label"><Sparkles size={15}/> THE 60-DAY IELTS CHALLENGE</span><h1>Your IELTS journey<br/><span>starts here.</span></h1><p>Build consistency, track every hour of real study and follow your own 60-day pathway to a higher band.</p></div>
   <div className="auth-v2-card">
    <div className="auth-v2-card-head"><div className="auth-v2-symbol"><GraduationCap size={24}/></div><div><span className="auth-v2-kicker">ARK EDUCATION</span><h2>{mode==="register"?"Create your account":"Welcome back"}</h2><p>{mode==="register"?"Enter your details and choose your IELTS target.":"Sign in to continue your IELTS challenge."}</p></div></div>
    <div className="auth-v2-tabs"><button type="button" onClick={()=>{setMode("register");setMessage("")}} className={mode==="register"?"on":""}><UserRound size={16}/> Register</button><button type="button" onClick={()=>{setMode("login");setMessage("")}} className={mode==="login"?"on":""}><LogIn size={16}/> Log in</button></div>
    <form onSubmit={handleSubmit} className="auth-v2-form">
     {mode==="register"?<>
      <div className="auth-v2-two"><label>First name<div className="auth-v2-input"><UserRound size={16}/><input required value={first} onChange={e=>setFirst(e.target.value)} placeholder="First name" maxLength={55}/></div></label><label>Last name<div className="auth-v2-input"><UserRound size={16}/><input required value={last} onChange={e=>setLast(e.target.value)} placeholder="Last name" maxLength={55}/></div></label></div>
      <label>Invitation code <small>Provided by your teacher</small><div className="auth-v2-input"><LockKeyhole size={16}/><input required value={access} onChange={e=>setAccess(e.target.value)} placeholder="Enter your access code" autoComplete="off"/></div></label>
      <label>Target IELTS band<div className="auth-v2-input"><Target size={16}/><select required value={target} onChange={e=>setTarget(e.target.value)}><option value="" disabled>Choose your target band</option>{["6.0","6.5","7.0","7.5","8.0","8.5","9.0"].map(b=><option key={b} value={b}>Band {b}</option>)}</select></div></label>
     </>:<>
      <label>Username<div className="auth-v2-input"><UserRound size={16}/><input required value={username} onChange={e=>setUsername(e.target.value)} placeholder="Your username" autoComplete="username"/></div></label>
      <label>Password<div className="auth-v2-input"><LockKeyhole size={16}/><input required type={showPassword?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password"/><button type="button" className="password-eye" aria-label={showPassword?"Hide password":"Show password"} onClick={()=>setShowPassword(x=>!x)}>{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label>
     </>}
     {message&&<p role="status" className="auth-v2-notice">{message}</p>}
     <button className="auth-v2-submit" type="submit">{mode==="register"?"Create student profile":"Log in to your dashboard"}<ArrowRight size={18}/></button>
    </form>
    <div className="auth-v2-divider"><span/> PREVIEW PLATFORM <span/></div><Link href="/dashboard" className="auth-v2-preview">Explore student dashboard <ArrowRight size={16}/></Link>
    <p className="auth-v2-disclaimer">Preview is public. Real accounts, saved progress and activity tracking will be available after activation.</p>
   </div>
   <div className="auth-v2-benefits"><div><span><CalendarDays size={18}/></span><strong>60-day structured plan</strong><small>1 Oct – 29 Nov 2026</small></div><div><span><BookOpen size={18}/></span><strong>Six daily IELTS modules</strong><small>Sunday full mock exams</small></div><div><span><Target size={18}/></span><strong>Personal target band</strong><small>Track your own progress</small></div></div>
  </section>
  <footer className="auth-v2-footer"><span>© ARK EDUCATION · IELTS ONLY</span><span>Learn consistently. Grow confidently.</span><Link href="/admin">Admin preview <ArrowRight size={12}/></Link></footer>
 </main>;
}