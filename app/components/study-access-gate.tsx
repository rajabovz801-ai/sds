"use client";
import {useEffect,useState,type ReactNode} from 'react';
import {useParams,usePathname} from 'next/navigation';
import type {Membership} from '@/lib/billing/access-policy';
import {MembershipLock} from './membership-notice';
export default function StudyAccessGate({children}:{children:ReactNode}){
 const params=useParams<{day:string}>(),path=usePathname();
 const [state,setState]=useState<{allowed:boolean;review_only?:boolean;future?:boolean;membership:Membership}|null>(null);
 const [error,setError]=useState(''),[retry,setRetry]=useState(0);
 const day=Number(params.day),module=path.split('/')[3]||'';
 useEffect(()=>{let alive=true;setState(null);setError('');fetch('/api/billing?action=access&day='+day+'&module='+encodeURIComponent(module),{cache:'no-store',credentials:'same-origin'}).then(async r=>{if(r.status===401){location.replace('/');return null}const body=await r.json();if(!r.ok)throw Error(body.error||'Kirish huquqini tekshirib bo‘lmadi.');return body}).then(body=>{if(alive&&body)setState(body)}).catch(e=>{if(alive)setError(e.message)});return()=>{alive=false}},[day,module,retry]);
 if(error)return <div className="membership-lock" role="alert"><h1>Ulanishni tekshiring</h1><p>{error}</p><button className="membership-primary" onClick={()=>setRetry(x=>x+1)}>Qayta urinish</button><a href="/dashboard">Dashboard</a></div>;
 if(!state)return <div className="membership-load" role="status">Kirish huquqi tekshirilmoqda…</div>;
 if(!state.allowed)return <MembershipLock day={day} future={state.future} membership={state.membership}/>;
 return <>{state.review_only&&<div className="membership-review">Oldingi natijangiz ochiq. Yangi test boshlash uchun faol paket kerak.<a href="/dashboard?view=Billing">Paketlarni ko‘rish</a></div>}{children}</>;
}
