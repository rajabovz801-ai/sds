"use client";
import {useEffect} from "react";
import StudentPresence from "./student-presence";
import {shouldCountStudy,STUDY_IDLE_MS} from "../../lib/study-activity";

type ModuleName="reading"|"article"|"vocabulary"|"writing"|"listening"|"speaking";
export default function StudyTimeHeartbeat({day,module,enabled=true,mock=false}:{day:number;module:ModuleName;enabled?:boolean;mock?:boolean}){
 useEffect(()=>{
  let stopped=false,inFlight=false,lastActivity=Date.now(),needsReset=true,activityEpoch=0;
  const markActive=()=>{const stamp=Date.now();if(stamp-lastActivity>STUDY_IDLE_MS){activityEpoch++;needsReset=true}lastActivity=stamp};
  async function pulse(){
   if(stopped||inFlight)return;
   const mediaPlaying=Array.from(document.querySelectorAll<HTMLMediaElement>("audio,video"))
    .some(media=>!media.paused&&!media.ended&&media.readyState>=2);
   if(!shouldCountStudy({visible:document.visibilityState==="visible",focused:document.hasFocus(),lastActivity,now:Date.now(),mediaPlaying,enabled})){
    needsReset=true;return;
   }
   inFlight=true;
   const reset=needsReset,epoch=activityEpoch;
   try{
    const response=await fetch(mock?"/api/challenge-mock":"/api/ark60",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},
     body:JSON.stringify({action:mock?"study_heartbeat":"heartbeat",day,module,reset}),keepalive:true});
    if(response.ok&&!stopped&&epoch===activityEpoch)needsReset=false;
   }catch{needsReset=true}finally{inFlight=false}
  }
  const suspend=()=>{activityEpoch++;needsReset=true};
  const resume=()=>{activityEpoch++;needsReset=true;markActive();void pulse()};
  const onVisible=()=>{if(document.visibilityState==="visible")resume();else suspend()};
  const events=["pointerdown","keydown","scroll","touchstart"] as const;
  for(const event of events)window.addEventListener(event,markActive,{passive:true,capture:true});
  window.addEventListener("focus",resume);window.addEventListener("blur",suspend);
  document.addEventListener("visibilitychange",onVisible);
  void pulse();
  const id=window.setInterval(()=>void pulse(),20000);
  return()=>{
   stopped=true;window.clearInterval(id);
   for(const event of events)window.removeEventListener(event,markActive,true);
   window.removeEventListener("focus",resume);window.removeEventListener("blur",suspend);
   document.removeEventListener("visibilitychange",onVisible);
  };
 },[day,module,enabled,mock]);
 return <StudentPresence area={(module[0].toUpperCase()+module.slice(1)) as "Reading"|"Listening"|"Article"|"Vocabulary"|"Writing"|"Speaking"} day={day}/>;
}
