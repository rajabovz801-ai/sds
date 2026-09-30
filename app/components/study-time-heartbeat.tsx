"use client";
import {useEffect} from "react";

type ModuleName="article"|"vocabulary"|"writing"|"listening"|"speaking";

export default function StudyTimeHeartbeat({day,module}:{day:number;module:ModuleName}){
 useEffect(()=>{
  let stopped=false,inFlight=false,lastActivity=Date.now();
  const markActive=()=>{lastActivity=Date.now()};
  async function pulse(){
   if(stopped||inFlight||document.visibilityState!=="visible")return;
   // Count study time only while the student has interacted recently.
   if(Date.now()-lastActivity>45000)return;
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
  const onVisible=()=>{if(document.visibilityState==="visible"){markActive();void pulse()}};
  const events:Array<keyof WindowEventMap>=["pointerdown","keydown","scroll","touchstart"];
  for(const event of events)window.addEventListener(event,markActive,{passive:true});
  void pulse();
  const id=window.setInterval(()=>void pulse(),20000);
  document.addEventListener("visibilitychange",onVisible);
  return()=>{
   stopped=true;window.clearInterval(id);document.removeEventListener("visibilitychange",onVisible);
   for(const event of events)window.removeEventListener(event,markActive);
  };
 },[day,module]);
 return null;
}
