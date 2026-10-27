"use client";
import {useRef,useState} from 'react';
/** Metadata is loaded only for the selected submission, not the entire inbox. */
export default function AnswerAudio({src,duration,label,onPlay}:{src:string;duration:string;label:string;onPlay?:()=>void}){
 const ref=useRef<HTMLAudioElement>(null);
 const [state,setState]=useState<'loading'|'ready'|'error'>(src?'loading':'error');
 return <div className="sa-player"><div><audio ref={ref} controls preload="metadata" src={src} aria-label={label} onLoadedMetadata={()=>setState('ready')} onCanPlay={()=>setState('ready')} onError={()=>setState('error')} onPlay={()=>{onPlay?.();document.querySelectorAll('audio').forEach(a=>{if(a!==ref.current)a.pause()})}}/>{state==='error'?<span className="admin-audio-error" role="alert">Audio could not load. <button type="button" onClick={()=>{setState(src?'loading':'error');ref.current?.load()}}>Retry</button></span>:<small className="admin-muted">{state==='loading'?'Loading audio metadata…':'Audio ready'}</small>}</div><span>{duration}</span></div>;
}
