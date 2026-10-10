"use client";

type Props={part:number;currentQuestion:number;questionClass:(question:number)=>string;onPart:(part:number)=>void;onQuestion:(question:number)=>void};

export default function ListeningPartNavigation({part,currentQuestion,questionClass,onPart,onQuestion}:Props){
 return <>
  <div className="ls-part-tabs" role="group" aria-label="Listening parts">{[1,2,3,4].map(n=><button type="button" key={n} aria-pressed={part===n} className={part===n?"active":""} onClick={()=>onPart(n)}>Part {n}</button>)}</div>
  <div className="ls-question-numbers" role="group" aria-label={"Part "+part+" questions"}>{Array.from({length:10},(_,i)=>(part-1)*10+i+1).map(q=><button type="button" key={q} aria-label={"Question "+q} aria-current={currentQuestion===q?"step":undefined} className={(currentQuestion===q?"current ":"")+questionClass(q)} onClick={()=>onQuestion(q)}>{q}</button>)}</div>
 </>;
}
