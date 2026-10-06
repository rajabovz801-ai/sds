import {NextRequest,NextResponse} from "next/server";
import {getServiceSupabase} from "@/lib/supabase/server";
import {gradePendingArk60WritingBatch} from "@/lib/ark60-writing-ai";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=300;

function json(body:any,status=200){return NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}})}

export async function GET(req:NextRequest){
  try{
    const url=new URL(req.url);
    const token=String(url.searchParams.get("token")||"");
    if(!token)return json({detail:"Forbidden"},403);
    const db=getServiceSupabase();
    const {data,error}=await db.from("ark60_internal_config").select("value").eq("key","writing_ai_backfill_token").maybeSingle();
    if(error||!data?.value||token!==String(data.value))return json({detail:"Forbidden"},403);
    const limit=Math.max(1,Math.min(12,Number(url.searchParams.get("limit")||8)));
    const result=await gradePendingArk60WritingBatch(limit);
    return json({ok:true,...result});
  }catch(e){
    console.error("writing AI backfill",e);
    return json({detail:"Backfill failed."},500);
  }
}
