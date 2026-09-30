"use client";
import {useEffect} from "react";

type ModuleName="article"|"vocabulary"|"writing"|"listening"|"speaking";

export default function StudyTimeHeartbeat({day,module}:{day:number;module:ModuleName}){
 useEffect(()=>{
  let stopped=false,inFlight=false;
  async function pulse(){
   if(stopped||inFlight||document.visibilityState!=="visible")return;
   inFlight=true;
   try{
    await fetch("/api/ark60",{
     method:"POST",
     credentials:"same-origin",
     headers:{"Content-Type":"application/json"},
     body:JSON.stringify({action:"heartbeat",day,module}),
     keepalive:true
    });
   }catch{}finally{inFlight=false}
  }
  const onVisible=()=>{if(document.visibilityState==="visible")void pulse()};
  void pulse();
  const id=window.setInterval(()=>void pulse(),20000);
  document.addEventListener("visibilitychange",onVisible);
  return()=>{stopped=true;window.clearInterval(id);document.removeEventListener("visibilitychange",onVisible)};
 },[day,module]);
 return null;
}
