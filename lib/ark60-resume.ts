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
