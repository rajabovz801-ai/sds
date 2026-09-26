"use client";
import AnimatedBackButton from "../../components/animated-back-button";
import ChallengeSidebar from "../../components/challenge-sidebar";
import Link from "next/link";
import {useParams} from "next/navigation";
import {useEffect,useState} from "react";
import {BookOpen,Headphones,Newspaper,NotebookPen,PenLine,Mic,ChevronRight,LockKeyhole,CalendarDays,Clock3,ShieldCheck} from "lucide-react";
const P2_DAYS=new Set([2,6,9,13,16]);
const regular=[
 {name:"Reading",description:"Two IELTS CDI passage practices",icon:BookOpen,tone:"purple"},
 {name:"Listening",description:"Full listening practice",icon:Headphones,tone:"blue"},
 {name:"Article",description:"Academic article and comprehension",icon:Newspaper,tone:"amber"},
 {name:"Vocabulary",description:"Daily vocabulary and review quiz",icon:NotebookPen,tone:"green"},
 {name:"Writing",description:"IELTS Writing Task 1 / Task 2",icon:PenLine,tone:"orange"},
 {name:"Speaking",description:"Daily speaking practice",icon:Mic,tone:"pink"}
];
function uzToday(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Tashkent",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
export default function DayPage(){
 const params=useParams<{day:string}>();const day=Math.max(1,Math.min(60,Number(params.day)||1));
 const date=new Date(Date.UTC(2026,9,day)),sunday=date.getUTCDay()===0;
 const isPassage2Day=P2_DAYS.has(day);
 const scheduledReading=[1,5,8,12,15].includes(day)||isPassage2Day,iso=date.toISOString().slice(0,10);
 const [today,setToday]=useState("2026-09-25"),[teacher,setTeacher]=useState(false);
 const [publishedReading,setPublishedReading]=useState(0),[publishedVocabulary,setPublishedVocabulary]=useState(0);
 useEffect(()=>{setToday(uzToday());let mounted=true;
  fetch("/api/challenge-reading?action=list&day="+day,{credentials:"same-origin",cache:"no-store"}).then(r=>r.ok?r.json():null).then(r=>{if(mounted){setTeacher(r?.preview===true);setPublishedReading(r?.passages?.length||0)}}).catch(()=>{});
  fetch("/api/challenge-vocab?action=overview&day="+day,{credentials:"same-origin",cache:"no-store"}).then(r=>r.ok?r.json():null).then(r=>{if(mounted)setPublishedVocabulary((r?.units||[]).filter((u:{word_count:number})=>u.word_count===20).length)}).catch(()=>{});
  return()=>{mounted=false}},[day]);
 const available=teacher||iso<=today;
 const modules=sunday?[regular[1],regular[0],regular[4],regular[5]]:regular;
 const dateText=date.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"UTC"});
 return <main className="cd-day ch-layout">
  <ChallengeSidebar day={day} active="Day"/>
  <div className="ch-page">
  <header className="cd-day-top"><AnimatedBackButton href="/dashboard" ariaLabel="Back to dashboard"/><span className="cd-day-brand">ARK <b>EDUCATION</b><i>· 60 DAY CHALLENGE</i></span><span className="cd-day-top-end"><CalendarDays size={16}/> Day {String(day).padStart(2,"0")} / 60</span></header>
  <div className="cd-day-body">
   <section className="cd-day-hero"><div className="cd-day-hero-inner"><div className="cd-day-hero-copy">
     <div className="cd-day-kicker"><span>✦ YOUR IELTS JOURNEY</span><i/> {dateText.toUpperCase()}</div>
     <h1>{sunday?"Full Mock":"Day "+String(day).padStart(2,"0")}</h1>
     <p>{sunday?"Four exam sections on your scheduled mock day.":"Your focused IELTS training plan — one module at a time."}</p>
     <div className="cd-day-tags"><span className={"cd-day-status "+(available?"available":"locked")}>{teacher?<ShieldCheck size={14}/>:available?<CalendarDays size={14}/>:<LockKeyhole size={14}/>} {teacher?"Teacher preview":available?"Available today":"Unlocks "+date.toLocaleDateString("en-GB",{day:"numeric",month:"long",timeZone:"UTC"})}</span><span className="cd-day-meta"><Clock3 size={14}/> Asia / Tashkent</span></div></div>
     <span className="cd-day-date-badge"><CalendarDays size={17}/>{date.toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"UTC"})}</span>
   </div></section>
   <div className="cd-day-stats" aria-label="Daily learning plan overview">
    <div className="cd-day-stat"><CalendarDays size={20}/><div><span>DAILY MODULES</span><strong>{sunday?4:6}</strong><small>Focused study sections</small></div></div>
    <div className="cd-day-stat"><BookOpen size={20}/><div><span>READING PLAN</span><strong>{scheduledReading&&!sunday?"02":"—"}</strong><small>{scheduledReading&&!sunday?(isPassage2Day?"Passage 2 practices":"Passage 1 practices"):"Not scheduled today"}</small></div></div>
    <div className="cd-day-stat"><NotebookPen size={20}/><div><span>VOCABULARY</span><strong>{scheduledReading&&!sunday?(day===1?"120":"80"):"—"}</strong><small>{scheduledReading&&!sunday?"Unique words":"Not scheduled today"}</small></div></div>
    <div className="cd-day-stat"><ShieldCheck size={20}/><div><span>STUDY STATUS</span><strong className="cd-day-status-value">{teacher?"Preview":available?"Ready":"Locked"}</strong><small>{teacher?"Teacher access":available?"Your day is available":"Future study day"}</small></div></div>
   </div>
   <section className="cd-day-list"><div className="cd-day-list-head"><h2>{sunday?"Mock sections":"Today's modules"}</h2><span>{sunday?"4 sections":"6 modules"}</span></div><div className="cd-day-modules">{modules.map(({name,description,icon:Icon,tone},i)=>{const ready=available&&!sunday&&((day===14&&(name==="Reading"||name==="Vocabulary"))||(name==="Reading"&&scheduledReading&&(!isPassage2Day||publishedReading===2))||(name==="Article"&&day===1)||(name==="Vocabulary"&&scheduledReading&&(!isPassage2Day||publishedVocabulary===4)));const href=name==="Reading"?"/day/"+day+"/reading":name==="Article"?"/day/"+day+"/article":"/day/"+day+"/vocabulary";return <article className={"cd-day-module "+(ready?"ready":"")} key={name}><div className={"cd-day-icon "+tone}><Icon size={21} strokeWidth={1.75}/></div><div className="cd-day-copy"><span className="cd-day-sequence">{String(i+1).padStart(2,"0")} · {name.toUpperCase()}</span><h3>{name}</h3><p>{day===14&&name==="Reading"&&publishedReading===0?"Reading materials pending upload":day===14&&name==="Vocabulary"&&publishedVocabulary===0?"Vocabulary materials pending upload":ready?(name==="Reading"?(isPassage2Day?"2 IELTS Passage 2 tests · independent results":"2 IELTS Passage 1 tests · independent results"):name==="Article"?"Declutter Your Life · CDI reading + Uzbek glossary":day===1?"6 units · 120 unique words · 18/20 to pass":"4 units · 80 unique words · 18/20 to pass"):name==="Reading"&&!scheduledReading?"No Reading assignment scheduled today":name==="Article"&&day!==1?"Article upload pending":!available?"Available on the scheduled day":sunday?"Full Mock materials pending upload":"Material pending upload"}</p></div>{ready?<Link className="cd-day-open" href={href}>{name==="Reading"?"Open Reading":name==="Article"?"Read Article":"Open Vocabulary"} <ChevronRight size={17}/></Link>:<span className="cd-day-unavailable"><LockKeyhole size={14}/> Locked</span>}</article>})}</div></section>
  </div>
  </div>
 </main>;
}