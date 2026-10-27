/** Presentation helpers only: no writes, grading or access decisions. */
export function groupReading<T extends {student_id:string;ordinal:number;score:number}>(rows:T[]){
 const grouped=new Map<string,{student_id:string;entries:T[]}>();
 for(const row of rows){const group=grouped.get(row.student_id)||{student_id:row.student_id,entries:[]};group.entries.push(row);grouped.set(row.student_id,group)}
 return [...grouped.values()].map(g=>({...g,entries:g.entries.sort((a,b)=>a.ordinal-b.ordinal)})).sort((a,b)=>b.entries.reduce((n,r)=>n+r.score,0)-a.entries.reduce((n,r)=>n+r.score,0));
}
export function sortSpeaking<T extends {review_status:string;expires_at:string|null;audio_expired?:boolean}>(rows:T[],now=Date.now()){
 const priority=(r:T)=>r.review_status!=="pending"?2:r.audio_expired||(r.expires_at&&Date.parse(r.expires_at)<=now)?1:0;
 const expiry=(r:T)=>r.expires_at&&Number.isFinite(Date.parse(r.expires_at))?Date.parse(r.expires_at):Infinity;
 return [...rows].sort((a,b)=>priority(a)-priority(b)||expiry(a)-expiry(b));
}
export function writingStage(row:{review_status:string;payload?:{ai_assessment?:unknown;ai_status?:string;ai_error?:unknown;ai_assessment_error?:unknown}}){
 if(row.review_status==="reviewed")return "Published";
 if(row.payload?.ai_assessment)return "Teacher review";
 if(row.payload?.ai_status==="error"||row.payload?.ai_error||row.payload?.ai_assessment_error)return "AI error";
 return "AI pending";
}
export function courseStatus(date=new Date()){
 const localDay=Math.floor((date.getTime()+5*3600000-Date.UTC(2026,9,1))/86400000)+1;
 return localDay<1?"Starts 1 October":localDay>60?"Challenge completed":`Challenge · Day ${localDay} / 60`;
}
