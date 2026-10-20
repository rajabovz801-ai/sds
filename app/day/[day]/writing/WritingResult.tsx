type Submission={review_status:string;band?:number|null;review_feedback?:string|null;payload?:Record<string,unknown>};
export default function WritingResult({submission:s,onRetry,retrying=false}:{submission:Submission;onRetry?:()=>void;retrying?:boolean}){
 const ai=s.payload?.ai_assessment as Record<string,any>|undefined;
 if(s.review_status==='preview')return <p>Preview only. Student results were not changed.</p>;
 const labels=[ai?.criterion_label||'Task Achievement / Response','Coherence & Cohesion','Lexical Resource','Grammatical Range & Accuracy'];
 const keys=['task_criterion','coherence_cohesion','lexical_resource','grammar'];
 return <div className="writing-assessment" aria-live="polite">
 {s.review_status==='reviewed'&&<section className="writing-teacher"><small>TEACHER REVIEW</small><h2>Final band · {Number(s.band).toFixed(1)}</h2><p>{s.review_feedback}</p></section>}
 {!ai?<section className="writing-assessment-wait"><h2>{s.payload?.ai_status==='error'?'Tekshirish vaqtincha yakunlanmadi':'Writing tekshirilmoqda…'}</h2><p>Javobingiz saqlangan. Natijani shu sahifadan qayta ochishingiz mumkin.</p>{onRetry&&<button type="button" onClick={onRetry} disabled={retrying}>{retrying?"Tekshirish so‘ralmoqda…":"Qayta tekshirish"}</button>}</section>:<>
 <header className="writing-score-header"><div><small>AI WRITING ASSESSMENT</small><h2>Your writing review</h2><p>Taxminiy baho · Not an official IELTS result</p></div><div className="writing-band"><strong>{Number(ai.band).toFixed(1)}</strong><span>/ 9.0</span></div></header>
 <div className="writing-criteria">{keys.map((key,i)=><section key={key}><span>{labels[i]}</span><b>{Number.isFinite(ai[key])?Number(ai[key]).toFixed(1):'—'}</b>{ai.criterion_feedback?.[i]&&<p>{ai.criterion_feedback[i]}</p>}</section>)}</div>
 <section><h3>Bahoning sababi</h3><p>{ai.summary}</p></section>
 {ai.strengths?.length>0&&<section><h3>Kuchli tomonlar</h3><ul>{ai.strengths.map((x:string,i:number)=><li key={i}>{x}</li>)}</ul></section>}
 {ai.improvement_plan?.length>0&&<section><h3>Keyingi band uchun reja</h3><ol>{ai.improvement_plan.map((x:string,i:number)=><li key={i}>{x}</li>)}</ol></section>}
 {ai.errors?.length>0&&<section><h3>Matningizdan aniq tuzatishlar</h3><div className="writing-corrections">{ai.errors.map((e:any,i:number)=><article key={i}><small>{e.category}</small><p><del>{e.original}</del></p><p><ins>{e.correction}</ins></p><p>{e.explanation}</p></article>)}</div></section>}
 {ai.improved_paragraph&&<section><h3>Yaxshilangan paragraf namunasi</h3><blockquote>{ai.improved_paragraph}</blockquote></section>}
 </>}
 {typeof s.payload?.answer==='string'&&<details><summary>Your submitted response</summary><p style={{whiteSpace:'pre-wrap'}}>{s.payload.answer}</p></details>}
 </div>;
}
