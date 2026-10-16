'use client';
import {useEffect,useRef} from 'react';
import {usePathname} from 'next/navigation';
import type {ExperienceData} from '@/lib/experience/core';
export default function ExperienceTheme(){
 const path=usePathname();const saved=useRef('classic'),enabled=useRef(false);
 useEffect(()=>{document.documentElement.dataset.exExamCalm=String(path!=='/dashboard')},[path]);
 useEffect(()=>{
  let active=true;
  const apply=(id:string)=>{document.documentElement.dataset.exTheme=['forest','library','aurora'].includes(id)?id:'classic'};
  const sync=(data:ExperienceData)=>{enabled.current=true;saved.current=data.state.equipped.theme||'classic';apply(saved.current);document.documentElement.dataset.exReduced=String(data.state.reduced_motion)};
  fetch('/api/experience',{cache:'no-store'}).then(async r=>r.ok?r.json():null).then(j=>{if(!active)return;if(j?.enabled)sync(j);else{enabled.current=false;apply('classic')}}).catch(()=>{if(active)apply('classic')});
  const update=(e:Event)=>{const data=(e as CustomEvent<ExperienceData>).detail;if(data?.enabled&&active)sync(data)};
  const preview=(e:Event)=>{if(enabled.current)apply((e as CustomEvent<string|null>).detail||saved.current)};
  window.addEventListener('ark-experience-change',update);window.addEventListener('ark-experience-preview',preview);
  return()=>{active=false;window.removeEventListener('ark-experience-change',update);window.removeEventListener('ark-experience-preview',preview);apply('classic')};
 },[]);
 return null;
}
