'use client';
import {useCallback,useEffect,useState} from 'react';
import type {ExperienceData} from '@/lib/experience/core';
export function syncExperience(data:ExperienceData){window.dispatchEvent(new CustomEvent('ark-experience-change',{detail:data}));}
export function useExperience(){
 const [data,setData]=useState<ExperienceData|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const load=useCallback(async()=>{setLoading(true);setError('');try{const r=await fetch('/api/experience',{cache:'no-store'});const j=await r.json();if(!r.ok)throw new Error(j.error||'Yuklanmadi.');setData(j);syncExperience(j)}catch(e){setError(e instanceof Error?e.message:'Yuklanmadi.')}finally{setLoading(false)}},[]);
 useEffect(()=>{void load();const update=(e:Event)=>{const next=(e as CustomEvent<ExperienceData>).detail;if(next?.enabled)setData(next)};window.addEventListener('ark-experience-change',update);return()=>window.removeEventListener('ark-experience-change',update)},[load]);
 const act=async(action:string,payload:Record<string,unknown>={})=>{if(busy)return false;setBusy(true);setError('');try{const r=await fetch('/api/experience',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,data:payload})});const j=await r.json();if(!r.ok)throw new Error(j.error||'Saqlanmadi.');setData(j);syncExperience(j);return true}catch(e){setError(e instanceof Error?e.message:'Saqlanmadi.');return false}finally{setBusy(false)}};
 return {data,loading,busy,error,load,act};
}
