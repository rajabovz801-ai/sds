"use client";
import {useEffect,useRef} from "react";
import {CHALLENGE_RESUME_STORAGE_KEY,createChallengeResume} from "../../lib/ark60-resume";

type Area="Dashboard"|"Day"|"Notifications"|"Reading"|"Listening"|"Article"|"Vocabulary"|"Writing"|"Speaking"|"Mock";

export default function StudentPresence({area,day=null}:{area:Area;day?:number|null}){
 const lastInteraction=useRef(Date.now());
 useEffect(()=>{
  let stopped=false,inFlight=false;
  const mark=()=>{lastInteraction.current=Date.now()};
  try{
   const resume=createChallengeResume(window.location.pathname,area);
   if(resume)localStorage.setItem(CHALLENGE_RESUME_STORAGE_KEY,JSON.stringify(resume));
  }catch{}
  async function pulse(){
   if(stopped||inFlight||document.visibilityState!=="visible")return;
   inFlight=true;
   try{
    await fetch("/api/ark60",{
     method:"POST",credentials:"same-origin",keepalive:true,
     headers:{"Content-Type":"application/json"},
     body:JSON.stringify({
      action:"presence",area,day:day??null,
      last_interaction_at:new Date(lastInteraction.current).toISOString()
     })
    });
   }catch{}finally{inFlight=false}
  }
  const visible=()=>{if(document.visibilityState==="visible")void pulse()};
  const events:Array<keyof WindowEventMap>=["pointerdown","keydown","scroll","touchstart"];
  for(const event of events)window.addEventListener(event,mark,{passive:true});
  void pulse();
  const id=window.setInterval(()=>void pulse(),25000);
  document.addEventListener("visibilitychange",visible);
  return()=>{
   stopped=true;window.clearInterval(id);document.removeEventListener("visibilitychange",visible);
   for(const event of events)window.removeEventListener(event,mark);
  };
 },[area,day]);
 return null;
}
