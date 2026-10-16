'use client';
import {useEffect,useRef} from 'react';
import {X} from 'lucide-react';
export default function ExperienceDialog({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const el=ref.current,previous=document.activeElement as HTMLElement|null;el?.showModal();return()=>{el?.close();previous?.focus()}},[]);
 return <dialog ref={ref} className="ex-dialog" aria-label={title} onCancel={e=>{e.preventDefault();onClose()}} onClick={e=>{if(e.target===e.currentTarget)onClose()}}><header><h2>{title}</h2><button className="ex-icon-btn" onClick={onClose} aria-label="Yopish"><X size={20}/></button></header>{children}</dialog>;
}
