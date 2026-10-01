"use client";
import AnimatedBackButton from "../../components/animated-back-button";
import ChallengeSidebar from "../../components/challenge-sidebar";
import Link from "next/link";
import {useParams} from "next/navigation";
import {useEffect,useState} from "react";
import {BookOpen,Headphones,Newspaper,NotebookPen,PenLine,Mic,ChevronRight,LockKeyhole,CalendarDays,Clock3,ShieldCheck,Coins} from "lucide-react";
const P2_DAYS=new Set([2,6,9,13,16]);
const P3_DAYS=new Set([3,7,10,14,17]);
const WRITING_DAYS=new Set([1,2,3,5,6,7,8,9,10,12,13,14,15,16,17]);
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
function progressUnlocked(day:number,stats:ProgressState|null,today:string){
 if(stats?.preview)return true;
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
 const isPassage2Day=P2_DAYS.has(day),isPassage3Day=P3_DAYS.has(day);
 const scheduledReading=[1,5,8,12,15].includes(day)||isPassage2Day||isPassage3Day,iso=date.toISOString().slice(0,10);
 const [today,setToday]=useState("2026-09-25"),[teacher,setTeacher]=useState(false),[progress,setProgress]=useState<ProgressState|null>(null);
 const [publishedReading,setPublishedReading]=useState(0),[publishedVocabulary,setPublishedVocabulary]=useState(0),[publishedArticleVocab,setPublishedArticleVocab]=useState(0),[publishedArticle,setPublishedArticle]=useState(false),[articleTitle,setArticleTitle]=useState(""),[publishedSpeaking,setPublishedSpeaking]=useState(false),[publishedListening,setPublishedListening]=useState(false);
 useEffect(()=>{setToday(uzToday());let mounted=true;
  fetch("/api/ark60?action=me",{credentials:"same-origin",cache:"no-store"}).then(r=>r.ok?r.json():null).then(r=>{if(mounted&&r){setProgress(r);setTeacher(r.preview===true)}}).catch(()=>{});
  fetch("/api/challenge-reading?action=list&day="+day,{credentials:"same-origin",cache:"no-store"}).then(r=>r.ok?r.json():null).then(r=>{if(mounted){setTeacher(r?.preview===true);setPublishedReading(r?.passages?.length||0)}}).catch(()=>{});
  fetch("/api/challenge-article?action=availability&day="+day,{credentials:"same-origin",cache:"no-store"}).then(r=>r.ok?r.json():null).then(r=>{if(mounted){setPublishedArticle(!!r?.published);setArticleTitle(r?.title||"")}}).catch(()=>{});
  fetch("/api/challenge-vocab?action=overview&day="+day,{credentials:"same-origin",cache:"no-store"}).then(r=>r.ok?r.json():null).then(r=>{if(mounted){const complete=(r?.units||[]).filter((u:{word_count:number})=>u.word_count===20);setPublishedVocabulary(complete.length);setPublishedArticleVocab(complete.filter((u:{source_kind:string})=>u.source_kind==="article").length)}} ).catch(()=>{});
  fetch("/api/challenge-speaking?action=availability&day="+day,{credentials:"same-origin",cache:"no-store"}).then(r=>r.ok?r.json():null).then(r=>{if(mounted)setPublishedSpeaking(!!r?.published)}).catch(()=>{});
  fetch("/api/challenge-listening?action=availability&day="+day,{credentials:"same-origin",cache:"no-store"}).then(r=>r.ok?r.json():null).then(r=>{if(mounted)setPublishedListening(!!r?.published)}).catch(()=>{});
  return()=>{mounted=false}},[day]);
 useEffect(()=>{if(progress&&!progressUnlocked(day,progress,uzToday()))window.location.replace("/dashboard")},[day,progress]);
 const available=teacher||progressUnlocked(day,progress,today);
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
    <div className="cd-day-stat"><BookOpen size={20}/><div><span>READING PLAN</span><strong>{scheduledReading&&!sunday?"02":"—"}</strong><small>{scheduledReading&&!sunday?(isPassage3Day?"Passage 3 practices":isPassage2Day?"Passage 2 practices":"Passage 1 practices"):"Not scheduled today"}</small></div></div>
    <div className="cd-day-stat"><NotebookPen size={20}/><div><span>VOCABULARY</span><strong>{publishedVocabulary?String(publishedVocabulary*20):scheduledReading&&!sunday?(day===1?"120":"80"):"—"}</strong><small>{!sunday?"Published unique words":"Not scheduled today"}</small></div></div>
    <div className="cd-day-stat"><ShieldCheck size={20}/><div><span>STUDY STATUS</span><strong className="cd-day-status-value">{teacher?"Preview":available?"Ready":"Locked"}</strong><small>{teacher?"Teacher access":available?"Your day is available":"Future study day"}</small></div></div>
   </div>
   <section className="cd-day-list"><div className="cd-day-list-head"><h2>{sunday?"Mock sections":"Today's modules"}</h2><span>{sunday?"4 sections":"6 modules"}</span></div><div className="cd-day-modules">{modules.map(({name,description,icon:Icon,tone},i)=>{const ready=available&&!sunday&&((name==="Reading"&&scheduledReading&&publishedReading===2)||(name==="Listening"&&publishedListening&&day===1)||(name==="Article"&&publishedArticle&&publishedArticleVocab===2)||(name==="Vocabulary"&&publishedVocabulary>0)||(name==="Writing"&&WRITING_DAYS.has(day))||(name==="Speaking"&&publishedSpeaking&&day<=3));const href=name==="Reading"?"/day/"+day+"/reading":name==="Listening"?"/day/"+day+"/listening":name==="Article"?"/day/"+day+"/article":name==="Writing"?"/day/"+day+"/writing":name==="Speaking"?"/day/"+day+"/speaking":"/day/"+day+"/vocabulary";return <article className={"cd-day-module "+(ready?"ready":"")} key={name}><div className={"cd-day-icon "+tone}><Icon size={21} strokeWidth={1.75}/></div><div className="cd-day-copy"><span className="cd-day-sequence">{String(i+1).padStart(2,"0")} · {name.toUpperCase()}</span><h3>{name}{ready&&<span className="cd-coin-badge"><Coins size={12}/> +1 coin</span>}</h3><p>{ready?(name==="Reading"?(isPassage3Day?"2 IELTS Passage 3 tests · independent results":isPassage2Day?"2 IELTS Passage 2 tests · independent results":"2 IELTS Passage 1 tests · independent results"):name==="Listening"?"Full Listening · 4 sections · 40 questions · audio once":name==="Article"?(articleTitle+" · Interactive reading + 40 Uzbek glossary entries"):name==="Writing"?(writingType(day)+" · "+(writingType(day)==="Task 1"?"20 minutes · 150+ words":"40 minutes · 250+ words")):name==="Speaking"?"Full Speaking · Parts 1–3 · recorded answers":(publishedVocabulary+" units · "+publishedVocabulary*20+" unique words · 18/20 to pass")):name==="Reading"&&!scheduledReading?"No Reading assignment scheduled today":name==="Article"&&!publishedArticle?"Article upload pending":name==="Article"&&publishedArticleVocab!==2?"40 article vocabulary words pending":!available?"Available on the scheduled day":sunday?"Full Mock materials pending upload":"Material pending upload"}</p></div>{ready?<Link className="cd-day-open" href={href} onClick={()=>{if(name==="Writing"&&!document.fullscreenElement)document.documentElement.requestFullscreen().catch(()=>{})}}>{name==="Reading"?"Open Reading":name==="Listening"?"Open Listening":name==="Article"?"Read Article":name==="Writing"?"Open Writing":name==="Speaking"?"Open Speaking":"Open Vocabulary"} <ChevronRight size={17}/></Link>:<span className="cd-day-unavailable"><LockKeyhole size={14}/> Locked</span>}</article>})}</div></section>
  </div>
  </div>
 </main>;
}