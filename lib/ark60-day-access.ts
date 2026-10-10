export type ChallengeProgress={
 preview?:boolean;
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
