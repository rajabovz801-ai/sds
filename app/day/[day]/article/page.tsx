"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {useParams} from "next/navigation";
import AnimatedBackButton from "../../../components/animated-back-button";
import {BookOpen,Bookmark,CheckCircle2,ChevronLeft,ChevronRight,ArrowRight,AlertCircle,X,Highlighter,Leaf} from "lucide-react";
import "./article.css";

type Page={page:number;heading:string;paragraphs:string[];callouts:{title:string;text:string}[];illustration?:string};
type Word={id:string;lemma:string;display_word:string;meaning_uz:string;definition_en:string;level:string;example:string};
type Data={article:{title:string;deck:string;byline:string;sections:Page[]};progress:{visited_pages:number[];last_page:number;completed_at:string|null};glossary:Word[]};
const escapeRE=(s:string)=>s.replace(/[\[\]{}()*+?.\\^$|]/g,"\\$&");

function RoomArt(){return <svg viewBox="0 0 440 270" role="img" aria-label="Stylized tidy room illustration with books, boxes and a houseplant" className="aa-art">
 <ellipse cx="236" cy="133" rx="174" ry="118" fill="#ffd0d1"/>
 <rect x="40" y="38" width="146" height="182" rx="9" fill="#cd7b73"/><rect x="48" y="46" width="130" height="166" rx="5" fill="#fff2ef"/>
 <path d="M55 125h116M55 188h116" stroke="#dcb3a6" strokeWidth="9"/>
 <rect x="63" y="68" width="25" height="49" rx="2" fill="#7eb3a6"/><rect x="94" y="78" width="27" height="39" rx="2" fill="#f4b5a4"/><rect x="128" y="61" width="25" height="56" rx="2" fill="#eab99d"/>
 <rect x="63" y="148" width="27" height="33" fill="#cf9591"/><rect x="97" y="136" width="27" height="45" fill="#9ec8a7"/><rect x="131" y="153" width="24" height="28" fill="#e5bb87"/>
 <path d="M331 137c-26-60-18-80 2-119 20 47 23 68 10 100 29-40 41-50 70-52-9 49-35 71-65 85" fill="#467d5a"/>
 <path d="M331 136c3-31 6-55 6-79m4 89 43-52" stroke="#2e6244" strokeWidth="4" fill="none"/>
 <path d="M302 150h77l-10 59h-57z" fill="#ee8a7d"/><path d="M303 150h75" stroke="#d6756d" strokeWidth="7"/>
 <rect x="202" y="179" width="101" height="67" rx="5" fill="#f09d8e"/><path d="M250 180v64" stroke="#fbd9c4" strokeWidth="9"/>
 <rect x="314" y="213" width="92" height="34" rx="5" fill="#eebfa7"/><path d="M357 213v33" stroke="#fff2e5" strokeWidth="7"/>
 <circle cx="227" cy="95" r="21" fill="#efbc9d"/><path d="M207 85q15-33 40-8l3 17q-17-8-40-6" fill="#3f483d"/>
 <path d="M205 128q21-16 46 0l4 56h-47z" fill="#f6f5ed"/><path d="M214 135q-16 28 14 37l26 9" fill="none" stroke="#edba9e" strokeWidth="11" strokeLinecap="round"/>
 <path d="M215 183l-5 61h18l17-59m0-1 15 60h18l-10-60" fill="#cd6258"/>
 <path d="M206 245h28m20 0h29" stroke="#493f3b" strokeWidth="9" strokeLinecap="round"/>
 <rect x="22" y="248" width="399" height="7" rx="4" fill="#ddb8ad"/>
 </svg>}

