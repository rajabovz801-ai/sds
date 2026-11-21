"use client";
import {createElement,type ReactNode} from "react";
import "./mock-worksheet.css";
export type WorksheetNode=string|{q:number;options?:{value:string;text:string}[]}|{tag:string;className?:string;src?:string;alt?:string;children:WorksheetNode[]};
export default function MockWorksheet({nodes,answers,onAnswer,kind}:{nodes:WorksheetNode[];answers:Record<string,string>;onAnswer:(q:number,value:string)=>void;kind:"listening"|"reading"}){
 function render(node:WorksheetNode,index:number):ReactNode{
  if(typeof node==="string")return node;
  if("q" in node){
   const q=node.q,props={id:(kind==="listening"?"listen-q-":"question-")+q,"aria-label":"Answer to question "+q,value:answers[String(q)]||"",onChange:(e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement>)=>onAnswer(q,e.target.value),className:"cr-gap mock-worksheet-answer"};
   return node.options?<select key={index} {...props}><option value="">Select</option>{node.options.map(o=><option key={o.value} value={o.value}>{o.text}</option>)}</select>:<input key={index} {...props} autoComplete="off" spellCheck={false}/>;
  }
  if(node.tag==="img")return <img key={index} src={node.src} alt={node.alt||"Mock visual"}/>;
  if(node.tag==="br")return <br key={index}/>;
  const allowed=["div","p","span","b","strong","em","i","ul","li","table","thead","tbody","tr","th","td","h3","h4"];
  return createElement(allowed.includes(node.tag)?node.tag:"span",{key:index,className:node.className},...(node.children||[]).map(render));
 }
 return <div className="mock-worksheet">{nodes.map(render)}</div>;
}
