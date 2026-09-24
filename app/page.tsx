"use client";
import {useState} from "react";
import {ArrowRight,BookOpen,CalendarDays,CheckCircle2,Eye,EyeOff,GraduationCap,LockKeyhole,LogIn,ShieldCheck,Sparkles,Target,UserRound,Users} from "lucide-react";

export default function Home(){
 const [mode,setMode]=useState<"register"|"login">("register");
 const [target,setTarget]=useState("");
 const [showPassword,setShowPassword]=useState(false);
 const [message,setMessage]=useState("");
 const [first,setFirst]=useState("");
 const [last,setLast]=useState("");
 const [username,setUsername]=useState("");
 const [password,setPassword]=useState("");
 const [busy,setBusy]=useState(false);
 const [registeredUsername,setRegisteredUsername]=useState("");
 async function handleSubmit(e:React.FormEvent){
  e.preventDefault();
  setBusy(true);setMessage("");
  try{
   const payload=mode==="register"?{action:"register",first_name:first.trim(),last_name:last.trim(),target_band:Number(target),password}:{action:"login",username:username.trim().toLowerCase(),password};
   const res=await fetch("/api/ark60",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",body:JSON.stringify(payload)});
   const result=await res.json();
   if(!res.ok){setMessage(result.detail||"Unable to complete your request. Please try again.");return}
   if(mode==="register"){setRegisteredUsername(result.username);setPassword("");setUsername(result.username);setMessage("")}
   else window.location.assign(result.redirect==="/admin"?"/admin":"/dashboard");
  }catch{setMessage("Unable to contact the server. Please try again.")}
  finally{setBusy(false)}
 }
 return <main className="auth-v2">
  <section className="auth-v2-center">
   <div className="auth-v2-intro"><span className="auth-v2-label"><Sparkles size={15}/> THE 60-DAY IELTS CHALLENGE</span><h1>Your IELTS journey<br/><span>starts here.</span></h1><p>Build consistency, track every hour of real study and follow your own 60-day pathway to a higher band.</p></div>
   <div className="auth-v2-card">
    <div className="auth-v2-card-head"><div className="auth-v2-symbol"><GraduationCap size={26}/></div><div><span className="auth-v2-kicker">ARK EDUCATION</span><h2>{mode==="register"?"Create your account":"Welcome back"}</h2><p>{mode==="register"?"Enter your details. An administrator will review your application.":"Sign in to continue your IELTS challenge."}</p></div></div>
    <div className="auth-v2-tabs"><button type="button" onClick={()=>{setMode("register");setMessage("");setRegisteredUsername("")}} className={mode==="register"?"on":""}><UserRound size={16}/> Register</button><button type="button" onClick={()=>{setMode("login");setMessage("");setRegisteredUsername("")}} className={mode==="login"?"on":""}><LogIn size={16}/> Log in</button></div>
    {registeredUsername&&mode==="register"?<div className="registration-pending" role="status"><div className="registration-pending-icon"><CheckCircle2 size={26}/></div><h3>Request sent for approval</h3><p>Your details have been sent to the ARK IELTS admin panel. Save your username and wait for an administrator to approve your account.</p><div className="registered-user"><CheckCircle2 size={18}/><div><small>YOUR USERNAME — SAVE THIS</small><strong>{registeredUsername}</strong><p>You can log in with this username after approval.</p></div></div><button type="button" className="registration-pending-login" onClick={()=>{setMode("login");setUsername(registeredUsername);setRegisteredUsername("");setMessage("");}}>Go to Log in <ArrowRight size={17}/></button></div>:<form onSubmit={handleSubmit} className="auth-v2-form">
     {mode==="register"?<>
      <div className="auth-v2-two"><label>First name<div className="auth-v2-input"><UserRound size={16}/><input required value={first} onChange={e=>setFirst(e.target.value)} placeholder="First name" maxLength={55}/></div></label><label>Last name<div className="auth-v2-input"><UserRound size={16}/><input required value={last} onChange={e=>setLast(e.target.value)} placeholder="Last name" maxLength={55}/></div></label></div>
            <label>Target IELTS band<div className="auth-v2-input"><Target size={16}/><select required value={target} onChange={e=>setTarget(e.target.value)}><option value="" disabled>Choose your target band</option>{["6.0","6.5","7.0","7.5","8.0","8.5","9.0"].map(b=><option key={b} value={b}>Band {b}</option>)}</select></div></label>
      <label>Create password<div className="auth-v2-input"><LockKeyhole size={16}/><input required minLength={10} maxLength={128} type={showPassword?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 10 characters" autoComplete="new-password"/><button type="button" className="password-eye" aria-label={showPassword?"Hide password":"Show password"} onClick={()=>setShowPassword(x=>!x)}>{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label>
     </>:<>
      <label>Username<div className="auth-v2-input"><UserRound size={16}/><input required value={username} onChange={e=>setUsername(e.target.value)} placeholder="Your username" autoComplete="username"/></div></label>
      <label>Password<div className="auth-v2-input"><LockKeyhole size={16}/><input required type={showPassword?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password"/><button type="button" className="password-eye" aria-label={showPassword?"Hide password":"Show password"} onClick={()=>setShowPassword(x=>!x)}>{showPassword?<EyeOff size={16}/>:<Eye size={16}/>}</button></div></label>
     </>}
     {message&&<p role="status" className="auth-v2-notice">{message}</p>}
     <button className={"auth-v2-submit "+(mode==="register"?"student-create-btn":"")} type="submit" disabled={busy}>{busy?"Please wait…":mode==="register"?"Send approval request":"Log in to your dashboard"}<ArrowRight size={18}/></button>
    </form>}
   </div>
   <div className="auth-v2-benefits"><div><span><CalendarDays size={18}/></span><strong>60-day structured plan</strong><small>1 Oct – 29 Nov 2026</small></div><div><span><BookOpen size={18}/></span><strong>Six daily IELTS modules</strong><small>Sunday full mock exams</small></div><div><span><Target size={18}/></span><strong>Personal target band</strong><small>Track your own progress</small></div></div>
  </section>
  <footer className="auth-v2-footer"><span>© ARK EDUCATION · IELTS ONLY</span><span>Learn consistently. Grow confidently.</span></footer>
 </main>;
}