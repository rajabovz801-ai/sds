"use client";
import {useEffect,useState} from "react";
import {UploadCloud,CheckCircle2,AlertCircle} from "lucide-react";
import {supabase} from "@/lib/supabase/client";

const EXPECTED_SIZE=28268395;
const EXPECTED_SHA="602f2fcf108ec17c6edaeac69b10b31811f5b510fe16c1fba83a719dd5feebb0";
const ENDPOINT="/api/admin/day20-listening-audio";

export default function Day20AudioUploader(){
 const [active,setActive]=useState(false);
 const [linked,setLinked]=useState(false);
 const [status,setStatus]=useState("");

 useEffect(()=>{
  void fetch(ENDPOINT,{credentials:"same-origin",cache:"no-store"})
   .then(r=>r.ok?r.json():null).then(d=>setLinked(!!d?.storage_connected)).catch(()=>{});
 },[]);

 async function finalize(){
  const response=await fetch(ENDPOINT,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"finalize"})});
  const value=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(value.detail||"Supabase file verification failed.");
  setLinked(true);
  setStatus("TEST 154 MP3 was verified and linked to Day 20.");
 }

 async function upload(file:File|null){
  if(!file||active)return;
  setActive(true);setStatus("Checking TEST 154 audio…");
  try{
   if(file.size!==EXPECTED_SIZE)throw new Error("File size differs from the original TEST 154 recording.");
   const digest=new Uint8Array(await crypto.subtle.digest("SHA-256",await file.arrayBuffer()));
   const checksum=Array.from(digest,b=>b.toString(16).padStart(2,"0")).join("");
   if(checksum!==EXPECTED_SHA)throw new Error("Selected MP3 does not match the verified TEST 154 recording.");
   setStatus("Uploading MP3 directly to Supabase Storage…");
   const response=await fetch(ENDPOINT,{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"sign",size:file.size,sha256:checksum})});
   const signed=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(signed.detail||"Unable to authorize upload.");
   const result=await supabase.storage.from("ark-english-content").uploadToSignedUrl(signed.path,signed.token,file,{contentType:"audio/mpeg"});
   if(result.error){
    try{await finalize();return}catch{}
    throw new Error(result.error.message);
   }
   setStatus("Saving verified storage link to Day 20…");
   await finalize();
  }catch(e){setStatus(e instanceof Error?e.message:"MP3 upload failed.")}
  finally{setActive(false)}
 }

 return <section className="la-upload-panel" aria-label="Day 20 audio upload">
  <div className="la-upload-copy">
   {linked?<CheckCircle2 size={21}/>:<UploadCloud size={21}/>}
   <div><strong>Day 20 · TEST 154 MP3</strong><p>{linked?"Supabase Storage linked.":"Direct and verified upload to Supabase Storage. Other days and results remain untouched."}</p>{status&&<small role="status">{status}</small>}</div>
  </div>
  <div className="la-upload-actions">
   <label className={"la-upload-select"+(active?" disabled":"")}>
    <input type="file" accept="audio/mpeg,.mp3" disabled={active} onChange={e=>{const chosen=e.currentTarget.files?.[0]||null;void upload(chosen);e.currentTarget.value="";}}/>
    {active?"Uploading…":linked?"Replace MP3":"Choose TEST 154 MP3"}
   </label>
   <button type="button" disabled={active} onClick={()=>{setStatus("Checking storage…");void finalize().catch(e=>setStatus(e instanceof Error?e.message:"Cannot verify upload."))}}>Verify upload</button>
  </div>
 </section>;
}
