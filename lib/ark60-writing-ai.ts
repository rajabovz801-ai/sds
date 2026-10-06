import "server-only";
import {getServiceSupabase} from "@/lib/supabase/server";

type Obj=Record<string,any>;

const DAILY_WRITING_SCHEMA={
  type:"object",
  additionalProperties:false,
  properties:{
    task_criterion:{type:"number"},
    coherence_cohesion:{type:"number"},
    lexical_resource:{type:"number"},
    grammar:{type:"number"},
    band:{type:"number"},
    summary:{type:"string"},
    strengths:{type:"array",items:{type:"string"}},
    errors:{
      type:"array",
      items:{
        type:"object",
        additionalProperties:false,
        properties:{
          original:{type:"string"},
          correction:{type:"string"},
          category:{type:"string"},
          explanation:{type:"string"}
        },
        required:["original","correction","category","explanation"]
      }
    }
  },
  required:["task_criterion","coherence_cohesion","lexical_resource","grammar","band","summary","strengths","errors"]
};

function responseOutputText(obj:any){
  if(typeof obj?.output_text==="string"&&obj.output_text.trim())return obj.output_text.trim();
  return (Array.isArray(obj?.output)?obj.output:[])
    .flatMap((item:any)=>Array.isArray(item?.content)?item.content:[])
    .filter((part:any)=>part?.type==="output_text"&&typeof part?.text==="string")
    .map((part:any)=>part.text)
    .join("")
    .trim();
}
function roundHalf(v:number){return Math.round(v*2)/2}
function clampBand(v:any){return roundHalf(Math.max(0,Math.min(9,Number(v)||0)))}

function referenceData(day:number){
  if(day===1)return [
    "Exact chart data (jobs in millions):",
    "Manufacturing: 1960 15; 1980 20; 2000 17; 2020 13.",
    "Retail: 1960 6; 1980 10; 2000 15; 2020 16.",
    "Agriculture: 1960 6; 1980 3; 2000 3; 2020 2.",
    "Healthcare: 1960 2; 1980 5; 2000 11; 2020 16."
  ].join("\n");
  if(day===3)return [
    "Exact chart data:",
    "Percentage of world forest: South America 16%, Africa 27%, Asia 14%, Europe 18%, North America 25%.",
    "Percentage of timber: South America 23%, Africa 9%, Asia 18%, Europe 20%, North America 30%."
  ].join("\n");
  if(day===6)return [
    "Exact chart/table data:",
    "Life expectancy in 2008: Japan 81 years; Korea 79; USA 77; Indonesia 70.",
    "Increase from 1953 to 2008: Japan +3.5 years; Korea +12.5; USA +3; Indonesia +15.7."
  ].join("\n");
  return "";
}

function normalize(parsed:any,taskType:string){
  const out={
    task_criterion:clampBand(parsed?.task_criterion),
    coherence_cohesion:clampBand(parsed?.coherence_cohesion),
    lexical_resource:clampBand(parsed?.lexical_resource),
    grammar:clampBand(parsed?.grammar),
    band:0,
    summary:String(parsed?.summary||"").trim().slice(0,1800),
    strengths:(Array.isArray(parsed?.strengths)?parsed.strengths:[]).map((x:any)=>String(x||"").trim()).filter(Boolean).slice(0,6),
    errors:(Array.isArray(parsed?.errors)?parsed.errors:[]).map((x:any)=>({
      original:String(x?.original||"").trim().slice(0,500),
      correction:String(x?.correction||"").trim().slice(0,500),
      category:String(x?.category||"").trim().slice(0,80),
      explanation:String(x?.explanation||"").trim().slice(0,700)
    })).filter((x:any)=>x.original||x.correction).slice(0,12)
  };
  out.band=roundHalf((out.task_criterion+out.coherence_cohesion+out.lexical_resource+out.grammar)/4);
  return {...out,task_type:taskType,criterion_label:taskType==="task1"?"Task Achievement":"Task Response"};
}

