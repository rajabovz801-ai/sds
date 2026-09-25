import {NextRequest,NextResponse} from "next/server";
import {getStudent,getAdmin,isDayOpen,isOwnOrigin,sqlTable} from "../../../lib/ark60-content-auth";
export const dynamic="force-dynamic";
const send=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private,no-store"}});
const fail=(message:string,status=400)=>send({error:message},status);
async function article(day:number){
 return (await sqlTable("ark60_articles","GET",
 "select=id,day_number,slug,title,byline,deck,sections,status&day_number=eq."+day+"&status=eq.published&limit=1"))[0]||null;
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
  return send({article:{id:a.id,title:a.title},students,progress});
 }
 const user=await getStudent(req);if(!user)return fail("Sign in to your challenge account",401);
 if(!isDayOpen(day,user))return fail("This study day is locked",403);
 const a=await article(day);if(!a)return fail("Article has not been published",404);
 const [progress,units,words]=await Promise.all([
  sqlTable("ark60_article_progress","GET","select=last_page,visited_pages,completed_at&student_id=eq."+user.id+"&article_id=eq."+a.id+"&limit=1"),
  sqlTable("ark60_vocab_units","GET","select=id,unit_number,status&day_number=eq."+day+"&source_kind=eq.article&source_ordinal=eq.1&status=eq.published"),
  sqlTable("ark60_vocab_terms","GET","select=id,lemma,display_word,meaning_uz,definition_en,level,example,unit_id&unit_id=in.("+
   (await sqlTable("ark60_vocab_units","GET","select=id&day_number=eq."+day+"&source_kind=eq.article&source_ordinal=eq.1")).map((u:any)=>u.id).join(",")+")")
 ]);
 return send({article:a,progress:progress[0]||{last_page:0,visited_pages:[],completed_at:null},
   glossary:words.filter((w:any)=>units.some((u:any)=>u.id===w.unit_id)),vocabulary_units:units});
 }catch(e){console.error("Article GET",e);return fail("Unable to load article",503)}
}
export async function POST(req:NextRequest){
 try{
 if(!isOwnOrigin(req))return fail("Invalid origin",403);
 const user=await getStudent(req);if(!user)return fail("Sign in to your challenge account",401);
 const body=await req.json(),day=Number(body.day||1),action=String(body.action||"");
 if(!isDayOpen(day,user))return fail("Day locked",403);
 const a=await article(day);if(!a)return fail("Article not found",404);
 const progress=(await sqlTable("ark60_article_progress","GET",
   "select=student_id,article_id,last_page,visited_pages,completed_at&student_id=eq."+user.id+"&article_id=eq."+a.id+"&limit=1"))[0];
 const total=Array.isArray(a.sections)?a.sections.length:0;
 if(action==="page"){
  const n=Number(body.page);if(!Number.isInteger(n)||n<1||n>total)return fail("Invalid page",400);
  const visited=[...new Set([...(progress?.visited_pages||[]),n])].sort((x:any,y:any)=>x-y);
  const saved=await sqlTable("ark60_article_progress","POST","on_conflict=student_id,article_id",
   {student_id:user.id,article_id:a.id,last_page:Math.max(n,Number(progress?.last_page||0)),visited_pages:visited,
     completed_at:progress?.completed_at||null,updated_at:new Date().toISOString()},
   "resolution=merge-duplicates,return=representation");
  return send({progress:saved[0]});
 }
 if(action==="finish"){
  const visited=progress?.visited_pages||[];
  if(visited.length<total)return fail("Read all five article pages before completing",409);
  const saved=await sqlTable("ark60_article_progress","PATCH",
   "student_id=eq."+user.id+"&article_id=eq."+a.id,
   {completed_at:progress?.completed_at||new Date().toISOString(),updated_at:new Date().toISOString()},
   "return=representation");
  return send({progress:saved[0]});
 }
 return fail("Unknown action",404);
 }catch(e){console.error("Article POST",e);return fail("Could not save article progress",503)}
}
