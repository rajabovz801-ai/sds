/** Admin presentation helpers; server-side grading and authorization stay authoritative. */
const views:Record<string,string>={overview:'Overview',reading:'Reading results',listening:'Listening results',mock:'Full Mock results',writing:'Writing inbox',speaking:'Speaking inbox',requests:'Requests',billing:'To‘lovlar',students:'Students',leaderboard:'Leaderboard',time:'Study time',admins:'Admins',notifications:'Notifications'};
export const ADMIN_REPORT_VIEWS=['Reading results','Listening results','Full Mock results','Writing inbox','Speaking inbox'];
export function adminViewFromSearch(search:string):string{return views[new URLSearchParams(search).get('section')||'overview']||'Overview'}
export function adminViewUrl(view:string,id?:string):string{
 const section=Object.keys(views).find(key=>views[key]===view)||'overview';
 const query=new URLSearchParams({section});if(id)query.set('id',id);
 return '/admin?'+query.toString();
}
export function parseReviewBand(value:string|undefined):number|null{
 if(!value?.trim())return null;
 const n=Number(value);return Number.isFinite(n)&&n>=0&&n<=9&&Number.isInteger(n*2)?n:null;
}
export function mergeReviewDrafts(server:Record<string,string>,current:Record<string,string>,dirty:Set<string>):Record<string,string>{
 const merged={...server};for(const id of Object.keys(server))if(dirty.has(id)&&Object.hasOwn(current,id))merged[id]=current[id];return merged;
}
