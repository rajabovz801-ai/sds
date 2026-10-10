"use client";
import {useEffect,useState} from "react";

type Props={day:number;studentId:string};
export default function MockLiveView({day,studentId}:Props){
 const [data,setData]=useState<any>(null),[error,setError]=useState("");
 useEffect(()=>{let active=true,pending=false,materials:any=null;setData(null);setError("");const load=async()=>{if(pending||document.visibilityState!=="visible")return;pending=true;try{const r=await fetch(`/api/challenge-mock?action=admin_live&day=${day}&student_id=${encodeURIComponent(studentId)}${materials?"":"&content=1"}`,{cache:"no-store"});const obj=await r.json();if(!r.ok)throw new Error(obj.detail||"Live view unavailable");if(active){if(obj.content)materials=obj.content;setData({...obj,content:materials});setError("")}}catch(e){if(active)setError(e instanceof Error?e.message:"Connection lost")}finally{pending=false}};void load();const id=window.setInterval(load,3000);return()=>{active=false;window.clearInterval(id)}},[day,studentId]);
 if(error)return <div className="ma-live-paper">{error}</div>;
 if(!data?.available)return <div className="ma-live-paper">{data?.detail||"Connecting to student mock…"}</div>;
 return <MockLiveContent data={data}/>;
}
export function MockLiveContent({data}:{data:any}){
 const s=data.snapshot,c=data.content;
 if(!s)return <div className="ma-live-paper">Waiting for the student's next update…</div>;
 const stale=!data.updated_at||Date.now()-Date.parse(data.updated_at)>12000;
 const answer=(q:number,kind="listening")=><span className="ma-live-answer"><b>{q}</b><input readOnly aria-label={`Student answer ${q}`} value={(kind==="reading"?s.rAnswers:s.lAnswers)?.[String(q)]||""}/></span>;
 const tokens=(values:any[])=>values?.map((v,i)=>typeof v==="string"?<span key={i}>{v}</span>:<span key={i}>{answer(v.q)}</span>);
 const block=(b:any,i:number)=><section key={i} className="ma-live-block"><h3>{b.range} · {b.title}</h3><p><b>{b.instruction} {b.word_limit}</b></p>
 {b.image_url&&<img className="ma-live-map" src={b.image_url} alt={b.image_alt||"Mock map"}/>}
 {b.headers&&<table><thead><tr>{b.headers.map((v:string)=><th key={v}>{v}</th>)}</tr></thead><tbody>{b.rows.map((row:any[],j:number)=><tr key={j}>{row.map((cell:any[],k:number)=><td key={k}>{tokens(cell)}</td>)}</tr>)}</tbody></table>}
 {b.kind==="notes"&&<ul>{b.items?.map((v:any[],j:number)=><li key={j}>{tokens(v)}</li>)}</ul>}
 {b.kind==="notes_groups"&&b.groups?.map((g:any,j:number)=><div key={j}><h4>{g.heading}</h4><p>{g.intro}</p><ul>{g.items?.map((v:any[],k:number)=><li key={k}>{tokens(v)}</li>)}</ul></div>)}
 {b.kind==="matching"&&<div>{!b.hide_choices&&Object.entries(b.choices||{}).map(([k,v])=><p key={k}>{k} · {String(v)}</p>)}{b.items?.map((it:any)=><p key={it.q}>{answer(it.q)} <b>{it.text}</b></p>)}</div>}
 {b.kind==="mcq"&&b.questions?.map((q:any)=><article key={q.q}><p>{answer(q.q)} <b>{q.text}</b></p>{Object.entries(q.options||{}).map(([k,v])=><p key={k} className={s.lAnswers?.[String(q.q)]===k?"ma-live-picked":""}>{k} · {String(v)}</p>)}</article>)}
 {(b.kind==="choose_two"||b.kind==="choose_many")&&<article><h4>{b.question}</h4><p>{b.questions?.map((q:number)=>answer(q))}</p>{Object.entries(b.options||{}).map(([k,v])=><p key={k} className={b.questions?.some((q:number)=>s.lAnswers?.[String(q)]===k)?"ma-live-picked":""}>{k} · {String(v)}</p>)}</article>}
 </section>;
 const passage=c.reading?.find((p:any)=>p.ordinal===s.rPassage),task=c.writing?.tasks?.[s.wTask-1];
 return <section className="ma-live-screen"><header><b>LIVE MOCK · {s.stage.toUpperCase()}</b><span>{stale?"Connection delayed":"Updated "+new Date(data.updated_at).toLocaleTimeString()} · {s.stage==="listening"?`Part ${s.lSection} · Audio ${s.audioState}`:s.stage==="reading"?`Part ${s.rPassage}`:`Task ${s.wTask}`}</span></header><div className="ma-live-paper">
 {s.stage==="listening"&&c.listening?.sections?.find((p:any)=>Number(p.part||p.number)===s.lSection)?.blocks?.map(block)}
 {s.stage==="reading"&&passage&&<div className="ma-live-columns"><article><h2>{passage.title}</h2><div className="ma-live-passage">{passage.text}</div></article><article>{passage.questions?.map((q:any)=><section key={q.number}><p><b>{q.number}. {q.text}</b></p>{answer(q.number,"reading")}{q.options?.map((opt:string)=><p key={opt}>{opt}</p>)}</section>)}</article></div>}
 {s.stage==="writing"&&task&&<div className="ma-live-columns"><article><h2>{task.label}</h2><p>{task.prompt}</p>{task.visual?.kind==="table"&&<table><thead><tr>{task.visual.headers.map((v:string)=><th key={v}>{v}</th>)}</tr></thead><tbody>{task.visual.rows.map((row:string[],i:number)=><tr key={i}>{row.map((v,j)=><td key={j}>{v}</td>)}</tr>)}</tbody></table>}{task.instructions?.map((v:string)=><p key={v}>{v}</p>)}</article><article><h3>Student answer</h3><div className="ma-live-passage">{s.wTask===1?s.w1:s.w2}</div></article></div>}
 </div></section>;
}
