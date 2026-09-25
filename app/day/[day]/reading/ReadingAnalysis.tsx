"use client";
import {useEffect,useRef,useState} from "react";
import {ArrowLeft,ArrowRight,BookOpen,CheckCircle2,Clock3,Highlighter,ChevronLeft,ChevronRight,AlertCircle,RotateCcw} from "lucide-react";

export type ReviewItem={
 number:number;question:string;type:string;submitted:string;correct:string[];
 status:"correct"|"wrong"|"empty";
 evidence:{paragraph:number;quote:string;pairs:[string,string,string][];explanation:string;note?:string}|null;
};
export type ReadingReview={score:number;total:number;elapsed_seconds:number;submitted_at:string;items:ReviewItem[]};
export type ReadingPassage={id:string;title:string;text:string;ordinal:number;day_number:number;questions:{number:number;text:string}[]};
type Props={passage:ReadingPassage;review:ReadingReview;onBack:()=>void;onNext:()=>void;nextAvailable:boolean;nextTitle?:string};

function paragraphs(s:string){
 return s.replace(/\\n\\n/g,"\n\n").split(/\n\s*\n/).map(x=>x.trim()).filter(x=>x.length>8&&!/^\d+$/.test(x));
}
function time(s:number){const sec=Math.max(0,Math.floor(s||0));return String(Math.floor(sec/60)).padStart(2,"0")+":"+String(sec%60).padStart(2,"0")}
function highlightExcerpt(text:string,needle:string){
 if(!needle)return text;
 const index=text.toLocaleLowerCase("en").indexOf(needle.toLocaleLowerCase("en"));
 if(index<0)return text;
 return <>{text.slice(0,index)}<mark className="ra-evidence-mark">{text.slice(index,index+needle.length)}</mark>{text.slice(index+needle.length)}</>;
}
export default function ReadingAnalysis({passage,review,onBack,onNext,nextAvailable,nextTitle}:Props){
 const [selected,setSelected]=useState(review.items[0]?.number??1);
 const [filter,setFilter]=useState<"all"|"mistakes">("all");
 const [mobileTab,setMobileTab]=useState<"passage"|"analysis">("analysis");
 const leftRef=useRef<HTMLElement>(null);
 const items=review.items;
 const current=items.find(x=>x.number===selected)||items[0];
 const currentIndex=items.findIndex(x=>x.number===current?.number);
 const para=paragraphs(passage.text);
 const relevant=filter==="all"?items:items.filter(x=>x.status!=="correct");
 function choose(n:number){
  setSelected(n);
  if(typeof window!=="undefined"&&window.innerWidth<=800)setMobileTab("analysis");
 }
 useEffect(()=>{
  if(!current?.evidence?.paragraph)return;
  const left=leftRef.current;
  const node=left?.querySelector<HTMLElement>('[data-analysis-paragraph="'+current.evidence.paragraph+'"]');
  if(left&&node)left.scrollTo({top:Math.max(0,node.offsetTop-left.offsetTop-24),behavior:"smooth"});
 },[selected,current?.evidence?.paragraph]);
 if(!current)return <div className="ra-empty">Your saved analysis is unavailable.</div>;
 const same=current.status==="correct";
 const nextLabel=nextAvailable?"Start Practice 02":passage.ordinal===2?"Return to Reading summary":"Back to passages";
 return <div className="ra-shell">
  <div className="ra-summary">
   <div className="ra-summary-title"><span className="ra-kicker">DAY {String(passage.day_number).padStart(2,"0")} · PRACTICE {String(passage.ordinal).padStart(2,"0")}</span><h2>Reading Analysis</h2><p>{passage.title}</p></div>
   <div className="ra-stats"><div><span>YOUR SCORE</span><strong>{review.score}<small>/{review.total}</small></strong></div><div><span>ACTIVE TIME</span><strong>{time(review.elapsed_seconds)}</strong></div><div><span>MISTAKES</span><strong>{review.items.filter(x=>x.status!=="correct").length}</strong></div></div>
  </div>
  <div className="ra-mobile-tabs"><button className={mobileTab==="passage"?"active":""} onClick={()=>setMobileTab("passage")}><BookOpen size={15}/> Full passage</button><button className={mobileTab==="analysis"?"active":""} onClick={()=>setMobileTab("analysis")}><Highlighter size={15}/> Analysis</button></div>
  <div className="ra-grid">
   <section className={"ra-left "+(mobileTab==="passage"?"ra-mobile-active":"")} ref={leftRef} aria-label="Entire reading passage">
    <div className="ra-left-caption"><BookOpen size={15}/> FULL PASSAGE <span>All {para.length} paragraphs</span></div>
    <h2>{passage.title}</h2>
    {para.map((p,i)=><p key={i} data-analysis-paragraph={i+1} className={current.evidence?.paragraph===i+1?"ra-paragraph-active":""}><span className="ra-paranum">{i+1}</span>{current.evidence?.paragraph===i+1?highlightExcerpt(p,current.evidence?.quote||""):p}</p>)}
   </section>
   <section className={"ra-right "+(mobileTab==="analysis"?"ra-mobile-active":"")} aria-label="Question-by-question review">
    <div className="ra-review-heading"><div><span className="ra-kicker">QUESTION REVIEW</span><h3>Every answer, explained</h3></div><div className="ra-filters"><button className={filter==="all"?"active":""} onClick={()=>setFilter("all")}>All</button><button className={filter==="mistakes"?"active":""} onClick={()=>{setFilter("mistakes");const m=items.find(x=>x.status!=="correct");if(m)setSelected(m.number)}}>Mistakes</button></div></div>
    <div className="ra-question-grid">{relevant.length?relevant.map(x=><button key={x.number} onClick={()=>choose(x.number)} aria-label={"Question "+x.number+": "+x.status} aria-pressed={selected===x.number} className={"ra-qnum "+x.status+(selected===x.number?" selected":"")}>{x.number}</button>):<span className="ra-all-correct"><CheckCircle2 size={16}/> All answers correct</span>}</div>
    <div className="ra-review-card">
     <div className="ra-card-heading"><span>QUESTION {String(current.number).padStart(2,"0")}</span><span className={"ra-status "+current.status}>{current.status==="correct"?"CORRECT":current.status==="empty"?"NOT ANSWERED":"INCORRECT"}</span></div>
     <p className="ra-question-text">{current.question}</p>
     <div className="ra-answer-pair"><div><span>YOUR ANSWER</span><strong className={!same?"ra-user-wrong":""}>{current.submitted||"Not answered"}</strong></div><div><span>CORRECT ANSWER</span><strong className="ra-correct-answer">{current.correct.join(" / ")}</strong></div></div>
     {current.evidence?<div className="ra-proof">
      <div className="ra-evidence-meta"><Highlighter size={16}/><strong>{current.evidence.note?"RELATED CONTEXT":"PASSAGE EVIDENCE"}</strong><span>Paragraph {current.evidence.paragraph}</span><button onClick={()=>{setMobileTab("passage");leftRef.current?.querySelector<HTMLElement>('[data-analysis-paragraph="'+current.evidence?.paragraph+'"]')?.scrollIntoView({block:"nearest",behavior:"smooth"})}}>Find in text <ArrowRight size={13}/></button></div>
      <blockquote>{current.evidence.quote||"See the paragraph highlighted in the full text."}</blockquote>
      <h4>Question keywords ↔ Passage paraphrases</h4>
      <div className="ra-table-wrap"><table><thead><tr><th>Question keywords</th><th>Passage words</th><th>Relationship</th></tr></thead><tbody>{current.evidence.pairs.map((pair,i)=><tr key={i}><td>{pair[0]}</td><td>{pair[1]}</td><td>{pair[2]}</td></tr>)}</tbody></table></div>
      <div className="ra-explanation"><strong>{current.correct.some(x=>x.toUpperCase()==="NOT GIVEN")?"Why NOT GIVEN?":current.correct.some(x=>x.toUpperCase()==="FALSE")?"Why FALSE?":"Explanation"}</strong><p>{current.evidence.explanation}</p></div>
     </div>:<div className="ra-proof-pending"><AlertCircle size={16}/> A source-checked explanation for this question is being reviewed. Your answer and score are saved.</div>}
    </div>
    <div className="ra-step-nav"><button disabled={currentIndex<=0} onClick={()=>choose(items[currentIndex-1].number)}><ChevronLeft size={15}/> Previous</button><span>{currentIndex+1} / {items.length}</span><button disabled={currentIndex>=items.length-1} onClick={()=>choose(items[currentIndex+1].number)}>Next <ChevronRight size={15}/></button></div>
   </section>
  </div>
  <footer className="ra-footer"><button className="ra-return" onClick={onBack}><ArrowLeft size={16}/> All practices</button><div><span>{passage.ordinal===1?"Finish this review, then continue.":"Both practices can be reviewed at any time."}</span><button className="ra-next" onClick={onNext}>{nextLabel}<ArrowRight size={17}/></button></div></footer>
  <style jsx global>{`
   .ra-shell{--ra-purple:#6252d9;min-height:0;display:flex;flex-direction:column;flex:1;background:#fafbff;color:#292640;font-family:Manrope,Inter,system-ui,sans-serif}
   .ra-summary{padding:15px 22px;background:#fff;border-bottom:1px solid #e8e6f3;display:flex;align-items:center;justify-content:space-between;gap:20px}.ra-kicker{font-size:10px;font-weight:850;letter-spacing:.12em;color:#7260d6}.ra-summary h2{font-size:22px;margin:3px 0;letter-spacing:-.04em;font-weight:850}.ra-summary p{font-size:11px;color:#8c899e;margin:0}
   .ra-stats{display:flex;gap:10px;flex-wrap:wrap}.ra-stats>div{min-width:102px;background:#f9f8ff;border:1px solid #e9e5fa;border-radius:10px;padding:9px 12px}.ra-stats span{display:block;font-size:9px;font-weight:850;letter-spacing:.08em;color:#9991ac}.ra-stats strong{font-size:21px;font-variant-numeric:tabular-nums;font-weight:850;letter-spacing:-.04em}.ra-stats strong small{font-size:12px;color:#9b93ad}
   .ra-grid{display:grid;grid-template-columns:minmax(0,1.12fr) minmax(0,1fr);gap:12px;padding:12px 17px;min-height:0;height:calc(100dvh - 72px - 105px - 66px);flex:1}.ra-left,.ra-right{overflow-y:auto;min-height:0;background:white;border:1px solid #e6e4f1;border-radius:11px;scrollbar-color:#bab2da transparent}.ra-left{padding:24px 30px;font:16px/1.85 "Palatino Linotype",Georgia,serif;position:relative}.ra-left-caption{font:850 10px Manrope,system-ui,sans-serif;letter-spacing:.1em;color:#7061c3;display:flex;gap:7px;align-items:center}.ra-left-caption span{margin-left:auto;color:#a6a2b5;letter-spacing:0}.ra-left h2{font:850 24px Manrope,system-ui,sans-serif;letter-spacing:-.04em;margin:17px 0 22px}.ra-left p{position:relative;white-space:pre-wrap;margin:0 0 24px;scroll-margin-top:20px;padding:4px 0;border-left:3px solid transparent}.ra-left .ra-paragraph-active{border-left-color:#d9c354;padding-left:12px;background:#fffef7;border-radius:4px}.ra-paranum{display:block;font:700 10px Manrope,system-ui,sans-serif;color:#aaa5b8;letter-spacing:.08em;margin-bottom:4px}.ra-evidence-mark{background:#ffeb8a;color:inherit;border-radius:2px;font-weight:inherit;padding:0;box-decoration-break:clone}
   .ra-right{padding:19px 22px}.ra-review-heading{display:flex;justify-content:space-between;gap:9px;align-items:center}.ra-review-heading h3{font-size:17px;letter-spacing:-.03em;margin:4px 0 0;font-weight:850}.ra-filters{display:flex;gap:3px;border-radius:8px;background:#f4f2fa;padding:4px}.ra-filters button{border:0;border-radius:6px;background:none;padding:7px 11px;color:#928b9d;font-weight:800;font-size:11px;cursor:pointer}.ra-filters button.active{background:#fff;color:#6252d9;box-shadow:0 1px 6px #30265b12}
   .ra-question-grid{display:flex;gap:6px;flex-wrap:wrap;padding:17px 0;border-bottom:1px solid #eeecf4}.ra-qnum{width:32px;height:32px;display:grid;place-items:center;border:1px solid #dedde9;border-radius:6px;background:#fff;color:#545166;font-size:12px;font-weight:800;cursor:pointer}.ra-qnum.correct{background:#eaf8f1;border-color:#cbe8d8;color:#267953}.ra-qnum.wrong{background:#fff0f0;border-color:#f3cece;color:#a74c4c}.ra-qnum.empty{background:#fff7e8;border-color:#efddba;color:#956b2c}.ra-qnum.selected{outline:2px solid #6656da;outline-offset:2px}.ra-all-correct{display:flex;align-items:center;gap:7px;color:#277d59;font-size:12px}
   .ra-review-card{padding-top:18px}.ra-card-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}.ra-card-heading>span:first-child{font-weight:850;font-size:12px;color:#6655d1;letter-spacing:.08em}.ra-status{font-size:10px;letter-spacing:.05em;font-weight:900;border-radius:50px;padding:6px 10px}.ra-status.correct{background:#e9f7ef;color:#21794e}.ra-status.wrong{background:#ffecec;color:#a74747}.ra-status.empty{background:#fff5e2;color:#9e6d26}.ra-question-text{font-size:15px;line-height:1.7;font-weight:750;margin:16px 0}.ra-answer-pair{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:13px 0 22px}.ra-answer-pair>div{border:1px solid #e9e6f1;background:#fcfbfe;border-radius:9px;padding:12px}.ra-answer-pair span{font-size:9px;font-weight:900;letter-spacing:.1em;color:#9a96a9;display:block;margin-bottom:6px}.ra-answer-pair strong{font-size:14px;word-break:break-word}.ra-answer-pair .ra-user-wrong{color:#a94d4d}.ra-answer-pair .ra-correct-answer{color:#248159}
   .ra-evidence-meta{display:flex;align-items:center;gap:7px;flex-wrap:wrap;font-size:10px;color:#7061bb}.ra-evidence-meta strong{letter-spacing:.09em}.ra-evidence-meta span{margin-right:auto;color:#948ca3}.ra-evidence-meta button{border:1px solid #e7e1fd;background:#f8f5ff;border-radius:7px;display:flex;align-items:center;gap:3px;padding:6px 9px;color:#6151c5;font-size:10px;font-weight:800;cursor:pointer}.ra-proof blockquote{font-family:Georgia,serif;line-height:1.8;font-size:14px;background:#fffdf3;border-left:3px solid #e6c45a;margin:13px 0 21px;padding:14px;color:#494050}.ra-proof h4{font-size:14px;margin:0 0 12px;letter-spacing:-.015em}.ra-table-wrap{overflow-x:auto;border:1px solid #ece8f4;border-radius:9px}.ra-table-wrap table{width:100%;border-collapse:collapse;text-align:left;font-size:11px;min-width:420px}.ra-table-wrap th{padding:12px 10px;background:#f7f6fd;color:#676079;font-size:10px}.ra-table-wrap td{padding:12px 10px;vertical-align:top;border-top:1px solid #ece8f4;line-height:1.5}.ra-table-wrap td:nth-child(2){color:#248159;font-weight:800}.ra-table-wrap td:nth-child(3){color:#888399}.ra-explanation{background:#f0f9f3;border:1px solid #dceee3;padding:14px;border-radius:9px;margin-top:16px}.ra-explanation strong{font-size:12px;color:#247d51}.ra-explanation p{font-size:12px;line-height:1.7;margin:6px 0 0}.ra-proof-pending{display:flex;align-items:center;gap:8px;background:#fff7e9;padding:15px;border-radius:9px;font-size:12px;color:#956b2c}
   .ra-step-nav{display:flex;align-items:center;justify-content:space-between;margin-top:24px;gap:10px}.ra-step-nav button{display:flex;align-items:center;gap:4px;border:1px solid #e2dfee;background:#fff;color:#6558aa;border-radius:7px;font-size:11px;font-weight:850;padding:9px 11px;cursor:pointer}.ra-step-nav button:disabled{opacity:.35;cursor:not-allowed}.ra-step-nav span{font-size:11px;color:#aaa4ba;font-weight:800}
   .ra-footer{min-height:66px;display:flex;align-items:center;justify-content:space-between;padding:9px 22px;border-top:1px solid #e8e5f1;background:#fff;gap:15px}.ra-footer .ra-return{border:0;background:transparent;color:#77708f;cursor:pointer;display:flex;align-items:center;gap:6px;font-size:12px;font-weight:750}.ra-footer>div{display:flex;gap:14px;align-items:center}.ra-footer>div>span{font-size:11px;color:#aaa4b7}.ra-next{background:#6252d9;border:0;border-radius:8px;color:#fff;display:flex;align-items:center;gap:8px;padding:12px 16px;cursor:pointer;font-weight:850;font-size:12px;white-space:nowrap}.ra-mobile-tabs{display:none}.ra-empty{padding:30px}
   @media(max-width:800px){.ra-summary{padding:12px;gap:10px}.ra-summary h2{font-size:17px}.ra-summary p{font-size:10px}.ra-stats{gap:5px}.ra-stats>div{min-width:62px;padding:7px}.ra-stats span{font-size:8px}.ra-stats strong{font-size:16px}.ra-stats>div:last-child{display:none}.ra-mobile-tabs{display:flex;padding:7px 10px;gap:6px;background:#f7f5fc}.ra-mobile-tabs button{border:1px solid transparent;flex:1;padding:9px;display:flex;justify-content:center;align-items:center;gap:7px;color:#8d869d;background:transparent;font-size:12px;border-radius:8px;font-weight:800}.ra-mobile-tabs button.active{background:#fff;color:#6654d7;border-color:#e8e3f5}.ra-grid{display:block;min-height:0;height:calc(100dvh - 62px - 82px - 54px - 64px);padding:6px 9px}.ra-left,.ra-right{display:none;height:100%;width:100%}.ra-mobile-active{display:block}.ra-left{padding:20px 16px}.ra-right{padding:15px 13px}.ra-footer{padding:7px 10px;gap:7px}.ra-footer>div>span{display:none}.ra-return{font-size:11px!important}.ra-next{padding:10px 11px;font-size:11px}}
  `}</style>
 </div>;
}
