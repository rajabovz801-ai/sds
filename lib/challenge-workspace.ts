type Completed = {day_number:number;module:string};
type Required = Record<string,string[]>;
export function moduleCompletion(module:string,required:Required,completed:Completed[]){
 const days=Object.entries(required).filter(([,modules])=>modules.includes(module)).map(([day])=>Number(day));
 const done=days.filter(day=>completed.some(item=>item.day_number===day&&item.module===module)).length;
 return {done,total:days.length,percent:days.length?Math.round(done/days.length*100):0};
}
export function canResume(resume:{day:number;area:string},required:Required,completed:Completed[]){
 const modules=required[String(resume.day)]||[];
 const pending=modules.filter(module=>!completed.some(item=>item.day_number===resume.day&&item.module===module));
 return resume.area==='Day'||resume.area==='Mock'?pending.length>0:pending.includes(resume.area.toLowerCase());
}
const months=['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentabr','oktabr','noyabr','dekabr'];
export function formatUzDate(value:string|null|undefined){
 if(!value)return '—';
 const date=new Date(value.length===10?value+'T00:00:00+05:00':value);
 if(!Number.isFinite(date.getTime()))return '—';
 const parts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tashkent',day:'numeric',month:'numeric',year:'numeric'}).formatToParts(date);
 const part=(type:string)=>Number(parts.find(p=>p.type===type)?.value);
 return `${part('day')}-${months[part('month')-1]} ${part('year')}`;
}
