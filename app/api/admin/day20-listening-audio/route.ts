import {NextRequest,NextResponse} from "next/server";
import {getAdmin,isOwnOrigin} from "@/lib/ark60-content-auth";
import {getServiceSupabase} from "@/lib/supabase/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const DAY=20;
const BUCKET="ark-english-content";
const DIRECTORY="listening/day20";
const FILE="test154-602f2fcf108e.mp3";
const OBJECT_PATH=DIRECTORY+"/"+FILE;
const EXPECTED_SIZE=28268395;
const EXPECTED_SHA256="602f2fcf108ec17c6edaeac69b10b31811f5b510fe16c1fba83a719dd5feebb0";
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}});

export async function GET(req:NextRequest){
 const admin=await getAdmin(req);
 if(!admin)return json({detail:"Admin sign-in required."},401);
 try{
  const db=getServiceSupabase();
  const {data,error}=await db.from("ark60_content").select("payload").eq("day_number",DAY).eq("module","listening").maybeSingle();
  if(error)throw error;
  const current=String(data?.payload?.audio_url||"");
  return json({ok:true,storage_connected:current.includes("/storage/v1/object/public/"+BUCKET+"/"+OBJECT_PATH),current_source:current.includes("archive.org")?"Archive.org":current.includes("supabase.co")?"Supabase Storage":"Other"});
 }catch(e){console.error("Day 20 audio status",e);return json({detail:"Unable to check Day 20 audio."},500)}
}

export async function POST(req:NextRequest){
 if(!isOwnOrigin(req))return json({detail:"Invalid request origin."},403);
 const admin=await getAdmin(req);
 if(!admin)return json({detail:"Admin sign-in required."},401);
 let body:any;
 try{body=await req.json()}catch{return json({detail:"Invalid JSON."},400)}
 const action=String(body?.action||"");
 const db=getServiceSupabase();
 try{
  if(action==="sign"){
   if(Number(body?.size)!==EXPECTED_SIZE||String(body?.sha256)!==EXPECTED_SHA256)return json({detail:"This is not the verified TEST 154 MP3 file."},400);
   const {data,error}=await db.storage.from(BUCKET).createSignedUploadUrl(OBJECT_PATH);
   if(error||!data?.token)return json({detail:error?.message||"Unable to generate signed upload."},500);
   return json({ok:true,path:OBJECT_PATH,token:data.token});
  }
  if(action==="finalize"){
   // Do not change any questions, answer key, attempts, or other day.
   const {data:files,error:listingError}=await db.storage.from(BUCKET).list(DIRECTORY,{limit:100,search:FILE});
   if(listingError)throw listingError;
   const uploaded=(files||[]).find(x=>x.name===FILE);
   const fileSize=Number(uploaded?.metadata?.size||0);
   if(!uploaded||fileSize!==EXPECTED_SIZE)return json({detail:"MP3 has not finished uploading or has an unexpected size."},409);
   const {data:publicFile}=db.storage.from(BUCKET).getPublicUrl(OBJECT_PATH);
   const publicUrl=publicFile.publicUrl;
   const {data:current,error:currentError}=await db.from("ark60_content").select("id,payload").eq("day_number",DAY).eq("module","listening").eq("status","published").maybeSingle();
   if(currentError||!current?.id||!current?.payload)throw currentError||new Error("Listening content missing");
   if(String(current.payload.test_code)!=="TEST-154")return json({detail:"Day 20 is no longer TEST 154."},409);
   const payload={...current.payload,audio_url:publicUrl};
   delete payload.audio_urls;
   const {error:writeError}=await db.from("ark60_content").update({payload,updated_at:new Date().toISOString()}).eq("id",current.id).eq("day_number",DAY).eq("module","listening");
   if(writeError)throw writeError;
   return json({ok:true,published:true,audio_url:publicUrl,file_size:fileSize});
  }
  return json({detail:"Unknown upload action."},400);
 }catch(e){console.error("Day 20 audio upload",e);return json({detail:"Could not complete Day 20 audio upload."},500)}
}
