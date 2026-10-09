import type {ReactNode} from "react";

/** The passage's literal text is preserved; only its first answer line
 * is replaced with the existing controlled form element. */
export function ReadingGapSentence({text,input}:{text:string;input:ReactNode}){
 const match=/(?:_{3,}|\.{3,}|…[.…]*)/u.exec(text);
 if(!match)return <span className="cr-inline-sentence">{text}{" "}{input}</span>;
 const before=text.slice(0,match.index),after=text.slice(match.index+match[0].length);
 return <span className="cr-inline-sentence">{before}{before&&!/\s$/.test(before)?" ":null}{input}{after&&!/^\s|^[.,;:!?)]/.test(after)?" ":null}{after}</span>;
}

/** Select controls contain their own A–H choices, so don't print the
 * same options above the questions. Keep the instructions themselves. */
export function compactReadingInstruction(raw:string|undefined,isSelect:boolean){
 if(!raw)return "";
 let instruction=raw.trim().replace(/^Questions?\s+\d+(?:\s*[–-]\s*\d+)?\s*[:.·-]?\s*/i,"");
 if(isSelect)instruction=instruction.split(/\n\s*Options\s*:/i)[0].trim();
 return instruction;
}