export async function gradeArk60Writing(input:{day:number;task_type:string;prompt:string;answer:string;word_count?:number;min_words?:number}){
  const key=process.env.OPENAI_API_KEY||"";
  if(!key)return {ok:false,error:"OpenAI API key is not configured."} as const;
  const model=process.env.OPENAI_WRITING_MODEL||"gpt-5-mini";
  const taskType=input.task_type==="task2"?"task2":"task1";
  const criterion=taskType==="task1"?"Task Achievement":"Task Response";
  const reference=referenceData(Number(input.day)||0);
  const prompt=[
    "You are a strict, consistent IELTS Academic Writing examiner.",
    "Assess ONE student response using the official four IELTS Writing criteria.",
    "Score every criterion from 0 to 9 in 0.5 increments and give a suggested task band.",
    "The first criterion is "+criterion+".",
    "Be evidence-based. Do not inflate the score. Do not punish the same language error twice.",
    "Identify 5-8 of the most useful specific mistakes when possible. For each, quote the student's wording, give a corrected version, classify the error, and briefly explain it.",
    "If the response is below the minimum word count, reflect that in "+criterion+".",
    taskType==="task1"?"For Task 1, judge overview, key features, comparisons and data accuracy. Use the supplied exact chart data when available.":"For Task 2, judge whether all parts of the prompt are addressed, position is clear, ideas are developed and supported.",
    "",
    "TASK TYPE: "+taskType.toUpperCase(),
    "MINIMUM WORDS: "+String(input.min_words||0),
    "STUDENT WORD COUNT: "+String(input.word_count||0),
    "",
    "TASK PROMPT:",
    String(input.prompt||""),
    reference?"\nREFERENCE DATA:\n"+reference:"",
    "",
    "STUDENT RESPONSE:",
    String(input.answer||""),
    "",
    "Return concise teacher-facing feedback. Do not rewrite the whole essay."
  ].join("\n");
  const response=await fetch("https://api.openai.com/v1/responses",{
    method:"POST",
    headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},
    body:JSON.stringify({
      model,
      input:prompt,
      max_output_tokens:8000,
      text:{format:{type:"json_schema",name:"ark60_daily_writing_assessment",strict:true,schema:DAILY_WRITING_SCHEMA}}
    })
  });
  if(!response.ok){
    const detail=(await response.text().catch(()=>"")).slice(0,500);
    console.error("daily writing AI request failed",response.status,detail);
    return {ok:false,error:"AI assessment request failed ("+response.status+")."} as const;
  }
  const obj=await response.json();
  const raw=responseOutputText(obj);
  if(!raw)return {ok:false,error:"AI assessment returned no result."} as const;
  try{
    const assessment=normalize(JSON.parse(raw),taskType);
    return {ok:true,band:assessment.band,assessment,model} as const;
  }catch(e){
    console.error("daily writing AI parse failed",String(e),raw.slice(0,500));
    return {ok:false,error:"AI assessment returned an invalid format."} as const;
  }
}

export async function assessArk60Submission(row:Obj){
  const db=getServiceSupabase();
  const payload={...(row?.payload||{})};
  const graded=await gradeArk60Writing({
    day:Number(row?.day_number)||0,
    task_type:String(payload.task_type||"writing"),
    prompt:String(payload.prompt||""),
    answer:String(payload.answer||""),
    word_count:Number(payload.word_count||0),
    min_words:Number(payload.min_words||0)
  });
  const now=new Date().toISOString();
  if(!graded.ok){
    payload.ai_status="error";
    payload.ai_error=graded.error;
    payload.ai_assessed_at=now;
    await db.from("ark60_submissions").update({payload}).eq("id",row.id).eq("module","writing");
    return {ok:false,id:row.id,error:graded.error};
  }
  payload.ai_status="ready";
  payload.ai_model=graded.model;
  payload.ai_assessed_at=now;
  payload.ai_assessment=graded.assessment;
  delete payload.ai_error;
  const {error}=await db.from("ark60_submissions").update({
    payload,
    band:graded.band,
    review_feedback:graded.assessment.summary||null
  }).eq("id",row.id).eq("module","writing").eq("review_status","pending");
  if(error)return {ok:false,id:row.id,error:"Could not save AI assessment."};
  return {ok:true,id:row.id,band:graded.band,assessment:graded.assessment};
}

export async function assessArk60SubmissionById(id:string){
  const db=getServiceSupabase();
  const {data,error}=await db.from("ark60_submissions")
    .select("id,student_id,day_number,module,payload,review_status")
    .eq("id",id).eq("module","writing").maybeSingle();
  if(error||!data)return {ok:false,id,error:"Writing submission not found."};
  return assessArk60Submission(data);
}

export async function gradePendingArk60WritingBatch(limit=8){
  const db=getServiceSupabase();
  const safeLimit=Math.max(1,Math.min(12,Math.floor(Number(limit)||8)));
  const {data,error}=await db.from("ark60_submissions")
    .select("id,student_id,day_number,module,payload,review_status,submitted_at")
    .eq("module","writing").eq("review_status","pending")
    .order("submitted_at",{ascending:true}).limit(500);
  if(error)throw error;
  const pending=(data||[]).filter((row:any)=>!row?.payload?.ai_assessment).slice(0,safeLimit);
  const results=await Promise.all(pending.map((row:any)=>assessArk60Submission(row)));
  return {
    processed:results.length,
    graded:results.filter((x:any)=>x.ok).length,
    failed:results.filter((x:any)=>!x.ok).length,
    results
  };
}
