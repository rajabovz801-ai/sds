"use client";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {useParams} from "next/navigation";
import AnimatedBackButton from "../../../components/animated-back-button";
import ChallengeSidebar from "../../../components/challenge-sidebar";
import {ArrowRight,BookOpen,Bookmark,Check,CheckCircle2,ChevronLeft,ChevronRight,Clock3,Layers3,LockKeyhole,RefreshCw,RotateCcw,Sparkles,Target,Trophy,X,AlertCircle} from "lucide-react";
import "./vocabulary.css";

type Unit={id:string;day_number:number;source_kind:"reading"|"article";source_ordinal:number;unit_number:number;source_title:string;pass_mark:number;word_count:number;best_score:number|null;completed:boolean;attempts:number;in_progress:string|null};
type Word={id:string;lemma:string;display_word:string;meaning_uz:string;definition_en:string;level:string;example:string};
type Question={number:number;word:string;level:string;context:string;options:string[]};
type Attempt={id:string;status:"in_progress"|"completed"|"retry";attempt_no:number;score:number;answered:number;answers:{position:number;selected:number;correct_index:number;correct:boolean}[];questions:Question[]};
type Feedback={correct:boolean;correct_index:number;correct_meaning:string;score:number;answered:number;status:string};
const sourceOrder=(a:Unit,b:Unit)=>{
 const order=(u:Unit)=>u.source_kind==="article"?3:u.source_ordinal;
 return order(a)-order(b)||a.unit_number-b.unit_number;
};
const sourceLabel=(u:Unit)=>u.source_kind==="article"?"Article":"Reading · Passage "+u.source_ordinal;
const sourceClass=(u:Unit)=>u.source_kind==="article"?"article":u.source_ordinal===1?"reading1":"reading2";

