import {normalizeArticleSections,normalizeArticleProgress} from "@/lib/ark60-article";
import {hasCompletedResult} from "@/lib/billing/server";
import {NextRequest,NextResponse} from "next/server";
import {getStudent,getAdmin,isDayUnlocked,isOwnOrigin,isPreview,sqlTable} from "../../../lib/ark60-content-auth";
export const dynamic="force-dynamic";
const send=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private,no-store"}});
const fail=(message:string,status=400)=>send({error:message},status);
async function article(day:number){
 const row=(await sqlTable("ark60_articles","GET",
 "select=id,day_number,slug,title,byline,deck,sections,status&day_number=eq."+day+"&status=eq.published&limit=1"))[0]||null;
 return row?{...row,sections:normalizeArticleSections(row.sections||[])}:null;
}
export async function GET(req:NextRequest){
 try{
 const url=new URL(req.url),action=url.searchParams.get("action")||"article",day=Number(url.searchParams.get("day")||1);
 if(action==="admin"){
  const admin=await getAdmin(req);if(!admin)return fail("Admin login required",401);
  const a=await article(day);if(!a)return send({article:null,students:[],progress:[]});
  const [progress,students]=await Promise.all([
   sqlTable("ark60_article_progress","GET","select=student_id,article_id,last_page,visited_pages,completed_at,updated_at&article_id=eq."+a.id),
   sqlTable("ark60_students","GET","select=id,first_name,last_name,username&status=eq.active&limit=2000")
  ]);
  const realStudents=students.filter((s:any)=>String(s.username||"").toLowerCase()!=="rustam7");
  const ids=new Set(realStudents.map((s:any)=>s.id));
  return send({article:{id:a.id,title:a.title},students:realStudents,progress:progress.filter((p:any)=>ids.has(p.student_id))});
 }
 const user=await getStudent(req);if(!user)return fail("Sign in to your challenge account",401);
 if(action==="availability"){
  if(!Number.isInteger(day)||day<1||day>60)return fail("Invalid day",400);
  const a=await article(day);return send({published:!!a,title:a?.title||null});
 }
 if(!(await isDayUnlocked(day,user,"article",true))&&!(await hasCompletedResult(user.id,day,"article")))return fail("This study day is locked",403);
 const a=await article(day);if(!a)return fail("Article has not been published",404);
 const [progress,units]=await Promise.all([
  sqlTable("ark60_article_progress","GET","select=last_page,visited_pages,completed_at&student_id=eq."+user.id+"&article_id=eq."+a.id+"&limit=1"),
  sqlTable("ark60_vocab_units","GET","select=id,unit_number,status&day_number=eq."+day+"&source_kind=eq.article&source_ordinal=eq.1&status=eq.published")
 ]);
 const words=units.length?await sqlTable("ark60_vocab_terms","GET","select=id,lemma,display_word,meaning_uz,definition_en,level,example,unit_id,position&unit_id=in.("+units.map((u:any)=>u.id).join(",")+")"):[];
 const preview=isPreview(user);
 return send({article:a,preview,progress:preview?{last_page:0,visited_pages:[],completed_at:null}:normalizeArticleProgress(progress[0],a.sections),
   glossary:words.filter((w:any)=>units.some((u:any)=>u.id===w.unit_id)).sort((a:any,b:any)=>{const au=units.find((u:any)=>u.id===a.unit_id)?.unit_number||0,bu=units.find((u:any)=>u.id===b.unit_id)?.unit_number||0;return au-bu||a.position-b.position}),vocabulary_units:units});
 }catch(e){console.error("Article GET",e);return fail("Unable to load article",503)}
}
export async function POST(req:NextRequest){
 try{
 const declared=Number(req.headers.get("content-length")||0);if(Number.isFinite(declared)&&declared>12000)return fail("Request too large",413);
 if(!isOwnOrigin(req))return fail("Invalid origin",403);
 const user=await getStudent(req);if(!user)return fail("Sign in to your challenge account",401);
 const body=await req.json(),day=Number(body.day||1),action=String(body.action||"");
 if(!(await isDayUnlocked(day,user)))return fail("Day locked",403);
 if(isPreview(user))return fail("Preview article progress is kept only in this browser session and is not saved.",409);
 const a=await article(day);if(!a)return fail("Article not found",404);
 const progress=(await sqlTable("ark60_article_progress","GET",
   "select=student_id,article_id,last_page,visited_pages,completed_at&student_id=eq."+user.id+"&article_id=eq."+a.id+"&limit=1"))[0];
 const total=Array.isArray(a.sections)?a.sections.length:0;
 if(action==="page"||action==="finish"){
  const normalized=normalizeArticleProgress(progress,a.sections);
  const n=action==='finish'?normalized.last_page:Number(body.page);
  const visited=action==='finish'?[]:(body.visited_pages??[n]);
  if(!Number.isInteger(n)||n<1||n>total||!Array.isArray(visited)||visited.some((v:unknown)=>!Number.isInteger(v)||Number(v)<1||Number(v)>total))return fail("Invalid article position",400);
  try{
   const saved=await sqlTable("rpc/ark60_article_save_progress","POST","",{p_student:user.id,p_article:a.id,p_page:n,p_visited:visited,p_finish:action==='finish'});
   return send({progress:normalizeArticleProgress(saved,a.sections)});
  }catch(e){if(String(e).includes('Read the entire article'))return fail("Read the entire article before completing",409);throw e;}
 }
 return fail("Unknown action",404);
 }catch(e){console.error("Article POST",e);return fail("Could not save article progress",503)}
}
