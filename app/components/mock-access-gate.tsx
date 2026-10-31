"use client";
import {useState} from 'react';
import Link from 'next/link';
type Props={day:number;scheduled:boolean;opensAt:string|null;onRedeemed?:()=>void};
export default function MockAccessGate({day,scheduled,opensAt,onRedeemed}:Props){
 const dateLabel=new Date(Date.UTC(2026,9,day)).toLocaleDateString('uz-UZ',{timeZone:'UTC',day:'numeric',month:'long'});
 const [code,setCode]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function redeem(e:React.FormEvent){
  e.preventDefault();if(busy)return;setBusy(true);setMessage('');
  try{
   const r=await fetch('/api/mock-access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'redeem',day,code})});
   const value=await r.json();if(!r.ok)throw Error(value.detail||'Kod tekshirilmadi.');
   if(onRedeemed)onRedeemed();else window.location.reload();
  }catch(e){setMessage(e instanceof Error?e.message:'Qayta urinib ko‘ring.');setBusy(false)}
 }
 return <main className="mock-entry"><header className="mock-entry-top"><Link href="/dashboard">← Dashboard</Link><b>ARK EDUCATION · FULL MOCK</b><span>DAY {day}</span></header><section className="mock-entry-card">
  <small>{dateLabel.toUpperCase()} · IELTS FULL MOCK</small><h1>{scheduled?'Mock hali ochilmagan':'Shaxsiy kirish kodi'}</h1>
  <p>{scheduled?`${dateLabel} soat 09:00 da ochiladi. Toshkent vaqti.`:'To‘lovingiz tasdiqlangach, admin bergan shaxsiy kodni kiriting. Kod faqat o‘z akkauntingizda ishlaydi.'}</p>
  {scheduled?<><p>{opensAt&&new Date(opensAt).toLocaleString('en-GB',{timeZone:'Asia/Tashkent'})} · Asia/Tashkent</p><button onClick={()=>window.location.reload()}>Qayta tekshirish</button></>:<form onSubmit={redeem}><label style={{display:'block',textAlign:'left',margin:'20px 0 8px'}} htmlFor="mock-personal-code">Kirish kodi</label><input id="mock-personal-code" autoComplete="off" autoCapitalize="characters" spellCheck={false} required maxLength={64} value={code} onChange={e=>setCode(e.target.value)} placeholder="XXXX-XXXX-XXXX" style={{width:'100%',padding:'16px',fontSize:'20px',letterSpacing:'2px',border:'1px solid #cbd5e1',borderRadius:'8px',background:'#fff',color:'#111'}}/><button disabled={busy||!code.trim()} type="submit" style={{marginTop:16}}>{busy?'Tekshirilmoqda…':'Mockni ochish'}</button></form>}
  {message&&<p role="alert" className="mock-error">{message}</p>}
  <p style={{marginTop:24}}><Link href="/billing">To‘lov ma’lumotlari</Link> · <a href="https://t.me/rustam_usmon0v" target="_blank" rel="noreferrer">Adminga murojaat</a></p>
 </section></main>;
}