function SectionArt({kind}:{kind?:string}){
 const common={className:"aa-section-art",viewBox:"0 0 360 170",role:"img" as const,"aria-hidden":true};
 if(kind==="plant")return <svg {...common}><rect x="18" y="25" width="324" height="120" rx="18" fill="#f2efff"/><ellipse cx="178" cy="132" rx="90" ry="12" fill="#d8d1f2"/><path d="M177 125c-5-46 5-75 21-103 15 31 13 61-6 87 22-27 44-38 73-34-10 37-33 55-65 57" fill="#62a77a"/><path d="M174 125c-15-40-40-58-68-63 3 38 26 64 63 70" fill="#7dbc91"/><path d="M145 112h70l-9 35h-53z" fill="#de837a"/><circle cx="82" cy="63" r="22" fill="#ffd6c9"/><path d="M62 91c18-17 40-17 58 0l-5 45H66z" fill="#fff"/><path d="M67 74q14-26 31-5" stroke="#3f463d" strokeWidth="9" strokeLinecap="round"/></svg>;
 if(kind==="donation")return <svg {...common}><rect x="17" y="22" width="326" height="126" rx="18" fill="#fff3e7"/><rect x="104" y="67" width="151" height="70" rx="8" fill="#e8aa75"/><path d="M104 68l76 38 75-38-76-33z" fill="#f0c39b"/><path d="M180 106v31" stroke="#fff2df" strokeWidth="7"/><path d="M128 57l31-21m72 21-31-21" stroke="#9c6a4e" strokeWidth="5" strokeLinecap="round"/><circle cx="295" cy="50" r="19" fill="#f3b3bd"/><path d="M286 50l7 7 13-16" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
 if(kind==="shelf")return <svg {...common}><rect x="17" y="23" width="326" height="124" rx="18" fill="#eef7f2"/><rect x="77" y="42" width="206" height="93" rx="6" fill="#d9b8a0"/><path d="M83 82h194" stroke="#fff0e7" strokeWidth="8"/><rect x="94" y="50" width="19" height="27" fill="#8fb8a0"/><rect x="119" y="55" width="25" height="22" fill="#e79c91"/><rect x="151" y="46" width="18" height="31" fill="#d9c37d"/><rect x="94" y="92" width="44" height="33" rx="3" fill="#f4c38f"/><path d="M205 112c-15-33-9-49 3-69 11 24 11 42 1 59 15-18 30-25 48-22-8 24-25 34-46 38" fill="#5b9870"/><path d="M190 111h45l-6 22h-33z" fill="#d9766c"/></svg>;
 if(kind==="boxes")return <svg {...common}><rect x="17" y="22" width="326" height="126" rx="18" fill="#fff0ef"/><rect x="65" y="83" width="95" height="53" rx="6" fill="#efb58d"/><path d="M112 83v53" stroke="#fff1df" strokeWidth="7"/><rect x="177" y="61" width="116" height="75" rx="7" fill="#d98779"/><path d="M235 62v73" stroke="#fbd4c5" strokeWidth="8"/><path d="M179 61l55-29 58 29" fill="#f1b09f"/><path d="M88 74l24-17 24 17" stroke="#a8785c" strokeWidth="5" fill="none"/></svg>;
 return <svg {...common}><rect x="17" y="22" width="326" height="126" rx="18" fill="#f4f2fb"/><rect x="64" y="39" width="91" height="92" rx="6" fill="#c98279"/><rect x="71" y="46" width="77" height="78" rx="3" fill="#fff2ef"/><path d="M77 81h65" stroke="#dfbbb0" strokeWidth="7"/><rect x="91" y="54" width="17" height="23" fill="#76aa8b"/><rect x="113" y="59" width="19" height="18" fill="#e4a188"/><rect x="195" y="86" width="78" height="50" rx="6" fill="#f0a28f"/><path d="M234 86v50" stroke="#f8dacb" strokeWidth="7"/><path d="M276 103c-8-31 1-49 17-67 9 27 6 47-7 63 15-16 30-21 47-15-8 20-24 30-43 31" fill="#4f8b66"/></svg>;
}


