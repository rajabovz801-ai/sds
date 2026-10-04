const key=process.env.OPENAI_API_KEY||"";
if(process.env.VERCEL_ENV!=="production"){
  console.log("OPENAI_PROBE_SKIPPED non-production");
  process.exit(0);
}
if(!key){
  console.error("OPENAI_PROBE_FAIL missing OPENAI_API_KEY");
  process.exit(1);
}
const model=process.env.OPENAI_WRITING_MODEL||"gpt-5-mini";
const res=await fetch("https://api.openai.com/v1/responses",{
  method:"POST",
  headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},
  body:JSON.stringify({model,input:"Reply exactly OK.",max_output_tokens:64})
});
if(!res.ok){
  const body=await res.text();
  console.error("OPENAI_PROBE_FAIL",res.status,body.slice(0,240));
  process.exit(1);
}
await res.json().catch(()=>null);
console.log("OPENAI_PROBE_OK",model);
