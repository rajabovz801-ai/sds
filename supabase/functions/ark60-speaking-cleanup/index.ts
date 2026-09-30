import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {createClient} from "npm:@supabase/supabase-js@2";

const BUCKET="ark60-speaking-audio";

Deno.serve(async(req:Request)=>{
  const url=Deno.env.get("SUPABASE_URL");
  const key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!key)return new Response(JSON.stringify({detail:"Server configuration missing"}),{status:500,headers:{"Content-Type":"application/json"}});
  const supabase=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:config,error:configError}=await supabase.from("ark60_internal_config").select("value").eq("key","speaking_cleanup_token").maybeSingle();
  if(configError||!config?.value)return new Response(JSON.stringify({detail:"Cleanup configuration missing"}),{status:500,headers:{"Content-Type":"application/json"}});
  if(req.headers.get("x-ark-cleanup-token")!==config.value)return new Response(JSON.stringify({detail:"Unauthorized"}),{status:401,headers:{"Content-Type":"application/json"}});

  const now=new Date().toISOString();
  const {data:attempts,error}=await supabase.from("ark60_speaking_attempts")
    .select("id,student_id,day_number,expires_at")
    .eq("status","submitted").eq("audio_expired",false).lte("expires_at",now).limit(200);
  if(error)return new Response(JSON.stringify({detail:"Query failed"}),{status:500,headers:{"Content-Type":"application/json"}});

  let cleaned=0,objects=0,failed=0;
  for(const attempt of attempts||[]){
    const {data:answers,error:answerError}=await supabase.from("ark60_speaking_answers").select("storage_path").eq("attempt_id",attempt.id);
    if(answerError){failed++;continue}
    const paths=(answers||[]).map((a:any)=>a.storage_path).filter(Boolean);
    if(paths.length){
      const {error:removeError}=await supabase.storage.from(BUCKET).remove(paths);
      if(removeError){
        const m=String(removeError.message||"").toLowerCase();
        if(!m.includes("not found")&&!m.includes("does not exist")){failed++;continue}
      }
      objects+=paths.length;
    }
    const {error:deleteError}=await supabase.from("ark60_speaking_answers").delete().eq("attempt_id",attempt.id);
    if(deleteError){failed++;continue}
    const {error:updateError}=await supabase.from("ark60_speaking_attempts")
      .update({audio_expired:true,updated_at:new Date().toISOString()})
      .eq("id",attempt.id).eq("audio_expired",false);
    if(updateError){failed++;continue}
    const {data:submission}=await supabase.from("ark60_submissions").select("id,payload")
      .eq("student_id",attempt.student_id).eq("day_number",attempt.day_number).eq("module","speaking").maybeSingle();
    if(submission)await supabase.from("ark60_submissions").update({payload:{...(submission.payload||{}),audio_expired:true}}).eq("id",submission.id);
    cleaned++;
  }
  return new Response(JSON.stringify({ok:true,checked:(attempts||[]).length,cleaned,objects,failed}),{
    status:200,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}
  });
});
