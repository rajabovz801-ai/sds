"use client";
import Link from "next/link";
import AnimatedBackButton from "../../components/animated-back-button";
import {useEffect,useMemo,useState} from "react";
import {BookOpen,Clock3,Download,RefreshCw,Users,X,ClipboardList} from "lucide-react";
type Entry={student_id:string,passage_id:string,day_number:number,ordinal:number,score:number,total:number,elapsed_seconds:number,submitted_at:string,student:{first_name:string,last_name:string,username:string}|null,review?:{items:{number:number,submitted:string,correct:string[],status:"correct"|"wrong"|"empty"}[]}|null};
type P={id:string,day_number:number,ordinal:number,title:string,status:string};
const days=[1,2,3,5,6,7,8,9,10,12,13,14,15,16,17];
const dates=["1 October","2 October","3 October","5 October","6 October","7 October","8 October","9 October","10 October","12 October","13 October","14 October","15 October","16 October","17 October"];
function mins(s:number){return Math.floor(s/60)+"m "+String(s%60).padStart(2,"0")+"s"}
export default function ReadingAdmin(){
 const [day,setDay]=useState(1),[rows,setRows]=useState<Entry[]>([]),[passages,setPassages]=useState<P[]>([]),[error,setError]=useState(""),[loading,setLoading]=useState(true),[unauthorized,setUnauthorized]=useState(false),[selected,setSelected]=useState<Entry|null>(null);
 async function load(){setLoading(true);setError("");try{const r=await fetch("/api/challenge-reading?action=admin&day="+day,{credentials:"same-origin",cache:"no-store"});const v=await r.json();if(!r.ok){setUnauthorized(r.status===401);throw Error(v.error||"Cannot load results")}setRows(v.attempts||[]);setPassages(v.passages||[]);setSelected(null)}catch(e){setError(String(e))}finally{setLoading(false)}}
 useEffect(()=>{load()},[day]);
 const groups=useMemo(()=>{const map=new Map<string,{student:Entry["student"],p1?:Entry,p2?:Entry}>();for(const r of rows){let x=map.get(r.student_id);if(!x){x={student:r.student};map.set(r.student_id,x)}if(r.ordinal===1)x.p1=r;else x.p2=r;}return [...map.values()].sort((a,b)=>(b.p1?.score||0)+(b.p2?.score||0)-(a.p1?.score||0)-(a.p2?.score||0))},[rows]);
 const totalSeconds=rows.reduce((n,r)=>n+r.elapsed_seconds,0);
 function exportCSV(){const table=[["Student","Username","Day","Passage 1 score","Passage 1 time","Passage 2 score","Passage 2 time","Total score","Total time"],...groups.map(g=>[g.student?.first_name+" "+g.student?.last_name,g.student?.username,String(day),g.p1?g.p1.score+"/"+g.p1.total:"",g.p1?mins(g.p1.elapsed_seconds):"",g.p2?g.p2.score+"/"+g.p2.total:"",g.p2?mins(g.p2.elapsed_seconds):"",String((g.p1?.score||0)+(g.p2?.score||0)),mins((g.p1?.elapsed_seconds||0)+(g.p2?.elapsed_seconds||0))])];const contents=table.map(line=>line.map(v=>'"'+String(v||"").replaceAll('"','""')+'"').join(",")).join("\n");const blob=new Blob(["\ufeff"+contents],{type:"text/csv;charset=utf-8"});const u=URL.createObjectURL(blob);const a=document.createElement("a");a.href=u;a.download="ark-reading-day-"+day+".csv";a.click();URL.revokeObjectURL(u);}
 return <main className="cr-admin"><header className="cr-admin-top"><AnimatedBackButton href="/admin" ariaLabel="Back to admin panel"/><strong>ARK <span>EDUCATION</span><em> · READING REPORTS</em></strong><button className="cr-admin-refresh" onClick={load} disabled={loading}><RefreshCw size={15}/> {loading?"Loading…":"Refresh"}</button></header><section className="cr-a-content"><div className="cr-a-heading"><div><small>60-DAY CHALLENGE · LIVE RESULTS</small><h1>Reading reports</h1><p>View students' individual passage scores, completion dates and elapsed time.</p></div><button onClick={exportCSV} disabled={!rows.length}><Download size={16}/> Export CSV</button></div>
 <div className="cr-a-days">{days.map((n,i)=><button key={n} className={n===day?"selected":""} onClick={()=>setDay(n)}><span>Day {String(n).padStart(2,"0")}</span><b>{dates[i]}</b></button>)}</div>
 <div className="cr-a-stats"><div><Users/><small>Students who submitted</small><strong>{groups.length}</strong></div><div><BookOpen/><small>Passages completed</small><strong>{rows.length}</strong></div><div><Clock3/><small>Total recorded time</small><strong>{mins(totalSeconds)}</strong></div></div>
 <section className="cr-a-table"><div className="cr-a-table-head"><div><span>STUDENT RESULTS</span><h2>Day {String(day).padStart(2,"0")} · {passages.map(x=>x.title).join(" / ")}</h2></div><strong>{groups.length} students</strong></div>{error&&<p className="cr-a-error">{error}{unauthorized&&<> · <Link href="/admin">Sign in</Link></>}</p>}{loading?<p className="cr-a-empty">Loading real results…</p>:!rows.length?<p className="cr-a-empty">No students have submitted reading passages for this day yet.</p>:<div className="cr-a-overflow"><table><thead><tr><th>Student</th><th>Passage 1</th><th>Passage 2</th><th>Total</th><th>Time</th><th>Submitted</th></tr></thead><tbody>{groups.map((g,i)=><tr key={i}><td><b>{g.student?.first_name} {g.student?.last_name}</b><small>@{g.student?.username}</small></td><td>{g.p1?<><b>{g.p1.score}/{g.p1.total}</b><small>{mins(g.p1.elapsed_seconds)} · Answered {g.p1.review?.items.filter(x=>!!x.submitted.trim()).length??g.p1.total}/{g.p1.total}</small>{g.p1.review&&<button type="button" className="cr-answer-detail" onClick={()=>setSelected(g.p1!)}>View answers</button>}</>:"Not submitted"}</td><td>{g.p2?<><b>{g.p2.score}/{g.p2.total}</b><small>{mins(g.p2.elapsed_seconds)} · Answered {g.p2.review?.items.filter(x=>!!x.submitted.trim()).length??g.p2.total}/{g.p2.total}</small>{g.p2.review&&<button type="button" className="cr-answer-detail" onClick={()=>setSelected(g.p2!)}>View answers</button>}</>:"Not submitted"}</td><td><b>{(g.p1?.score||0)+(g.p2?.score||0)}/{(g.p1?.total||0)+(g.p2?.total||0)}</b></td><td>{mins((g.p1?.elapsed_seconds||0)+(g.p2?.elapsed_seconds||0))}</td><td>{g.p2?.submitted_at||g.p1?.submitted_at?new Date((g.p2||g.p1)!.submitted_at).toLocaleString("en-GB",{timeZone:"Asia/Tashkent",dateStyle:"medium",timeStyle:"short"}):"—"}</td></tr>)}</tbody></table></div>}</section>
 {selected&&<div className="cr-detail-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><section className="cr-detail-dialog" role="dialog" aria-modal="true" aria-label="Student reading answers">
   <header className="cr-detail-head"><div><span>DAY {String(day).padStart(2,"0")} · PRACTICE {String(selected.ordinal).padStart(2,"0")}</span><h2>{selected.student?.first_name} {selected.student?.last_name}</h2><p>@{selected.student?.username} · {passages.find(p=>p.id===selected.passage_id)?.title||"Reading"} · Score {selected.score}/{selected.total} · {mins(selected.elapsed_seconds)}</p></div><button onClick={()=>setSelected(null)} aria-label="Close answer details"><X size={18}/></button></header>
   <div className="cr-detail-scroll"><table><thead><tr><th>Q</th><th>Student answer</th><th>Correct answer</th><th>Result</th></tr></thead><tbody>{selected.review?.items.map(item=><tr key={item.number}><td>{item.number}</td><td>{item.submitted||"—"}</td><td>{item.correct.join(" / ")}</td><td><span className={"cr-detail-status "+item.status}>{item.status==="correct"?"Correct":item.status==="empty"?"Empty":"Wrong"}</span></td></tr>)}</tbody></table></div>
  </section></div>}
 </section><style jsx global>{`
 body{margin:0}.cr-admin{min-height:100vh;background:#f7f8fb;color:#192335;font:14px Arial,sans-serif}.cr-admin header{height:65px;background:white;border-bottom:1px solid #e5e9f0;display:flex;justify-content:space-between;align-items:center;padding:0 32px}.cr-admin header a{display:flex;align-items:center;gap:7px;text-decoration:none;color:#4c5667}.cr-admin header strong{font-size:12px;letter-spacing:.09em}.cr-admin button{cursor:pointer}.cr-admin header button,.cr-a-heading button{display:flex;align-items:center;gap:7px;background:white;border:1px solid #dce1e8;padding:10px 15px;border-radius:8px;font-weight:bold}.cr-a-content{max-width:1220px;margin:38px auto;padding:0 18px}.cr-a-heading{display:flex;justify-content:space-between;align-items:center;gap:15px;margin:0 0 28px}.cr-a-heading small{color:#d83647;font-weight:bold;letter-spacing:.1em}.cr-a-heading h1{font-size:32px;margin:8px 0}.cr-a-heading p{margin:0;color:#677589}.cr-a-days{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:22px}.cr-a-days button{border:1px solid #e1e5eb;border-radius:10px;background:white;padding:13px 18px;text-align:left;min-width:145px}.cr-a-days button span{display:block;font-size:10px;color:#718198;margin-bottom:6px}.cr-a-days button b{font-size:14px}.cr-a-days button.selected{border-color:#303b54;background:#f0f3fb}.cr-a-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:13px}.cr-a-stats>div{background:white;border:1px solid #e5e8ed;border-radius:11px;padding:20px;display:flex;flex-direction:column;align-items:start;gap:8px}.cr-a-stats svg{color:#677b9a}.cr-a-stats small{color:#718198}.cr-a-stats strong{font-size:28px}.cr-a-table{margin-top:22px;background:white;border:1px solid #e2e6eb;border-radius:13px;padding:21px}.cr-a-table h2{font-size:17px}.cr-a-overflow{overflow-x:auto}.cr-a-table table{border-collapse:collapse;width:100%;min-width:700px;margin-top:18px;text-align:left}.cr-a-table th{font-size:11px;color:#7c8899;border-bottom:1px solid #e5eaf0;padding:14px 12px}.cr-a-table td{padding:17px 12px;border-bottom:1px solid #f0f1f5}.cr-a-table td small{display:block;color:#8993a3;font-size:11px;margin-top:5px}.cr-a-empty{padding:28px;text-align:center;color:#64748b}.cr-a-error{background:#fff1f1;padding:12px;color:#9e2020}@media(max-width:680px){.cr-admin header{padding:0 12px}.cr-admin header strong{display:none}.cr-a-heading h1{font-size:26px}.cr-a-stats{grid-template-columns:1fr}.cr-a-stats>div{padding:12px}.cr-a-stats strong{font-size:22px}.cr-a-table{padding:12px}}

 .cr-admin{font-family:Manrope,Inter,system-ui,sans-serif;background:#fafbff;color:#292640}
 .cr-admin header{border-color:#e9e6f3}.cr-admin header strong{color:#5d50ba}
 .cr-a-heading small{color:#6f5bd1}.cr-a-days button.selected{border-color:#9d8fe2;background:#f5f2ff}
 .cr-a-stats>div{border-color:#e9e6f2}.cr-a-stats svg{color:#7968d3}
 .cr-answer-detail{display:inline-flex;border:1px solid #dfdaf6;border-radius:6px;background:#f7f5ff;color:#6152b9;padding:6px 9px;font-size:10px;font-weight:850;margin-top:6px;cursor:pointer}
 .cr-answer-detail:hover{background:#efebff}
 .cr-detail-overlay{position:fixed;inset:0;z-index:130;background:#15102599;display:grid;place-items:center;padding:16px}
 .cr-detail-dialog{max-height:min(85dvh,830px);width:min(100%,810px);display:flex;flex-direction:column;background:#fff;border:1px solid #e5e1f1;border-radius:14px;box-shadow:0 22px 70px #2014313d;overflow:hidden}
 .cr-detail-head{flex:none!important;display:flex;align-items:center;justify-content:space-between;background:#fff;border-bottom:1px solid #eeebf4;padding:22px!important;min-height:0!important;height:auto!important}
 .cr-detail-head span{font-size:10px;letter-spacing:.11em;font-weight:850;color:#6654d7}.cr-detail-head h2{font-size:23px;letter-spacing:-.035em;margin:7px 0}.cr-detail-head p{color:#8f899f;font-size:12px;margin:0}
 .cr-detail-head button{display:grid;place-items:center;border:1px solid #e7e2f3;background:#faf8ff;border-radius:7px;padding:8px;cursor:pointer}
 .cr-detail-scroll{overflow-y:auto;padding:0 20px 23px}
 .cr-detail-scroll table{width:100%;border-collapse:collapse;font-size:12px}
 .cr-detail-scroll th{position:sticky;top:0;background:#f8f6ff;color:#615876;padding:14px 12px;text-align:left;font-size:10px}
 .cr-detail-scroll td{padding:13px 12px;border-bottom:1px solid #eeeaf4;line-height:1.5}
 .cr-detail-status{font-weight:850;font-size:10px;letter-spacing:.04em;padding:6px 9px;border-radius:6px}
 .cr-detail-status.correct{color:#287b53;background:#e9f7ee}.cr-detail-status.wrong{color:#b54c50;background:#ffeef0}.cr-detail-status.empty{color:#996e32;background:#fff5e5}
 @media(max-width:600px){.cr-detail-overlay{padding:8px}.cr-detail-head{padding:14px!important}.cr-detail-head h2{font-size:17px}.cr-detail-scroll{padding:0 7px 16px}.cr-detail-scroll table{font-size:10px}.cr-detail-scroll th,.cr-detail-scroll td{padding:10px 6px}}
 
 /* Reading reports: unified ARK Challenge design system */
 .cr-admin{font-family:Manrope,Inter,system-ui,sans-serif;background:#f8f9fd;color:#28263d}
 .cr-admin>header.cr-admin-top{height:60px;min-height:60px;padding:0 clamp(12px,2.5vw,32px);display:grid;grid-template-columns:1fr auto 1fr;gap:12px;align-items:center;background:#fff;border-bottom:1px solid #e8e6f3}
 .cr-admin-top>strong{letter-spacing:.11em;font-size:11px;font-weight:850;color:#342e53;white-space:nowrap}
 .cr-admin-top>strong span{color:#6252d9}.cr-admin-top>strong em{font-size:9px;color:#a39bb8;font-style:normal}
 .cr-admin-top .cr-admin-refresh{justify-self:end;min-height:35px;padding:9px 12px;border:1px solid #e8e4f3;color:#6554c8;border-radius:8px;background:#f9f7ff;font-size:11px;font-weight:800}
 .cr-admin-top .cr-admin-refresh:hover:not(:disabled){background:#f0ecff}.cr-admin-top .cr-admin-refresh:disabled{opacity:.55;cursor:wait}
 .cr-a-content{max-width:1150px;margin:29px auto;padding:0 17px 52px}
 .cr-a-heading{margin-bottom:20px}.cr-a-heading small{font-size:10px;color:#7462cc;letter-spacing:.12em}
 .cr-a-heading h1{font-size:clamp(26px,3vw,34px);letter-spacing:-.05em;margin:7px 0}.cr-a-heading p{font-size:12px;color:#8b85a0}
 .cr-a-heading>button{border:1px solid #e5e1f3;background:#fff;color:#594bad;border-radius:8px;min-height:38px;font-size:11px;font-weight:850}
 .cr-a-heading>button:hover:not(:disabled){background:#f7f4ff}.cr-a-heading>button:disabled{opacity:.5;cursor:not-allowed}
 .cr-a-days{gap:8px;margin-bottom:15px}.cr-a-days button{border-radius:10px;min-width:132px;padding:12px 13px;border-color:#e9e7f0;transition:background .2s,border-color .2s,box-shadow .2s}
 .cr-a-days button span{color:#8d88a0;font-size:10px;margin-bottom:5px}.cr-a-days button b{color:#3b3753;font-size:12px}
 .cr-a-days button:hover{border-color:#b1a5ee}.cr-a-days button.selected{background:#f4f1ff;border-color:#8575dd;box-shadow:0 0 0 1px #e7e0ff}
 .cr-a-days button.selected b,.cr-a-days button.selected span{color:#5c48c6}
 .cr-a-stats{gap:11px}.cr-a-stats>div{min-height:112px;padding:16px;border-color:#e7e5f1;border-radius:11px;box-shadow:0 4px 16px #34235e05}
 .cr-a-stats svg{height:21px;width:21px;color:#7060c8}.cr-a-stats small{font-size:11px;color:#8d87a0}.cr-a-stats strong{font-size:27px;color:#302b4d;letter-spacing:-.05em}
 .cr-a-table{margin-top:17px;padding:20px 19px;border-color:#e8e5f2;border-radius:12px;box-shadow:0 4px 21px #2c235c07}
 .cr-a-table-head{display:flex;gap:18px;align-items:center;justify-content:space-between}.cr-a-table-head span{display:block;font-size:9px;letter-spacing:.12em;font-weight:850;color:#7967ce}
 .cr-a-table-head h2{font-size:16px;letter-spacing:-.025em;margin:6px 0 0;max-width:850px}
 .cr-a-table-head>strong{display:inline-flex;white-space:nowrap;font-size:10px;border:1px solid #ede9f8;background:#faf8ff;padding:8px 11px;border-radius:8px;color:#80749e}
 .cr-a-overflow{border:1px solid #f0edf8;border-radius:9px;margin-top:15px}
 .cr-a-table table{margin:0;min-width:760px}.cr-a-table th{background:#f8f6ff;font-size:10px;color:#827999;font-weight:850;letter-spacing:.035em;padding:13px}
 .cr-a-table td{padding:15px 12px;border-bottom:1px solid #eeeaf5;font-size:12px;color:#484259}
 .cr-a-table tr:last-child td{border-bottom:0}.cr-a-table tbody tr:hover{background:#fcfbff}
 .cr-a-table td small{font-size:10px;color:#948ba8}.cr-a-table td b{font-weight:850;color:#342c4d}
 .cr-answer-detail{background:#f7f3ff;border-color:#e3ddfa;color:#6552cc;padding:6px 9px;border-radius:7px}
 .cr-detail-dialog{border-radius:14px}.cr-detail-head>div h2{letter-spacing:-.04em}
 .cr-detail-head>div p{line-height:1.55}.cr-detail-scroll th{background:#f6f3ff}
 @media(max-width:700px){
  .cr-admin>header.cr-admin-top{height:54px;min-height:54px;padding:0 10px;grid-template-columns:110px minmax(0,1fr) auto;gap:7px}
  .cr-admin-top>strong{font-size:9px;text-align:center}.cr-admin-top>strong em{display:none}
  .cr-admin-top .cr-admin-refresh{min-height:32px;padding:8px;font-size:0;gap:0}.cr-admin-top .cr-admin-refresh svg{width:17px;height:17px}
  .cr-a-content{margin:22px auto;padding:0 11px 35px}.cr-a-heading{gap:10px;align-items:flex-start}
  .cr-a-heading h1{font-size:25px}.cr-a-heading p{font-size:11px;line-height:1.6}
  .cr-a-heading>button{padding:9px;white-space:nowrap;font-size:0;min-height:36px}.cr-a-heading>button svg{height:17px;width:17px}
  .cr-a-days{display:flex;flex-wrap:nowrap;overflow-x:auto;scroll-snap-type:x proximity;padding-bottom:6px}
  .cr-a-days button{min-width:105px;flex:0 0 105px;padding:10px;scroll-snap-align:start}
  .cr-a-stats{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
  .cr-a-stats>div{min-height:95px;padding:11px 8px}.cr-a-stats svg{width:17px;height:17px}.cr-a-stats small{font-size:9px}.cr-a-stats strong{font-size:18px;word-break:break-word}
  .cr-a-table{padding:13px 10px}.cr-a-table-head{flex-wrap:wrap;gap:8px}.cr-a-table-head h2{font-size:13px}
 }
`}</style></main>;
}