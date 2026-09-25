import {NextRequest,NextResponse} from "next/server";
import {randomInt} from "node:crypto";
import {getStudent,getAdmin,isDayOpen,isOwnOrigin,isUuid,sqlTable,type Student} from "../../../lib/ark60-content-auth";
export const dynamic="force-dynamic";
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private,no-store"}});
const error=(message:string,status=400)=>json({error:message},status);
type Unit={id:string;day_number:number;source_kind:string;source_ordinal:number;unit_number:number;source_title:string;pass_mark:number;status:string};
type Term={id:string;display_word:string;lemma:string;meaning_uz:string;definition_en:string;level:string;example:string;position:number};
type Question={term_id:string;options:string[]};
const shuffle=<T,>(items:T[]):T[]=>{
 const a=items.slice();for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;
};
async function getUnit(id:string,student:Student,requirePublished=true):Promise<Unit|null>{
 if(!isUuid(id))return null;
 const row=(await sqlTable("ark60_vocab_units","GET",
  "select=id,day_number,source_kind,source_ordinal,unit_number,source_title,pass_mark,status&id=eq."+id+"&limit=1"))[0] as Unit|undefined;
 if(!row||!isDayOpen(Number(row.day_number),student)||(requirePublished&&row.status!=="published"))return null;
 return row;
}
async function terms(id:string):Promise<Term[]>{
 return await sqlTable("ark60_vocab_terms","GET",
  "select=id,display_word,lemma,meaning_uz,definition_en,level,example,position&unit_id=eq."+id+"&order=position.asc") as Term[];
}
async function getAttempt(id:string,student:Student){
 if(!isUuid(id))return null;
 const attempt=(await sqlTable("ark60_vocab_attempts","GET",
  "select=id,student_id,unit_id,attempt_no,questions,answers,correct_count,status,started_at,finished_at&id=eq."+id+"&student_id=eq."+student.id+"&limit=1"))[0];
 if(!attempt)return null;
 const unit=await getUnit(attempt.unit_id,student);
 return unit?{attempt,unit}:null;
}
async function attemptForClient(a:any){
 const all=await terms(a.unit_id),byId=new Map(all.map(t=>[t.id,t]));
 return {id:a.id,attempt_no:a.attempt_no,status:a.status,score:a.correct_count,answered:a.answers.length,
  pass_mark:18,answers:a.answers,started_at:a.started_at,
  questions:(a.questions as Question[]).map((q,i)=>({
   number:i+1,word:byId.get(q.term_id)?.display_word||"",
   level:byId.get(q.term_id)?.level||"B2+",
   context:byId.get(q.term_id)?.example||"",
   options:q.options
  }))
 };
}
export async function GET(req:NextRequest){
 try{
 const params=new URL(req.url).searchParams,action=params.get("action")||"overview";
 if(action==="admin"){
  const admin=await getAdmin(req);if(!admin)return error("Admin access required",401);
  const day=Number(params.get("day")||1);if(!Number.isInteger(day)||day<1||day>60)return error("Invalid day");
  const [units,attempts,students]=await Promise.all([
   sqlTable("ark60_vocab_units","GET","select=id,source_kind,source_ordinal,unit_number,source_title,status&day_number=eq."+day+"&order=source_kind,source_ordinal,unit_number"),
   sqlTable("ark60_vocab_attempts","GET","select=id,student_id,unit_id,attempt_no,correct_count,status,started_at,finished_at&unit_id=in.("+
    (await sqlTable("ark60_vocab_units","GET","select=id&day_number=eq."+day)).map((u:any)=>u.id).join(",")+")"),
   sqlTable("ark60_students","GET","select=id,first_name,last_name,username&status=eq.active&limit=2000")
  ]);
  return json({day,units,attempts,students});
 }
 const student=await getStudent(req);if(!student)return error("Sign in to your challenge account",401);
 if(action==="overview"){
  const day=Number(params.get("day")||1);if(!isDayOpen(day,student))return error("Day is locked",403);
  const units=await sqlTable("ark60_vocab_units","GET",
   "select=id,day_number,source_kind,source_ordinal,unit_number,source_title,pass_mark,status&day_number=eq."+day+"&status=eq.published&order=source_kind,source_ordinal,unit_number") as Unit[];
  if(!units.length)return json({day,units:[],word_count:0,completed_count:0});
  const ids=units.map(u=>u.id);
  const attempts=await sqlTable("ark60_vocab_attempts","GET",
   "select=id,unit_id,attempt_no,correct_count,status,finished_at&student_id=eq."+student.id+"&unit_id=in.("+ids.join(",")+")&order=attempt_no.desc");
  const counts=await sqlTable("ark60_vocab_terms","GET","select=unit_id&unit_id=in.("+ids.join(",")+")&limit=2000");
  return json({day,units:units.map(u=>{
   const mine=attempts.filter((a:any)=>a.unit_id===u.id);
   return {...u,word_count:counts.filter((x:any)=>x.unit_id===u.id).length,
     best_score:mine.length?Math.max(...mine.map((x:any)=>Number(x.correct_count))):null,
     completed:mine.some((a:any)=>a.status==="completed"),
     attempts:mine.length,
     in_progress:mine.find((a:any)=>a.status==="in_progress")?.id||null};
   }),preview:student.username.toLowerCase()==="rustam7"});
 }
 if(action==="learn"){
  const id=params.get("unit")||"",unit=await getUnit(id,student);if(!unit)return error("Unit unavailable",404);
  const words=await terms(id);if(words.length!==20)return error("This unit is being prepared",409);
  return json({unit,words:words.map(({id,lemma,display_word,meaning_uz,definition_en,level,example})=>({
   id,lemma,display_word,meaning_uz,definition_en,level,example
  }))});
 }
 if(action==="attempt"){
  const record=await getAttempt(params.get("id")||"",student);if(!record)return error("Attempt not found",404);
  return json({unit:record.unit,attempt:await attemptForClient(record.attempt)});
 }
 return error("Unknown action",404);
 }catch(e){console.error("Vocabulary GET",e);return error("Unable to load vocabulary right now",503)}
}
export async function POST(req:NextRequest){
 try{
 if(!isOwnOrigin(req))return error("Invalid origin",403);
 const student=await getStudent(req);if(!student)return error("Sign in to your challenge account",401);
 const body=await req.json(),action=String(body.action||"");
 if(action==="start"){
  const unit=await getUnit(String(body.unit_id||""),student);
  if(!unit)return error("Unit is unavailable or locked",403);
  const all=await terms(unit.id);
  if(all.length!==20||new Set(all.map(t=>t.meaning_uz.toLowerCase())).size!==20)
   return error("Quiz is still being prepared",409);
  const attempts=await sqlTable("ark60_vocab_attempts","GET",
   "select=id,unit_id,attempt_no,questions,answers,correct_count,status,started_at,finished_at&student_id=eq."+student.id+"&unit_id=eq."+unit.id+"&order=attempt_no.desc");
  const current=attempts.find((a:any)=>a.status==="in_progress");
  if(current)return json({unit,attempt:await attemptForClient(current)});
  if(attempts.some((a:any)=>a.status==="completed"))
    return error("Unit completed. Review your results in the unit overview.",409);
  const no=(attempts[0]?.attempt_no||0)+1;
  const questions=shuffle(all).map(term=>{
   const wrong=shuffle(all.filter(w=>w.id!==term.id&&w.meaning_uz!==term.meaning_uz)).slice(0,3);
   return {term_id:term.id,options:shuffle([term,...wrong].map(t=>t.meaning_uz))};
  });
  const inserted=await sqlTable("ark60_vocab_attempts","POST","",
   {student_id:student.id,unit_id:unit.id,attempt_no:no,questions,answers:[],correct_count:0,status:"in_progress"},
   "return=representation");
  return json({unit,attempt:await attemptForClient(inserted[0])});
 }
 if(action==="answer"){
  const record=await getAttempt(String(body.attempt_id||""),student);
  if(!record)return error("Attempt unavailable",404);
  const position=Number(body.position),choice=Number(body.choice);
  if(!Number.isInteger(position)||!Number.isInteger(choice)||position<1||position>20||choice<0||choice>3)
   return error("Invalid answer",400);
  const response=await sqlTable("rpc/ark60_vocab_submit_answer","POST","",
   {p_student:student.id,p_attempt:record.attempt.id,p_position:position,p_choice:choice});
  return json(response);
 }
 return error("Unknown action",404);
 }catch(e){
  console.error("Vocabulary POST",e);
  return error("Could not save this quiz action. Reload to resume your saved attempt.",409);
 }
}
