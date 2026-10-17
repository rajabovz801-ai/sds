export type ChallengeProgress={
 preview?:boolean;
 membership?:{enforced:boolean;challenge_until:string|null;mock_dates:string[];trial_eligible:boolean};
 required_by_day?:Record<string,string[]>;
 completed?:Array<{day_number:number;module:string}>;
 completed_mock_days?:number[];
};

export function isChallengeMockDay(day:number){
 return Number.isInteger(day)&&day>=1&&day<=60&&new Date(Date.UTC(2026,9,day)).getUTCDay()===0;
}

export function challengeDayUnlocked(day:number,stats:ChallengeProgress|null,today:string,now=Date.now()){
 if(!Number.isInteger(day)||day<1||day>60||!stats)return false;
 if(stats.preview)return true;
 // Personal-code mocks must be reachable even without a billing package; their server gate verifies payment codes.
 if(day===18)return new Date(Date.UTC(2026,9,day)).toISOString().slice(0,10)<=today&&now>=Date.UTC(2026,9,18,4,0,0);
 if(stats.membership?.enforced){
   const date=new Date(Date.UTC(2026,9,day)),iso=date.toISOString().slice(0,10),m=stats.membership;
   if(iso>today)return false;
   if(date.getUTCDay()===0)return m.mock_dates.includes(iso);
   return !!(m.challenge_until&&Date.parse(m.challenge_until)>now)||(m.trial_eligible&&day<=2);
 }
 if(day===4&&now<Date.UTC(2026,9,4,5,0,0))return false;
 if(new Date(Date.UTC(2026,9,day)).toISOString().slice(0,10)>today)return false;
 // Sunday events are available independently of unfinished study days.
 if(isChallengeMockDay(day))return true;
 const finishedMocks=new Set(stats.completed_mock_days||[]);
 for(let prior=1;prior<day;prior+=1){
  const required=stats.required_by_day?.[String(prior)]||[];
  if(!required.length)continue;
  if(isChallengeMockDay(prior)&&!finishedMocks.has(prior))return false;
  const done=new Set((stats.completed||[]).filter(x=>Number(x.day_number)===prior).map(x=>x.module));
  if(!required.every(module=>done.has(module)))return false;
 }
 return true;
}
