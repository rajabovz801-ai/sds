/** Display-only helpers. Never used to grant or revoke access. */
export const ADMIN_MOCK_DAYS=Array.from({length:60},(_,i)=>i+1).filter(day=>new Date(Date.UTC(2026,9,day)).getUTCDay()===0);
export function defaultMockDay(now=new Date(),requested?:string|null):number{
 const explicit=Number(requested);
 if(requested&&ADMIN_MOCK_DAYS.includes(explicit))return explicit;
 const local=new Date(now.getTime()+5*3600000);
 const today=Math.floor((Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate())-Date.UTC(2026,9,1))/86400000)+1;
 return ADMIN_MOCK_DAYS.filter(day=>day<=today).at(-1)??ADMIN_MOCK_DAYS[0];
}
export function membershipProgress(startsAt:string,expiresAt:string,now:number){
 const start=Date.parse(startsAt),end=Date.parse(expiresAt);
 if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start)return null;
 if(now<start)return {percent:100,tone:'scheduled',label:'Boshlanishi kutilmoqda'};
 if(now>=end)return {percent:0,tone:'expired',label:'Muddati tugagan'};
 const hours=Math.ceil((end-now)/3600000);
 return {percent:Math.min(100,Math.max(0,(end-now)/(end-start)*100)),tone:hours<=48?'ending':'active',label:`${Math.floor(hours/24)} kun ${hours%24} soat qoldi`};
}
export function grantDisplayState(grant:{starts_at:string;expires_at:string|null;mock_on:string|null},now:number):string{
 if(Date.parse(grant.starts_at)>now)return 'scheduled';
 if(grant.expires_at)return membershipProgress(grant.starts_at,grant.expires_at,now)?.tone??'unknown';
 return grant.mock_on&&grant.mock_on<new Date(now+5*3600000).toISOString().slice(0,10)?'expired':'active';
}
export function beginAdminRequest(current:AbortController|null,silent:boolean):AbortController|null{
 if(silent&&current&&!current.signal.aborted)return null;
 current?.abort();
 return new AbortController();
}