export default function VocabularyPage(){
 const {day:sDay}=useParams<{day:string}>(),day=Number(sDay)||1;
 const [units,setUnits]=useState<Unit[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [currentUnit,setCurrentUnit]=useState<Unit|null>(null),[attempt,setAttempt]=useState<Attempt|null>(null);
 const [words,setWords]=useState<Word[]|null>(null),[panel,setPanel]=useState<"overview"|"study"|"quiz"|"result">("overview");
 const [feedback,setFeedback]=useState<(Feedback&{selected:number})|null>(null);
 const lock=useRef(false),nextTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const load=useCallback(async()=>{
  setLoading(true);try{const r=await fetch("/api/challenge-vocab?action=overview&day="+day,{cache:"no-store"}),d=await r.json();
   if(!r.ok)throw Error(d.error||"Could not load vocabulary");setUnits((d.units||[]).sort(sourceOrder));
  }catch(e){setError(String(e))}finally{setLoading(false)}
 },[day]);
 useEffect(()=>{load();return()=>{if(nextTimer.current)clearTimeout(nextTimer.current)}},[load]);
 async function openUnit(unit:Unit,mode:"study"|"quiz"){
  if(busy)return;setError("");setCurrentUnit(unit);setBusy(true);
  try{
   if(mode==="study"){const r=await fetch("/api/challenge-vocab?action=learn&unit="+unit.id,{cache:"no-store"}),x=await r.json();
    if(!r.ok)throw Error(x.error||"Word list unavailable");setWords(x.words);setPanel("study");
   }else if(unit.completed){setPanel("result");setAttempt(null)}
   else if(unit.in_progress){const r=await fetch("/api/challenge-vocab?action=attempt&id="+unit.in_progress,{cache:"no-store"}),x=await r.json();
    if(!r.ok)throw Error(x.error||"Could not resume quiz");setAttempt(x.attempt);setFeedback(null);setPanel("quiz");
   }else await start(unit);
  }catch(e){setError(String(e))}finally{setBusy(false)}
 }
 async function start(unit:Unit){
  const r=await fetch("/api/challenge-vocab",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"start",unit_id:unit.id})}),x=await r.json();
  if(!r.ok)throw Error(x.error||"Could not start");setAttempt(x.attempt);setFeedback(null);setPanel("quiz");
 }
 async function answer(choice:number){
  if(lock.current||busy||feedback||!attempt||attempt.answered>=20||attempt.status!=="in_progress")return;
  const index=attempt.answered;lock.current=true;
  try{
   const r=await fetch("/api/challenge-vocab",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"answer",attempt_id:attempt.id,position:index+1,choice})}),x=await r.json();
   if(!r.ok)throw Error(x.error||"Answer was not saved");
   const shown={...x,selected:choice} as Feedback&{selected:number};setFeedback(shown);
   nextTimer.current=setTimeout(()=>{
    setAttempt(old=>old?{...old,score:x.score,answered:x.answered,status:x.status,answers:[...old.answers,{position:index+1,selected:choice,correct_index:x.correct_index,correct:x.correct}]}:old);
    setFeedback(null);lock.current=false;
    if(x.answered===20){setPanel("result");void load();}
   },x.correct?700:1150);
  }catch(e){lock.current=false;setError(String(e))}
 }
 async function back(){
  if(nextTimer.current)clearTimeout(nextTimer.current);lock.current=false;setFeedback(null);setAttempt(null);setWords(null);setCurrentUnit(null);setPanel("overview");await load();
 }
 const current=attempt?.questions[attempt.answered],score=attempt?.score||0;
 const sectionGroups=useMemo(()=>{
  const out:{key:string;title:string;type:string;units:Unit[]}[]=[];
  for(const u of units){const key=u.source_kind+"-"+u.source_ordinal;let item=out.find(x=>x.key===key);
   if(!item){item={key,title:u.source_title,type:sourceLabel(u),units:[]};out.push(item)}item.units.push(u)}
  return out;
 },[units]);
 if(panel!=="overview"&&currentUnit){
  return <main className="vv-shell">
   <header className="vv-top"><AnimatedBackButton onClick={back}/><div className="vv-brand">ARK <b>EDUCATION</b><span> · VOCABULARY</span></div><span className="vv-top-tag">DAY {String(day).padStart(2,"0")}</span></header>
   {panel==="study"&&<div className="vv-inner vv-study">
    <div className="vv-eyebrow">STUDY YOUR WORDS</div><h1>{currentUnit.source_title} <span>Unit {currentUnit.unit_number}</span></h1>
    <p>Study all 20 unique words with Uzbek meanings and real context before starting the quiz.</p>
    <div className="vv-study-grid">{words?.map((w,i)=><article key={w.id}><div><span>{String(i+1).padStart(2,"0")}</span><b>{w.display_word}</b><em>{w.level}</em></div><h3>{w.meaning_uz}</h3>{w.definition_en&&<p>{w.definition_en}</p>}<small>{w.example}</small></article>)}</div>
    <div className="vv-study-actions"><button onClick={back}>Back to units</button><button className="vv-purple" onClick={async()=>{setBusy(true);try{await start(currentUnit)}catch(e){setError(String(e))}finally{setBusy(false)}}} disabled={busy}>Start 20-question quiz <ArrowRight size={17}/></button></div>
   </div>}
   {panel==="quiz"&&attempt&&current&&<div className="vv-inner vv-quiz">
     <div className="vv-quiz-top"><span className="vv-eyebrow">{sourceLabel(currentUnit)} · UNIT {String(currentUnit.unit_number).padStart(2,"0")}</span><span className="vv-quiz-count">QUESTION {attempt.answered+1} / 20</span></div>
     <div className="vv-quiz-progress"><i style={{width:(attempt.answered/20*100)+"%"}}/></div>
     <div className="vv-quiz-card"><div className="vv-quiz-badges"><span><Target size={16}/> Select the correct Uzbek meaning</span><b>{current.level}</b></div>
      <div className="vv-word-prompt"><span>WHAT DOES THIS WORD MEAN?</span><h1>{current.word}</h1></div>
      <div className="vv-quiz-options">{current.options.map((opt,i)=>{
       let state="";if(feedback){if(i===feedback.correct_index)state="right";else if(i===feedback.selected)state="wrong";else state="muted";}
       return <button key={i} disabled={!!feedback||busy} className={"vv-option "+state} onClick={()=>answer(i)}>
        <span className="vv-opt-letter">{String.fromCharCode(65+i)}</span><span className="vv-option-label">{opt}</span>{feedback&&i===feedback.correct_index?<CheckCircle2 size={21}/>:feedback&&i===feedback.selected?<X size={20}/>:null}
       </button>;
      })}</div>
      {feedback&&<div className={"vv-instant "+(feedback.correct?"yes":"no")} role="status">{feedback.correct?<><CheckCircle2 size={18}/> Correct! Moving to the next word…</>:<><AlertCircle size={18}/> Incorrect. The correct answer is highlighted in green.</>}</div>}
     </div>
     <div className="vv-quiz-bottom"><span><Sparkles size={16}/> {attempt.score+(feedback?.correct?1:0)} correct</span><span>{20-attempt.answered-(feedback?1:0)} remaining</span></div>
   </div>}
   {panel==="result"&&<div className="vv-inner vv-result">
     <div className={"vv-result-icon "+((attempt?.status==="completed"||currentUnit.completed)?"passed":"failed")}>{attempt?.status==="completed"||currentUnit.completed?<Trophy size={36}/>:<RotateCcw size={36}/>}</div>
     <div className="vv-eyebrow">{sourceLabel(currentUnit)} · UNIT {currentUnit.unit_number}</div>
     <h1>{attempt?.status==="completed"||currentUnit.completed?"Unit completed!":"One more attempt"}</h1>
     <p>{attempt?.status==="completed"||currentUnit.completed?"You reached the 18/20 requirement. This unit is now completed.":"You need at least 18 correct answers out of 20. Study your words and try again."}</p>
     <div className="vv-result-scores"><div><span>YOUR SCORE</span><strong>{attempt?.score??currentUnit.best_score??0}<small>/20</small></strong></div><div><span>PASS MARK</span><strong>18<small>/20</small></strong></div><div><span>ATTEMPTS</span><strong>{attempt?.attempt_no||currentUnit.attempts}</strong></div></div>
     <div className="vv-result-actions"><button onClick={back}>All units</button>{!(attempt?.status==="completed"||currentUnit.completed)&&<><button onClick={()=>openUnit(currentUnit,"study")}>Review 20 words</button><button className="vv-purple" onClick={async()=>{setBusy(true);try{await start(currentUnit)}catch(e){setError(String(e))}finally{setBusy(false)}}} disabled={busy}>Retry quiz <RefreshCw size={17}/></button></>}</div>
   </div>}
   {error&&<div className="vv-error" role="alert">{error}<button onClick={()=>setError("")}><X size={16}/></button></div>}
  </main>;
 }
 return <main className="vv-shell ch-layout vv-layout">
  <ChallengeSidebar day={day} active="Vocabulary"/>
  <div className="ch-page vv-page">
  <header className="vv-top"><AnimatedBackButton href={"/day/"+day}/><div className="vv-brand">ARK <b>EDUCATION</b><span> · VOCABULARY</span></div><span className="vv-top-tag">DAY {String(day).padStart(2,"0")}</span></header>
  <div className="vv-inner vv-overview">
   <div className="vv-intro"><div><span className="vv-eyebrow">60 DAY CHALLENGE · DAILY VOCABULARY</span><h1>Vocabulary Practice</h1><p>Every word is unique across the 60-day course. Study and master each 20-word unit at 18/20 or above.</p><div className="vv-intro-chips"><span><Bookmark size={15}/> 40 new words per source</span><span><Layers3 size={15}/> 20 per unit</span><span><Target size={15}/> 90% to complete</span></div></div><div className="vv-intro-stat"><span>YOUR PROGRESS</span><b>{units.filter(u=>u.completed).length}<small> / {units.length}</small></b><div><i style={{width:(units.length?units.filter(u=>u.completed).length/units.length*100:0)+"%"}}/></div><small>Units completed</small></div></div>
   {loading?<div className="vv-empty">Loading your vocabulary units…</div>:!units.length?<div className="vv-empty"><LockKeyhole size={27}/><h2>Vocabulary is being prepared</h2><p>No published units are available for this day yet.</p></div>:sectionGroups.map(group=><section className="vv-group" key={group.key}>
     <div className="vv-group-heading"><div><span className="vv-eyebrow">{group.type.toUpperCase()}</span><h2>{group.title}</h2><p>40 unique B2+/C1 words · two 20-question quizzes</p></div><span className="vv-group-status">{group.units.filter(u=>u.completed).length}/2 complete</span></div>
     <div className="vv-unit-grid">{group.units.map(u=><article className={"vv-unit "+sourceClass(u)} key={u.id}><div className="vv-unit-top"><span>{u.source_kind==="article"?<Bookmark size={21}/>:<BookOpen size={21}/>}</span><span className={"vv-unit-badge "+(u.completed?"done":u.in_progress?"doing":"")}>{u.completed?"Completed":u.in_progress?"In progress":"Available"}</span></div>
        <h3>Unit {String(u.unit_number).padStart(2,"0")}</h3><div className="vv-unit-sub">20 vocabulary words · 20 questions</div><div className="vv-unit-score"><span>{u.best_score===null?"Not attempted":"Best: "+u.best_score+"/20"}</span><span>{u.attempts} attempts</span></div>
        <div className="vv-unit-actions"><button onClick={()=>openUnit(u,"study")}><BookOpen size={15}/> Study</button>{u.completed?<button className="vv-done" disabled><Check size={16}/> Completed</button>:<button className="vv-start" disabled={busy} onClick={()=>openUnit(u,"quiz")}>{u.in_progress?"Resume":"Start Quiz"} <ArrowRight size={16}/></button>}</div>
     </article>)}</div>
    </section>)}
   {error&&<div className="vv-error" role="alert">{error}<button onClick={()=>setError("")}><X size={16}/></button></div>}
  </div>
  </div>
 </main>;
}
