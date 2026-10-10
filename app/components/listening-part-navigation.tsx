"use client";
import {Fragment} from "react";
import "./exam-part-navigation.css";

type Props={part:number;currentQuestion:number;questionClass:(question:number)=>string;onPart:(part:number)=>void;onQuestion:(question:number)=>void;parts?:number[];questions?:number[];label?:string};

export default function ListeningPartNavigation({part,currentQuestion,questionClass,onPart,onQuestion,parts=[1,2,3,4],questions=Array.from({length:10},(_,i)=>(part-1)*10+i+1),label="Listening parts"}:Props){
 return <div className="exam-part-strip" role="group" aria-label={label}>{parts.map(n=><Fragment key={n}>
  <button type="button" aria-pressed={part===n} className={"exam-part-tab "+(part===n?"active":"")} onClick={()=>onPart(n)}>Part {n}</button>
  {part===n&&<div className="exam-question-numbers" role="group" aria-label={"Part "+part+" questions"}>{questions.map(q=><button type="button" key={q} aria-label={"Question "+q} aria-current={currentQuestion===q?"step":undefined} className={(currentQuestion===q?"current ":"")+questionClass(q)} onClick={()=>onQuestion(q)}>{q}</button>)}</div>}
 </Fragment>)}</div>;
}
