export function sanitizeMockSnapshot(value:unknown){
 const s=value as Record<string,any>;if(!s||typeof s!=="object"||!["listening","reading","writing"].includes(s.stage))return null;
 const num=(v:any,min:number,max:number)=>Math.max(min,Math.min(max,Math.floor(Number(v)||min)));
 const answers=(v:any)=>Object.fromEntries(Array.from({length:40},(_,i)=>[String(i+1),String(v?.[String(i+1)]||"").slice(0,200)]));
 return {stage:s.stage,lSection:num(s.lSection,1,4),lCurrentQuestion:num(s.lCurrentQuestion,1,40),lAnswers:answers(s.lAnswers),lElapsed:num(s.lElapsed,0,7200),audioState:["idle","playing","ended","resume"].includes(s.audioState)?s.audioState:"idle",rPassage:num(s.rPassage,1,3),rTab:s.rTab==="questions"?"questions":"passage",rAnswers:answers(s.rAnswers),rRemaining:num(s.rRemaining,0,3600),wTask:num(s.wTask,1,2),w1:String(s.w1||"").slice(0,25000),w2:String(s.w2||"").slice(0,25000),wRemaining:num(s.wRemaining,0,3600)};
}
export const liveLeaseActive=(stamp:string|null|undefined,now=Date.now())=>!!stamp&&Number.isFinite(Date.parse(stamp))&&now-Date.parse(stamp)<15000&&now>=Date.parse(stamp);
