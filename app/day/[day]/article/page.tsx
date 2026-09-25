"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {useParams} from "next/navigation";
import AnimatedBackButton from "../../../components/animated-back-button";
import {BookOpen,Bookmark,CheckCircle2,ChevronLeft,ChevronRight,ArrowRight,AlertCircle,X,Highlighter,Leaf} from "lucide-react";
import "./article.css";

type Page={page:number;heading:string;paragraphs:string[];callouts:{title:string;text:string}[]};
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
 const article=data.article,pages=article.sections,current=pages[page],read=data.progress.visited_pages.length,completed=!!data.progress.completed_at;
 return <main className="aa-shell" onClick={()=>popup&&setPopup(null)}>
  <header className="aa-header"><AnimatedBackButton href={"/day/"+day}/><span className="aa-brand">ARK <b>EDUCATION</b><em> · ARTICLE CDI</em></span><span className="aa-day">DAY {String(day).padStart(2,"0")}</span></header>
  <div className="aa-container">
   <section className="aa-hero"><div className="aa-hero-text"><span className="aa-kicker">DAY {String(day).padStart(2,"0")} · DAILY ARTICLE</span><h1>{article.title}</h1><p>{rich(article.deck)}</p><div className="aa-hero-meta">BY {article.byline}<span>5 pages</span><span>40 interactive words</span></div></div><RoomArt/></section>
   <div className="aa-work-title"><div><span className="aa-kicker">YOUR READING WORKSPACE</span><h2>Read, explore and remember</h2></div><span className="aa-progress-label">{completed?<><CheckCircle2 size={16}/> Completed</>:<><BookOpen size={16}/> {read}/{pages.length} pages</>}</span></div>
   <div className="aa-progress-rail"><i style={{width:(read/pages.length*100)+"%"}}/></div>
   <div className="aa-mobile-tabs"><button className={tab==="article"?"active":""} onClick={()=>setTab("article")}><BookOpen size={15}/> Article</button><button className={tab==="vocab"?"active":""} onClick={()=>setTab("vocab")}><Bookmark size={15}/> Vocabulary</button></div>
   <div className="aa-grid">
    <div ref={reader} className={"aa-reader "+(tab==="article"?"aa-mobile-visible":"")} onMouseUp={selectedText} onTouchEnd={()=>setTimeout(selectedText,100)}>
     <div className="aa-reader-top"><span><BookOpen size={16}/> PAGE {page+1}/{pages.length}</span><span><Highlighter size={15}/> Select text for highlight</span></div>
     <div className="aa-pages">{pages.map((p,i)=><button key={p.page} onClick={()=>visit(i)} disabled={busy} className={i===page?"active":data.progress.visited_pages.includes(i+1)?"visited":""}>{String(i+1).padStart(2,"0")}</button>)}</div>
     <h2>{current.heading}</h2><div className="aa-original">ORIGINAL ARTICLE · PAGE {current.page}</div>
     {current.paragraphs.map((p,i)=><p className="aa-text" key={i}>{rich(p)}</p>)}
     <div className="aa-callout-box"><div className="aa-callout-head"><Leaf size={16}/> MORE FROM THE ARTICLE</div>{current.callouts.map((c,i)=><div key={i} className="aa-callout"><h3>{c.title}</h3><p>{rich(c.text)}</p></div>)}</div>
     <div className="aa-reader-nav"><button onClick={()=>visit(page-1)} disabled={page===0||busy}><ChevronLeft size={16}/> Previous</button>{page<pages.length-1?<button className="aa-next" onClick={()=>visit(page+1)} disabled={busy}>Next page <ChevronRight size={16}/></button>:completed?<Link className="aa-next" href={"/day/"+day+"/vocabulary"}>Vocabulary <ArrowRight size={16}/></Link>:<button className="aa-next" disabled={busy||read<pages.length} onClick={complete}><CheckCircle2 size={16}/> Finish article</button>}</div>
    </div>
    <aside className={"aa-vocab "+(tab==="vocab"?"aa-mobile-visible":"")}><div className="aa-vocab-head"><span className="aa-kicker">B2+ / C1 · IN CONTEXT</span><h2>Interactive glossary</h2><p>Tap underlined words in the article for Uzbek meanings and English explanations.</p></div>
      <div className="aa-words">{words.map((w,i)=><button key={w.id} onClick={e=>{e.stopPropagation();const r=e.currentTarget.getBoundingClientRect();setPopup({word:w,x:Math.min(innerWidth-310,Math.max(12,r.left)),y:r.bottom+255>innerHeight?Math.max(61,r.top-251):r.bottom+9})}}><span className="aa-index">{String(i+1).padStart(2,"0")}</span><span><b>{w.display_word}</b><small>{w.meaning_uz}</small></span><em>{w.level}</em></button>)}</div>
      <div className="aa-side-footer"><p>2 units · 20 words each · Pass at 18/20</p><Link href={"/day/"+day+"/vocabulary"}>Open Vocabulary <ArrowRight size={16}/></Link></div>
    </aside>
   </div>
   {error&&<div className="aa-alert" role="alert"><AlertCircle size={17}/>{error}<button onClick={()=>setError("")} aria-label="Dismiss"><X size={17}/></button></div>}
   {popup&&<div className="aa-definition" role="dialog" aria-label={"Meaning of "+popup.word.display_word} style={{left:popup.x,top:popup.y}} onClick={e=>e.stopPropagation()}><div><strong>{popup.word.display_word}</strong><em>{popup.word.level}</em><button onClick={()=>setPopup(null)} aria-label="Close"><X size={17}/></button></div><h3>{popup.word.meaning_uz}</h3><p>{popup.word.definition_en}</p><small>{popup.word.example}</small></div>}
   {menu&&<div className="aa-mark-menu" style={{left:menu.x,top:menu.y}} onMouseDown={e=>e.preventDefault()} role="toolbar" aria-label="Highlight selection"><button onClick={()=>highlight("yellow")} aria-label="Yellow highlight"><i className="yellow"/></button><button onClick={()=>highlight("green")} aria-label="Green highlight"><i className="green"/></button><button onClick={()=>highlight("erase")} aria-label="Remove highlight"><X size={16}/></button></div>}
  </div>
 </main>;
}
