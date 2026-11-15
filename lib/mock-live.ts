export function sanitizeMockSnapshot(value:unknown){
 const s=value as Record<string,any>;if(!s||typeof s!=="object"||!["listening","reading","writing"].includes(s.stage))return null;
 const num=(v:any,min:number,max:number)=>Math.max(min,Math.min(max,Math.floor(Number(v)||min)));
 const answers=(v:any)=>Object.fromEntries(Array.from({length:40},(_,i)=>[String(i+1),String(v?.[String(i+1)]||"").slice(0,200)]));
 const point=(v:any)=>Array.isArray(v?.path)&&v.path.length<=24?{path:v.path.map((n:any)=>num(n,0,4096)),offset:num(v.offset,0,100000)}:null;
 const view=s.view&&typeof s.view==="object"?{
  width:num(s.view.width,240,3840),height:num(s.view.height,240,2160),full:s.view.full===true,
  dark:s.view.dark===true,listeningStarted:s.view.listeningStarted===true,
  highlights:Array.isArray(s.view.highlights)?s.view.highlights.slice(0,64).flatMap((r:any)=>{
   const start=point(r?.start),end=point(r?.end);return start&&end?[{start,end}]:[];
  }):[],
  confirm:s.view.confirm===s.stage?s.stage:null,
  scroll:Array.from({length:24},(_,i)=>num(s.view.scroll?.[i],0,100000))
 }:null;
 return {view,stage:s.stage,lSection:num(s.lSection,1,4),lCurrentQuestion:num(s.lCurrentQuestion,1,40),lAnswers:answers(s.lAnswers),lElapsed:num(s.lElapsed,0,7200),audioState:["idle","playing","ended","resume"].includes(s.audioState)?s.audioState:"idle",rPassage:num(s.rPassage,1,3),rTab:s.rTab==="questions"?"questions":"passage",rAnswers:answers(s.rAnswers),rRemaining:num(s.rRemaining,0,3600),wTask:num(s.wTask,1,2),w1:String(s.w1||"").slice(0,25000),w2:String(s.w2||"").slice(0,25000),wRemaining:num(s.wRemaining,0,3600)};
}
export const liveLeaseActive=(stamp:string|null|undefined,now=Date.now())=>!!stamp&&Number.isFinite(Date.parse(stamp))&&now-Date.parse(stamp)<15000&&now>=Date.parse(stamp);
