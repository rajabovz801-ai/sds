"use client";
import AnimatedBackButton from "../../components/animated-back-button";
import StudentPresence from "../../components/student-presence";
import ChallengeSidebar from "../../components/challenge-sidebar";
import {readingPassageForDay} from "../../../lib/ark60-reading-plan";
import Link from "next/link";
import {useParams} from "next/navigation";
import {useEffect,useState} from "react";
import {BookOpen,Headphones,Newspaper,NotebookPen,PenLine,Mic,ChevronRight,LockKeyhole,CalendarDays,Clock3,ShieldCheck,Coins} from "lucide-react";
const WRITING_DAYS=new Set(Array.from({length:60},(_,i)=>i+1).filter(day=>new Date(Date.UTC(2026,9,day)).getUTCDay()!==0));
function writingType(day:number){const ordered=[...WRITING_DAYS].sort((a,b)=>a-b);return ordered.indexOf(day)%2===0?"Task 1":"Task 2"}
const regular=[
 {name:"Reading",description:"Two IELTS CDI passage practices",icon:BookOpen,tone:"purple"},
 {name:"Listening",description:"Full listening practice",icon:Headphones,tone:"blue"},
 {name:"Article",description:"Academic article and comprehension",icon:Newspaper,tone:"amber"},
 {name:"Vocabulary",description:"Daily vocabulary and review quiz",icon:NotebookPen,tone:"green"},
 {name:"Writing",description:"IELTS Writing Task 1 / Task 2",icon:PenLine,tone:"orange"},
 {name:"Speaking",description:"Daily speaking practice",icon:Mic,tone:"pink"}
];
function uzToday(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tashkent",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
type ProgressState={preview?:boolean;required_by_day?:Record<string,string[]>;completed?:Array<{day_number:number;module:string}>};
type AvailabilityKey="progress"|"reading"|"article"|"vocabulary"|"speaking"|"listening"|"mock";
type ModuleAvailabilityKey=Exclude<AvailabilityKey,"progress">;
type AvailabilityState=Record<AvailabilityKey,"checking"|"ready"|"error">;
const EMPTY_AVAILABILITY:AvailabilityState={progress:"checking",reading:"checking",article:"checking",vocabulary:"checking",speaking:"checking",listening:"checking",mock:"checking"};
function progressUnlocked(day:number,stats:ProgressState|null,today:string,now=Date.now()){
 if(stats?.preview)return true;
 if(day===4&&now<Date.UTC(2026,9,4,5,0,0))return false;
 const iso=new Date(Date.UTC(2026,9,day)).toISOString().slice(0,10);
 if(iso>today||!stats)return false;
 for(let prior=1;prior<day;prior+=1){
  const required=stats.required_by_day?.[String(prior)]||[];
  if(!required.length)continue;
  const done=new Set((stats.completed||[]).filter(x=>x.day_number===prior).map(x=>x.module));
  if(!required.every(module=>done.has(module)))return false;
 }
 return true;
}
export default function DayPage(){
 const params=useParams<{day:string}>();const day=Math.max(1,Math.min(60,Number(params.day)||1));
 const date=new Date(Date.UTC(2026,9,day)),sunday=date.getUTCDay()===0;
 const readingPassage=readingPassageForDay(day);
 const isPassage2Day=readingPassage===2,isPassage3Day=readingPassage===3;
 const scheduledReading=readingPassage!==null;
 const [today,setToday]=useState("2026-09-25"),[clock,setClock]=useState(Date.now()),[teacher,setTeacher]=useState(false),[progress,setProgress]=useState<ProgressState|null>(null);
 const [publishedReading,setPublishedReading]=useState(0),[publishedVocabulary,setPublishedVocabulary]=useState(0),[publishedArticleVocab,setPublishedArticleVocab]=useState(0),[publishedArticle,setPublishedArticle]=useState(false),[articleTitle,setArticleTitle]=useState(""),[publishedSpeaking,setPublishedSpeaking]=useState(false),[publishedListening,setPublishedListening]=useState(false),[publishedMock,setPublishedMock]=useState(false);
 const [availability,setAvailability]=useState<AvailabilityState>(EMPTY_AVAILABILITY);
 const [availabilityRetry,setAvailabilityRetry]=useState(0);
 useEffect(()=>{setToday(uzToday());setClock(Date.now());let mounted=true;setAvailability(EMPTY_AVAILABILITY);
  const check=async(key:AvailabilityKey,url:string,apply:(value:any)=>void)=>{
   try{
    const response=await fetch(url,{credentials:"same-origin",cache:"no-store"});
    const value=await response.json();
    if(!response.ok)throw new Error(value?.detail||"Availability check failed");
    if(!mounted)return;
    apply(value);
    setAvailability(current=>({...current,[key]:"ready"}));
   }catch{
    if(mounted)setAvailability(current=>({...current,[key]:"error"}));
   }
  };
  const checks=sunday?[
   check("progress","/api/ark60?action=me",value=>{setProgress(value);setTeacher(value.preview===true)}),
   check("mock","/api/challenge-mock?action=availability&day="+day,value=>setPublishedMock(!!value?.published))
  ]:[
   check("progress","/api/ark60?action=me",value=>{setProgress(value);setTeacher(value.preview===true)}),
   check("reading","/api/challenge-reading?action=list&day="+day,value=>{setTeacher(value?.preview===true);setPublishedReading(value?.passages?.length||0)}),
   check("article","/api/challenge-article?action=availability&day="+day,value=>{setPublishedArticle(!!value?.published);setArticleTitle(value?.title||"")}),
   check("vocabulary","/api/challenge-vocab?action=overview&day="+day,value=>{const complete=(value?.units||[]).filter((u:{word_count:number})=>u.word_count===20);setPublishedVocabulary(complete.length);setPublishedArticleVocab(complete.filter((u:{source_kind:string})=>u.source_kind==="article").length)}),
   check("speaking","/api/challenge-speaking?action=availability&day="+day,value=>setPublishedSpeaking(!!value?.published)),
   check("listening","/api/challenge-listening?action=availability&day="+day,value=>setPublishedListening(!!value?.published))
  ];
  void Promise.all(checks);
  const timer=window.setInterval(()=>setClock(Date.now()),30000);
  return()=>{mounted=false;window.clearInterval(timer)}},[day,availabilityRetry]);
 useEffect(()=>{if(progress&&!progressUnlocked(day,progress,uzToday(),clock))window.location.replace("/dashboard")},[day,progress,clock]);
 const available=teacher||progressUnlocked(day,progress,today,clock);
 const hasAvailabilityError=Object.values(availability).includes("error");
 const modules=sunday?[regular[1],regular[0],regular[4]]:regular;
 const dateText=date.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"UTC"});
 return <main className="cd-day ch-layout"><StudentPresence area="Day" day={day}/>
  <ChallengeSidebar day={day} active="Day"/>
  <div className="ch-page">
  <header className="cd-day-top"><AnimatedBackButton href="/dashboard" ariaLabel="Back to dashboard"/><span className="cd-day-brand">ARK <b>EDUCATION</b><i>· 60 DAY CHALLENGE</i></span><span className="cd-day-top-end"><CalendarDays size={16}/> Day {String(day).padStart(2,"0")} / 60</span></header>
  <nav className="ch-mobile-nav" aria-label="Challenge navigation"><Link href="/dashboard">Dashboard</Link><Link href={"/day/"+day} aria-current="page">Day {String(day).padStart(2,"0")} plan</Link></nav>
  <div className="cd-day-body">
   {hasAvailabilityError&&<div className="cd-day-error" role="alert"><span>Could not check material availability. Retry to see the correct day status.</span><button type="button" onClick={()=>setAvailabilityRetry(value=>value+1)}>Try again</button></div>}
   <section className="cd-day-hero"><div className="cd-day-hero-inner"><div className="cd-day-hero-copy">
     <div className="cd-day-kicker"><span>✦ YOUR IELTS JOURNEY</span><i/> {dateText.toUpperCase()}</div>
     <h1>{sunday?"Full Mock":"Day "+String(day).padStart(2,"0")}</h1>
     <p>{sunday?"Three exam sections on your scheduled mock day.":"Your focused IELTS training plan — one module at a time."}</p>
     <div className="cd-day-tags"><span className={"cd-day-status "+(available?"available":"locked")}>{teacher?<ShieldCheck size={14}/>:available?<CalendarDays size={14}/>:<LockKeyhole size={14}/>} {teacher?"Teacher preview":available?"Available today":"Unlocks "+date.toLocaleDateString("en-GB",{day:"numeric",month:"long",timeZone:"UTC"})}</span><span className="cd-day-meta"><Clock3 size={14}/> Asia / Tashkent</span></div></div>
     <span className="cd-day-date-badge"><CalendarDays size={17}/>{date.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"})}</span>
   </div></section>
   <div className="cd-day-stats" aria-label="Daily learning plan overview">
    <div className="cd-day-stat"><CalendarDays size={20}/><div><span>DAILY MODULES</span><strong>{sunday?3:6}</strong><small>Focused study sections</small></div></div>
    <div className="cd-day-stat"><BookOpen size={20}/><div><span>READING PLAN</span><strong>{scheduledReading&&!sunday?"02":"—"}</strong><small>{scheduledReading&&!sunday?(isPassage3Day?"Passage 3 practices":isPassage2Day?"Passage 2 practices":"Passage 1 practices"):"Not scheduled today"}</small></div></div>
    <div className="cd-day-stat"><NotebookPen size={20}/><div><span>VOCABULARY</span><strong>{publishedVocabulary?String(publishedVocabulary*20):scheduledReading&&!sunday?(day===1?"120":"80"):"—"}</strong><small>{!sunday?"Published unique words":"Not scheduled today"}</small></div></div>
    <div className="cd-day-stat"><ShieldCheck size={20}/><div><span>STUDY STATUS</span><strong className="cd-day-status-value">{teacher?"Preview":available?"Ready":"Locked"}</strong><small>{teacher?"Teacher access":available?"Your day is available":"Future study day"}</small></div></div>
   </div>
   <section className="cd-day-list"><div className="cd-day-list-head"><h2>{sunday?"Mock sections":"Today's modules"}</h2><span>{sunday?"3 sections":"6 modules"}</span></div><div className="cd-day-modules">{modules.map(({name,description,icon:Icon,tone},i)=>{const checkKey:ModuleAvailabilityKey=name==="Reading"?"reading":name==="Article"?"article":name==="Vocabulary"?"vocabulary":name==="Speaking"?"speaking":"listening";const remotelyPublished=["Reading","Article","Vocabulary","Speaking","Listening"].includes(name);const ready=sunday?(available&&publishedMock):(available&&((name==="Reading"&&scheduledReading&&publishedReading===2)||(name==="Listening"&&publishedListening)||(name==="Article"&&publishedArticle&&publishedArticleVocab===2)||(name==="Vocabulary"&&publishedVocabulary>0)||(name==="Writing"&&WRITING_DAYS.has(day))||(name==="Speaking"&&publishedSpeaking)));const href=sunday?"/day/"+day+"/mock":name==="Reading"?"/day/"+day+"/reading":name==="Listening"?"/day/"+day+"/listening":name==="Article"?"/day/"+day+"/article":name==="Writing"?"/day/"+day+"/writing":name==="Speaking"?"/day/"+day+"/speaking":"/day/"+day+"/vocabulary";return <article className={"cd-day-module "+(ready?"ready":"")} key={name}><div className={"cd-day-icon "+tone}><Icon size={21} strokeWidth={1.75}/></div><div className="cd-day-copy"><span className="cd-day-sequence">{String(i+1).padStart(2,"0")} · {name.toUpperCase()}</span><h3>{name}{ready&&!sunday&&<span className="cd-coin-badge"><Coins size={12}/> +1 coin</span>}</h3><p>{ready?(sunday?(name==="Listening"?"40 questions · 4 sections · audio once":name==="Reading"?"3 passages · 40 questions · 60 minutes":"Task 1 + Task 2 · one shared 60-minute timer"):(name==="Reading"?(isPassage3Day?"2 IELTS Passage 3 tests · independent results":isPassage2Day?"2 IELTS Passage 2 tests · independent results":"2 IELTS Passage 1 tests · independent results"):name==="Listening"?"Full Listening · 4 sections · 40 questions · audio once":name==="Article"?(articleTitle+" · Interactive reading + 40 Uzbek glossary entries"):name==="Writing"?(writingType(day)+" · "+(writingType(day)==="Task 1"?"20 minutes · 150+ words":"40 minutes · 250+ words")):name==="Speaking"?"Full Speaking · Parts 1–3 · recorded answers":(publishedVocabulary+" units · "+publishedVocabulary*20+" unique words · 18/20 to pass"))):remotelyPublished&&availability[checkKey]==="checking"?"Checking material availability…":remotelyPublished&&availability[checkKey]==="error"?"Could not check availability. Retry above.":name==="Reading"&&!scheduledReading?"No Reading assignment scheduled today":name==="Article"&&!publishedArticle?"Article upload pending":name==="Article"&&publishedArticleVocab!==2?"40 article vocabulary words pending":!available?"Available on the scheduled day":sunday?(publishedMock?"Full Mock opens in sequence: Listening → Reading → Writing":"Full Mock materials pending upload"):"Material pending upload"}</p></div>{ready?<Link className="cd-day-open" href={href} onClick={()=>{if(name==="Writing"&&!document.fullscreenElement)document.documentElement.requestFullscreen().catch(()=>{})}}>{name==="Reading"?"Open Reading":name==="Listening"?"Open Listening":name==="Article"?"Read Article":name==="Writing"?"Open Writing":name==="Speaking"?"Open Speaking":"Open Vocabulary"} <ChevronRight size={17}/></Link>:<span className="cd-day-unavailable"><LockKeyhole size={14}/> Locked</span>}</article>})}</div></section>
  </div>
  </div>
 </main>;
}
