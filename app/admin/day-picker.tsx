"use client";
import {ChevronLeft,ChevronRight} from 'lucide-react';
export default function AdminDayPicker({days,value,onChange,all=false}:{days:{day:number;label:string}[];value:number;onChange:(day:number)=>void;all?:boolean}){
 const options=all?[{day:0,label:'All days'},...days]:days;
 const index=options.findIndex(d=>d.day===value);
 return <div className="admin-day-picker"><button type="button" aria-label="Previous day" disabled={index<=0} onClick={()=>onChange(options[index-1].day)}><ChevronLeft size={17}/></button><label>Challenge day<select value={value} aria-label="Challenge day" disabled={!options.length} onChange={e=>onChange(Number(e.target.value))}>{!options.length&&<option value={value}>No available days</option>}{options.map(d=><option key={d.day} value={d.day}>{d.label}</option>)}</select></label><button type="button" aria-label="Next day" disabled={index<0||index>=options.length-1} onClick={()=>onChange(options[index+1].day)}><ChevronRight size={17}/></button></div>;
}
