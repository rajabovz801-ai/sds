export const CHALLENGE_RESUME_STORAGE_KEY = "ark60-last-study-location";

export type ChallengeArea = "Day" | "Reading" | "Listening" | "Article" | "Vocabulary" | "Writing" | "Speaking" | "Mock";
export type ChallengeResume = {href:string;area:ChallengeArea;day:number;savedAt:number};

const RESUME_PATH = /^\/day\/([1-9]|[1-5]\d|60)(?:\/(reading|listening|article|vocabulary|writing|speaking|mock))?\/?$/;
const AREAS:readonly ChallengeArea[]=["Day","Reading","Listening","Article","Vocabulary","Writing","Speaking","Mock"];

export function isChallengeResumePath(path:unknown):path is string{
 return typeof path==="string"&&RESUME_PATH.test(path);
}

export function createChallengeResume(path:unknown,area:unknown,savedAt=Date.now()):ChallengeResume|null{
 if(typeof path!=="string"||typeof area!=="string"||!AREAS.includes(area as ChallengeArea))return null;
 const normalized=path.split(/[?#]/,1)[0].replace(/\/+$/,"");
 if(!isChallengeResumePath(normalized)||!Number.isFinite(savedAt)||savedAt<0)return null;
 const match=normalized.match(RESUME_PATH);
 if(!match)return null;
 const route=(match[2]||"").toLowerCase();
 const expected=route?route==="mock"?"Mock":route[0].toUpperCase()+route.slice(1):"Day";
 if(area!==expected)return null;
 return {href:normalized,area:area as ChallengeArea,day:Number(match[1]),savedAt:Math.floor(savedAt)};
}

export function parseChallengeResume(value:string|null):ChallengeResume|null{
 if(!value)return null;
 try{
  const parsed=JSON.parse(value) as {href?:unknown;area?:unknown;savedAt?:unknown};
  return createChallengeResume(parsed.href,parsed.area,Number(parsed.savedAt));
 }catch{return null}
}

/** Last completed activity is a safe starting point when migrating from device-only resume. */
export function suggestChallengeResume(
 required:Record<string,string[]>,
 completed:Array<{day_number:number;module:string}>,
 latestDay:number
):ChallengeResume|null{
 const cap=Math.max(1,Math.min(60,Math.floor(latestDay)));
 const last=Math.max(1,...completed.map(item=>Number(item.day_number)||0).filter(day=>day>=1&&day<=cap));
 const days=[...Array.from({length:cap-last+1},(_,i)=>i+last),...Array.from({length:last-1},(_,i)=>i+1)];
 for(const day of days){
  const needed=required[String(day)]||[];
  if(!needed.length)continue;
  const pending=needed.find(module=>!completed.some(x=>x.day_number===day&&x.module===module));
  if(!pending)continue;
  const sunday=new Date(Date.UTC(2026,9,day)).getUTCDay()===0;
  const area=sunday?"Mock":(pending[0].toUpperCase()+pending.slice(1).toLowerCase()) as ChallengeArea;
  const path="/day/"+day+(sunday?"/mock":"/"+pending.toLowerCase());
  const found=createChallengeResume(path,area,0);
  if(found)return found;
 }
 return null;
}
