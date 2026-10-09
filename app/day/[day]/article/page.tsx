"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {useParams} from "next/navigation";
import AnimatedBackButton from "../../../components/animated-back-button";
import StudyTimeHeartbeat from "../../../components/study-time-heartbeat";
import {BookOpen,Bookmark,CheckCircle2,ArrowRight,AlertCircle,X,Leaf} from "lucide-react";
import "./article.css";

type Page={page:number;heading:string;paragraphs:string[];callouts:{title:string;text:string}[];illustration?:string};
type Word={id:string;lemma:string;display_word:string;meaning_uz:string;definition_en:string;level:string;example:string};
type Data={article:{title:string;deck:string;byline:string;sections:Page[]};progress:{visited_pages:number[];last_page:number;completed_at:string|null};glossary:Word[];preview?:boolean};
const escapeRE=(s:string)=>s.replace(/[\[\]{}()*+?.\\^$|]/g,"\\$&");

export default function ArticlePage(){
 const {day:rawDay}=useParams<{day:string}>(),day=Number(rawDay)||1;
 const [data,setData]=useState<Data|null>(null),[page,setPage]=useState(0),[tab,setTab]=useState<"article"|"vocab">("article"),[visitQueue,setVisitQueue]=useState<number[]>([]);
 const [popup,setPopup]=useState<{word:Word;x:number;y:number}|null>(null),[menu,setMenu]=useState<{x:number;y:number}|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [glossaryQuery,setGlossaryQuery]=useState("");
 const reader=useRef<HTMLDivElement>(null),chosen=useRef<Range|null>(null),sectionNodes=useRef(new Map<number,HTMLElement>()),savedPages=useRef(new Set<number>()),queuedPages=useRef(new Set<number>()),savingVisit=useRef(false),restoredReader=useRef(false);
 useEffect(()=>{let alive=true;fetch("/api/challenge-article?day="+day,{cache:"no-store"}).then(async r=>{const x=await r.json();if(!r.ok)throw Error(x.error||"Article not found");if(alive){setData(x);savedPages.current=new Set(x.progress?.visited_pages||[]);setPage(Math.min(Math.max(0,(x.article?.sections?.length||1)-1),Math.max(0,(x.progress.last_page||1)-1)));}}).catch(e=>alive&&setError(String(e))).finally(()=>alive&&setLoading(false));return()=>{alive=false}},[day]);
 const words=data?.glossary||[];
  const visibleWords=words.map((word,index)=>({word,index})).filter(({word})=>!glossaryQuery.trim()||[word.display_word,word.lemma,word.meaning_uz,word.definition_en].some(value=>String(value||"").toLocaleLowerCase().includes(glossaryQuery.trim().toLocaleLowerCase())));
 const dictionary=useMemo(()=>new Map(words.map(w=>[w.display_word.toLowerCase(),w])),[words]);
 const pattern=useMemo(()=>words.length?new RegExp("("+words.map(w=>escapeRE(w.display_word)).sort((a,b)=>b.length-a.length).join("|")+")","gi"):null,[words]);
 function rich(s:string){if(!pattern)return s;return s.split(pattern).map((part,i)=>{
  const w=dictionary.get(part.toLowerCase());return w?<button key={i} type="button" className="aa-word" onClick={e=>{e.stopPropagation();const r=e.currentTarget.getBoundingClientRect();setPopup({word:w,x:Math.min(innerWidth-310,Math.max(12,r.left)),y:r.bottom+255>innerHeight?Math.max(61,r.top-251):r.bottom+9})}}>{part}</button>:<span key={i}>{part}</span>;
 });}
 function visit(n:number){
  if(!data||n<0||n>=data.article.sections.length)return;
  setPage(n);
  const pageNumber=n+1;
  if(savedPages.current.has(pageNumber)||queuedPages.current.has(pageNumber))return;
  queuedPages.current.add(pageNumber);
  if(data.preview){
   savedPages.current.add(pageNumber);
   setData(old=>old?{...old,progress:{...old.progress,last_page:Math.max(old.progress.last_page,pageNumber),visited_pages:[...new Set([...old.progress.visited_pages,pageNumber])].sort((x,y)=>x-y)}}:old);
   return;
  }
  setVisitQueue(queue=>[...queue,pageNumber]);
 }
 useEffect(()=>{
  if(!data||data.preview||!visitQueue.length||savingVisit.current)return;
  const pageNumber=visitQueue[0];
  savingVisit.current=true;
  setBusy(true);
  void (async()=>{
   try{
    const r=await fetch("/api/challenge-article",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"page",day,page:pageNumber})});
    const x=await r.json();
    if(!r.ok)throw Error(x.error||"Could not save progress");
    savedPages.current.add(pageNumber);
    setData(old=>old?{...old,progress:x.progress}:old);
   }catch(e){
    queuedPages.current.delete(pageNumber);
    setError(String(e));
   }finally{
    queuedPages.current.delete(pageNumber);
    savingVisit.current=false;
    setVisitQueue(queue=>queue.filter(n=>n!==pageNumber));
    setBusy(false);
   }
  })();
 },[visitQueue,data]);
 useEffect(()=>{
  if(!data||typeof IntersectionObserver==="undefined")return;
  const observer=new IntersectionObserver(entries=>{
   const active=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>{
    const center=innerHeight*.42;
    return Math.abs(a.boundingClientRect.top-center)-Math.abs(b.boundingClientRect.top-center);
   })[0];
   if(!active)return;
   const pageNumber=Number((active.target as HTMLElement).dataset.articleSection);
   if(Number.isInteger(pageNumber)&&pageNumber>0){
    setPage(pageNumber-1);
    visit(pageNumber-1);
   }
  },{root:null,rootMargin:"-30% 0px -55% 0px",threshold:0});
  sectionNodes.current.forEach(node=>observer.observe(node));
  return()=>observer.disconnect();
 },[data?.article.title]);
 useEffect(()=>{
  if(!data||restoredReader.current)return;
  restoredReader.current=true;
  const lastPage=Number(data.progress.last_page||0);
  if(lastPage>0)window.requestAnimationFrame(()=>sectionNodes.current.get(lastPage)?.scrollIntoView({block:"start"}));
 },[data?.article.title]);
 async function complete(){if(!data||busy)return;if(data.preview){if(data.progress.visited_pages.length<data.article.sections.length){setError("Read all pages");return}setData(o=>o?{...o,progress:{...o.progress,completed_at:new Date().toISOString()}}:o);return}setBusy(true);try{const r=await fetch("/api/challenge-article",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"finish",day})});const x=await r.json();if(!r.ok)throw Error(x.error||"Read all pages");setData(o=>o?{...o,progress:x.progress}:o);}catch(e){setError(String(e))}finally{setBusy(false)}}
 function switchTab(next:"article"|"vocab"){
  setTab(next);setPopup(null);setMenu(null);
  window.requestAnimationFrame(()=>document.getElementById("aa-reading-workspace")?.scrollIntoView({behavior:"smooth",block:"start"}));
 }
 function selectedText(){const s=getSelection();if(!s||s.isCollapsed||!s.rangeCount)return;const r=s.getRangeAt(0);if(!reader.current?.contains(r.commonAncestorContainer))return;const rect=r.getBoundingClientRect();chosen.current=r.cloneRange();setMenu({x:Math.max(100,Math.min(innerWidth-100,rect.left+rect.width/2)),y:Math.max(60,rect.top-52)});}
 function highlight(color:"yellow"|"green"|"erase"){
  const range=chosen.current,h=window.CSS?.highlights;if(!range||!h)return;
  if(color==="erase"){for(const k of ["aa-yellow","aa-green"]){const o=h.get(k);if(!o)continue;const keep=Array.from(o).filter(r=>!(r instanceof Range&&r.compareBoundaryPoints(Range.END_TO_START,range)>0&&r.compareBoundaryPoints(Range.START_TO_END,range)<0));if(keep.length)h.set(k,new Highlight(...keep));else h.delete(k);}}
  else{const k=color==="yellow"?"aa-yellow":"aa-green",o=h.get(k);h.set(k,o?new Highlight(...Array.from(o),range.cloneRange()):new Highlight(range.cloneRange()));}
  getSelection()?.removeAllRanges();chosen.current=null;setMenu(null);
 }
 useEffect(()=>{const f=(e:KeyboardEvent)=>{if(e.key==="Escape"){setPopup(null);setMenu(null)}};window.addEventListener("keydown",f);return()=>window.removeEventListener("keydown",f)},[]);
 if(loading)return <main className="aa-shell"><div className="aa-loading">Loading the article…</div></main>;
 if(!data)return <main className="aa-shell"><div className="aa-loading"><AnimatedBackButton href={"/day/"+day}/><p>{error||"Article unavailable"}</p></div></main>;
 const article=data.article,pages=article.sections,read=data.progress.visited_pages.length,completed=!!data.progress.completed_at,readyToFinish=read===pages.length&&!completed;
 
 return <main className="aa-shell" onClick={()=>popup&&setPopup(null)}><StudyTimeHeartbeat day={day} module="article"/>
  <header className="aa-header"><AnimatedBackButton href={"/day/"+day}/><span className="aa-brand">ARK <b>EDUCATION</b><em> · ARTICLE CDI</em></span><span className="aa-day">DAY {String(day).padStart(2,"0")}</span></header>
  <div className="aa-container">
   <section className="aa-hero"><div className="aa-hero-text"><span className="aa-kicker">DAY {String(day).padStart(2,"0")} · DAILY ARTICLE</span><h1>{article.title}</h1><p>{rich(article.deck)}</p><div className="aa-hero-meta">BY {article.byline}<span>{pages.length} sections</span><span>{words.length} vocabulary words</span></div></div></section>
   <div className="aa-work-title">
    <div className="aa-work-copy"><span className="aa-kicker">READING WORKSPACE</span><h2>Article &amp; glossary</h2></div>
    <div className="aa-work-actions" aria-live="polite">
     <span className={"aa-progress-label "+(completed?"aa-completed-label":"")}>{completed?<><CheckCircle2 size={16}/> Article completed</>:<><BookOpen size={16}/> {read}/{pages.length} read</>}</span>
     {readyToFinish&&<button type="button" className="aa-finish-cta" onClick={complete} disabled={busy}><CheckCircle2 size={16}/>{busy?"Saving…":"Finish Article"}</button>}
     {completed&&<Link className="aa-work-vocab" href={"/day/"+day+"/vocabulary"}>Vocabulary <ArrowRight size={15}/></Link>}
    </div>
   </div>
   <div className="aa-progress-rail"><i style={{width:(read/pages.length*100)+"%"}}/></div>
   <div className="aa-mobile-tabs"><button className={tab==="article"?"active":""} onClick={()=>switchTab("article")}><BookOpen size={15}/> Article</button><button className={tab==="vocab"?"active":""} onClick={()=>switchTab("vocab")}><Bookmark size={15}/> Vocabulary</button></div>
   <div id="aa-reading-workspace" className="aa-grid">
    <div ref={reader} className={"aa-reader "+(tab==="article"?"aa-mobile-visible":"")} onMouseUp={selectedText} onTouchEnd={()=>setTimeout(selectedText,100)}>
     <div className="aa-reader-toolbar">
      <div className="aa-reader-navigation"><span className="aa-reader-page-title"><BookOpen size={15}/> SECTION {String(page+1).padStart(2,"0")} <i>OF {String(pages.length).padStart(2,"0")}</i></span></div>
      
     </div>
     {pages.map((section,i)=><section key={section.page} className="aa-article-section" data-article-section={section.page} id={"aa-section-"+section.page} ref={node=>{if(node)sectionNodes.current.set(section.page,node);else sectionNodes.current.delete(section.page);}}>
      <div className="aa-section-heading"><h2>{section.heading}</h2></div>
      {section.paragraphs.map((p,i)=><p className="aa-text" key={i}>{rich(p)}</p>)}
      {section.callouts.length>0&&<div className="aa-callout-box"><div className="aa-callout-head"><Leaf size={16}/> MORE FROM THE ARTICLE</div>{section.callouts.map((c,i)=><div key={i} className="aa-callout"><h3>{c.title}</h3><p>{rich(c.text)}</p></div>)}</div>}
     </section>)}
     <div className="aa-reader-nav"><span>{read}/{pages.length} sections read</span>
      {readyToFinish&&<button className="aa-next" disabled={busy} onClick={complete}><CheckCircle2 size={16}/>{busy?"Saving…":"Finish Article"}</button>}
      {completed&&<Link className="aa-next" href={"/day/"+day+"/vocabulary"}>Open Vocabulary <ArrowRight size={16}/></Link>}
     </div>
    </div>
    <aside className={"aa-vocab "+(tab==="vocab"?"aa-mobile-visible":"")}><div className="aa-vocab-head"><span className="aa-kicker">B2+ / C1 · IN CONTEXT</span><h2>Interactive glossary</h2><p>Tap underlined words in the article for Uzbek meanings and English explanations.</p></div>
      <label className="aa-vocab-search"><span className="aa-sr-only">Search vocabulary</span><input type="search" placeholder="Search vocabulary…" aria-label="Search vocabulary" value={glossaryQuery} onChange={e=>setGlossaryQuery(e.target.value)}/></label><div className="aa-words" aria-label="Article vocabulary">{visibleWords.map(({word:w,index:i})=><button key={w.id} onClick={e=>{e.stopPropagation();const r=e.currentTarget.getBoundingClientRect();setPopup({word:w,x:Math.min(innerWidth-310,Math.max(12,r.left)),y:r.bottom+255>innerHeight?Math.max(61,r.top-251):r.bottom+9})}}><span className="aa-index">{String(i+1).padStart(2,"0")}</span><span><b>{w.display_word}</b><small>{w.meaning_uz}</small></span><em>{w.level}</em></button>)}{visibleWords.length===0&&<p className="aa-vocab-empty">No matching words.</p>}</div>
      <div className="aa-side-footer"><p>{Math.ceil(words.length/20)} units · 20 words each · Pass at 18/20</p><Link href={"/day/"+day+"/vocabulary"}>Open Vocabulary <ArrowRight size={16}/></Link></div>
    </aside>
   </div>
   {error&&<div className="aa-alert" role="alert"><AlertCircle size={17}/>{error}<button onClick={()=>setError("")} aria-label="Dismiss"><X size={17}/></button></div>}
   {popup&&<div className="aa-definition" role="dialog" aria-label={"Meaning of "+popup.word.display_word} style={{left:popup.x,top:popup.y}} onClick={e=>e.stopPropagation()}><div><strong>{popup.word.display_word}</strong><em>{popup.word.level}</em><button onClick={()=>setPopup(null)} aria-label="Close"><X size={17}/></button></div><h3>{popup.word.meaning_uz}</h3><p>{popup.word.definition_en}</p><small>{popup.word.example}</small></div>}
   {menu&&<div className="aa-mark-menu" style={{left:menu.x,top:menu.y}} onMouseDown={e=>e.preventDefault()} role="toolbar" aria-label="Highlight selection"><button onClick={()=>highlight("yellow")} aria-label="Yellow highlight"><i className="yellow"/></button><button onClick={()=>highlight("green")} aria-label="Green highlight"><i className="green"/></button><button onClick={()=>highlight("erase")} aria-label="Remove highlight"><X size={16}/></button></div>}
  </div>
 </main>;
}