export default function ArticlePage(){
 const {day:rawDay}=useParams<{day:string}>(),day=Number(rawDay)||1;
 const [data,setData]=useState<Data|null>(null),[page,setPage]=useState(0),[tab,setTab]=useState<"article"|"vocab">("article");
 const [popup,setPopup]=useState<{word:Word;x:number;y:number}|null>(null),[menu,setMenu]=useState<{x:number;y:number}|null>(null);
 const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const reader=useRef<HTMLDivElement>(null),chosen=useRef<Range|null>(null);
 useEffect(()=>{let alive=true;fetch("/api/challenge-article?day="+day,{cache:"no-store"}).then(async r=>{const x=await r.json();if(!r.ok)throw Error(x.error||"Article not found");if(alive){setData(x);setPage(Math.min(4,Math.max(0,(x.progress.last_page||1)-1)));}}).catch(e=>alive&&setError(String(e))).finally(()=>alive&&setLoading(false));return()=>{alive=false}},[day]);
 const words=data?.glossary||[];
 const dictionary=useMemo(()=>new Map(words.map(w=>[w.display_word.toLowerCase(),w])),[words]);
 const pattern=useMemo(()=>words.length?new RegExp("("+words.map(w=>escapeRE(w.display_word)).sort((a,b)=>b.length-a.length).join("|")+")","gi"):null,[words]);
 function rich(s:string){if(!pattern)return s;return s.split(pattern).map((part,i)=>{
  const w=dictionary.get(part.toLowerCase());return w?<button key={i} type="button" className="aa-word" onClick={e=>{e.stopPropagation();const r=e.currentTarget.getBoundingClientRect();setPopup({word:w,x:Math.min(innerWidth-310,Math.max(12,r.left)),y:r.bottom+255>innerHeight?Math.max(61,r.top-251):r.bottom+9})}}>{part}</button>:<span key={i}>{part}</span>;
 });}
 async function visit(n:number){
  if(!data||busy||n<0||n>=data.article.sections.length)return;
  setPage(n);setTab("article");setPopup(null);reader.current?.scrollTo({top:0});
  if(data.progress.visited_pages.includes(n+1))return;
  setBusy(true);try{
   const r=await fetch("/api/challenge-article",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"page",day,page:n+1})});const x=await r.json();
   if(!r.ok)throw Error(x.error||"Could not save progress");setData(old=>old?{...old,progress:x.progress}:old);
  }catch(e){setError(String(e))}finally{setBusy(false)}
 }
 useEffect(()=>{if(data&&!data.progress.visited_pages.includes(page+1)&&!busy)void visit(page)},[data?.article.title]);
 async function complete(){if(!data||busy)return;setBusy(true);try{const r=await fetch("/api/challenge-article",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"finish",day})});const x=await r.json();if(!r.ok)throw Error(x.error||"Read all pages");setData(o=>o?{...o,progress:x.progress}:o);}catch(e){setError(String(e))}finally{setBusy(false)}}
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
 const article=data.article,pages=article.sections,current=pages[page],read=data.progress.visited_pages.length,completed=!!data.progress.completed_at,readyToFinish=read===pages.length&&!completed;
 return <main className="aa-shell" onClick={()=>popup&&setPopup(null)}>
  <header className="aa-header"><AnimatedBackButton href={"/day/"+day}/><span className="aa-brand">ARK <b>EDUCATION</b><em> · ARTICLE CDI</em></span><span className="aa-day">DAY {String(day).padStart(2,"0")}</span></header>
  <div className="aa-container">
   <section className="aa-hero"><div className="aa-hero-text"><span className="aa-kicker">DAY {String(day).padStart(2,"0")} · DAILY ARTICLE</span><h1>{article.title}</h1><p>{rich(article.deck)}</p><div className="aa-hero-meta">BY {article.byline}<span>{pages.length} pages</span><span>{words.length} interactive words</span></div></div><RoomArt/></section>
   <div className="aa-work-title">
    <div className="aa-work-copy"><span className="aa-kicker">YOUR READING WORKSPACE</span><h2>Read, explore and remember</h2></div>
    <div className="aa-work-actions" aria-live="polite">
     <span className={"aa-progress-label "+(completed?"aa-completed-label":"")}>{completed?<><CheckCircle2 size={16}/> Article completed</>:<><BookOpen size={16}/> {read}/{pages.length} pages</>}</span>
     {readyToFinish&&<button type="button" className="aa-finish-cta" onClick={complete} disabled={busy}><CheckCircle2 size={16}/>{busy?"Saving…":"Finish Article"}</button>}
     {completed&&<Link className="aa-work-vocab" href={"/day/"+day+"/vocabulary"}>Vocabulary <ArrowRight size={15}/></Link>}
    </div>
   </div>
   <div className="aa-progress-rail"><i style={{width:(read/pages.length*100)+"%"}}/></div>
   <div className="aa-mobile-tabs"><button className={tab==="article"?"active":""} onClick={()=>setTab("article")}><BookOpen size={15}/> Article</button><button className={tab==="vocab"?"active":""} onClick={()=>setTab("vocab")}><Bookmark size={15}/> Vocabulary</button></div>
   <div className="aa-grid">
    <div ref={reader} className={"aa-reader "+(tab==="article"?"aa-mobile-visible":"")} onMouseUp={selectedText} onTouchEnd={()=>setTimeout(selectedText,100)}>
     <div className="aa-reader-toolbar">
      <div className="aa-reader-navigation"><span className="aa-reader-page-title"><BookOpen size={15}/> PAGES</span>
       <nav className="aa-pages" aria-label="Article page navigation">{pages.map((p,i)=><button key={p.page} type="button" onClick={()=>visit(i)} disabled={busy} aria-current={i===page?"page":undefined} aria-label={"Page "+(i+1)+(data.progress.visited_pages.includes(i+1)?", read":"")} className={i===page?"active":data.progress.visited_pages.includes(i+1)?"visited":""}>{String(i+1).padStart(2,"0")}</button>)}</nav>
      </div>
      <span className="aa-highlight-hint"><Highlighter size={15}/> Select text for highlight</span>
     </div>
     <div className="aa-section-heading"><div><h2>{current.heading}</h2><div className="aa-original">ORIGINAL ARTICLE · PAGE {current.page}</div></div><SectionArt kind={current.illustration}/></div>
     {current.paragraphs.map((p,i)=><p className="aa-text" key={i}>{rich(p)}</p>)}
     <div className="aa-callout-box"><div className="aa-callout-head"><Leaf size={16}/> MORE FROM THE ARTICLE</div>{current.callouts.map((c,i)=><div key={i} className="aa-callout"><h3>{c.title}</h3><p>{rich(c.text)}</p></div>)}</div>
     <div className="aa-reader-nav"><button onClick={()=>visit(page-1)} disabled={page===0||busy}><ChevronLeft size={16}/> Previous</button>
      {page<pages.length-1?<button className="aa-next" onClick={()=>visit(page+1)} disabled={busy}>Next page <ChevronRight size={16}/></button>:completed?<Link className="aa-next" href={"/day/"+day+"/vocabulary"}>Open Vocabulary <ArrowRight size={16}/></Link>:<button className="aa-next" disabled={busy||!readyToFinish} onClick={complete}><CheckCircle2 size={16}/>{busy?"Saving…":"Finish Article"}</button>}
     </div>
     {page===pages.length-1&&readyToFinish&&<p className="aa-finish-note">All {pages.length} pages have been visited. Select Finish Article to save your completion.</p>}
    </div>
    <aside className={"aa-vocab "+(tab==="vocab"?"aa-mobile-visible":"")}><div className="aa-vocab-head"><span className="aa-kicker">B2+ / C1 · IN CONTEXT</span><h2>Interactive glossary</h2><p>Tap underlined words in the article for Uzbek meanings and English explanations.</p></div>
      <div className="aa-words" aria-label="Article vocabulary">{words.map((w,i)=><button key={w.id} onClick={e=>{e.stopPropagation();const r=e.currentTarget.getBoundingClientRect();setPopup({word:w,x:Math.min(innerWidth-310,Math.max(12,r.left)),y:r.bottom+255>innerHeight?Math.max(61,r.top-251):r.bottom+9})}}><span className="aa-index">{String(i+1).padStart(2,"0")}</span><span><b>{w.display_word}</b><small>{w.meaning_uz}</small></span><em>{w.level}</em></button>)}</div>
      <div className="aa-side-footer"><p>{Math.ceil(words.length/20)} units · 20 words each · Pass at 18/20</p><Link href={"/day/"+day+"/vocabulary"}>Open Vocabulary <ArrowRight size={16}/></Link></div>
    </aside>
   </div>
   {error&&<div className="aa-alert" role="alert"><AlertCircle size={17}/>{error}<button onClick={()=>setError("")} aria-label="Dismiss"><X size={17}/></button></div>}
   {popup&&<div className="aa-definition" role="dialog" aria-label={"Meaning of "+popup.word.display_word} style={{left:popup.x,top:popup.y}} onClick={e=>e.stopPropagation()}><div><strong>{popup.word.display_word}</strong><em>{popup.word.level}</em><button onClick={()=>setPopup(null)} aria-label="Close"><X size={17}/></button></div><h3>{popup.word.meaning_uz}</h3><p>{popup.word.definition_en}</p><small>{popup.word.example}</small></div>}
   {menu&&<div className="aa-mark-menu" style={{left:menu.x,top:menu.y}} onMouseDown={e=>e.preventDefault()} role="toolbar" aria-label="Highlight selection"><button onClick={()=>highlight("yellow")} aria-label="Yellow highlight"><i className="yellow"/></button><button onClick={()=>highlight("green")} aria-label="Green highlight"><i className="green"/></button><button onClick={()=>highlight("erase")} aria-label="Remove highlight"><X size={16}/></button></div>}
  </div>
 </main>;
}
