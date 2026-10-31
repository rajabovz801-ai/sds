"use client";
import {useEffect,useState} from 'react';
type Person={id:string;first_name:string;last_name:string;username:string};
type Code={id:string;student_id:string;code_hint:string;paid_confirmed_at:string;issued_at:string;redeemed_at:string|null;revoked_at:string|null};
export default function MockCodePanel({day}:{day:number}){
 const [people,setPeople]=useState<Person[]>([]),[codes,setCodes]=useState<Code[]>([]),[student,setStudent]=useState(''),[search,setSearch]=useState(''),[paid,setPaid]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[created,setCreated]=useState<{code:string;name:string}|null>(null),[allowed,setAllowed]=useState(true),[limited,setLimited]=useState(false);
 async function load(){
  try{const r=await fetch('/api/mock-access?day='+day,{cache:'no-store'});const obj=await r.json();if(r.status===403){setAllowed(false);return}if(!r.ok)throw Error(obj.detail);setAllowed(true);setPeople(obj.students||[]);setCodes(obj.codes||[]);setLimited(!!obj.limited)}catch(e){setMessage(e instanceof Error?e.message:'Kodlar yuklanmadi.')}
 }
 useEffect(()=>{setStudent('');setPaid(false);setCreated(null);void load()},[day]);
 async function change(action:'issue'|'revoke',codeId?:string){
  if(busy)return;setBusy(true);setMessage('');
  try{const r=await fetch('/api/mock-access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,day,student_id:student,payment_confirmed:paid,code_id:codeId})});const obj=await r.json();if(!r.ok)throw Error(obj.detail);if(action==='issue'){const p=people.find(p=>p.id===student);setCreated({code:obj.code,name:p?p.first_name+' '+p.last_name+' (@'+p.username+')':student});setPaid(false)}else setCreated(null);await load()}catch(e){setMessage(e instanceof Error?e.message:'Amal bajarilmadi.')}finally{setBusy(false)}
 }
 if(!allowed)return null;
 const filtered=people.filter(p=>(p.first_name+' '+p.last_name+' '+p.username).toLowerCase().includes(search.trim().toLowerCase()));
 const active=new Map(codes.filter(c=>!c.revoked_at).map(c=>[c.student_id,c]));
 const current=active.get(student);
 return <section className="ma-code-panel"><div className="ma-table-head"><div><small>SHAXSIY KIRISH KODLARI</small><h2>{new Date(Date.UTC(2026,9,day)).toLocaleDateString('uz-UZ',{timeZone:'UTC',day:'numeric',month:'long'})} · 09:00 · Toshkent vaqti</h2></div><button onClick={()=>load()}>Yangilash</button></div>
  <p>O‘quvchining to‘lovini tekshiring, keyin uning akkauntiga bog‘langan kod yarating. Yangi kod faqat shu oynada ko‘rsatiladi.</p>
  <div className="ma-code-controls"><input aria-label="Kod uchun o‘quvchini qidirish" placeholder="Ism yoki username bo‘yicha qidirish" value={search} onChange={e=>{setSearch(e.target.value);setStudent('');setPaid(false);setCreated(null)}}/><select aria-label="Kod uchun o‘quvchi" value={student} onChange={e=>{setStudent(e.target.value);setPaid(false);setCreated(null)}}><option value="">O‘quvchini tanlang</option>{filtered.map(p=><option key={p.id} value={p.id}>{p.first_name} {p.last_name} · @{p.username}</option>)}</select></div>
  <label className="ma-paid-confirm"><input type="checkbox" checked={paid} onChange={e=>setPaid(e.target.checked)}/> To‘lovini tekshirdim va tasdiqlayman</label>
  {current&&<p>Amaldagi kod: ****-****-{current.code_hint} · {current.redeemed_at?'Ishlatilgan — kirish ochilgan':'Hali ishlatilmagan'}. Yangisini yaratish eskisini bekor qiladi.</p>}
  <div className="ma-code-actions"><button disabled={!student||!paid||busy} onClick={()=>change('issue')}>{busy?'Kutilmoqda…':current?'Eski kodni almashtirish':'Kod yaratish'}</button>{current&&<button disabled={busy} onClick={()=>change('revoke',current.id)}>Kirishni bekor qilish</button>}</div>
  {created&&<div className="ma-new-code" role="status"><b>{created.name}</b><strong>{created.code}</strong><button onClick={async()=>{try{await navigator.clipboard.writeText(created.code);setMessage('Kod nusxalandi.')}catch{setMessage('Kodni belgilang va nusxalang.')}}}>Kodni nusxalash</button><p>Kodni faqat shu o‘quvchiga bering. Sahifa yangilansa, to‘liq kod qayta ko‘rsatilmaydi.</p></div>}
  {message&&<p role="alert" className="ma-message">{message}</p>}{limited&&<p role="alert">Ro‘yxat chegarasi: 2000. Yetishmayotgan akkaunt uchun administratorga murojaat qiling.</p>}
  <div className="ma-overflow"><table><thead><tr><th>O‘quvchi</th><th>To‘lov tasdiqlangan</th><th>Kod</th><th>Holati</th></tr></thead><tbody>{codes.length?codes.map(c=>{const p=people.find(p=>p.id===c.student_id);return <tr key={c.id}><td>{p?p.first_name+' '+p.last_name+' (@'+p.username+')':'Arxivlangan akkaunt'}</td><td>{new Date(c.paid_confirmed_at).toLocaleString('en-GB',{timeZone:'Asia/Tashkent'})}</td><td>****-****-{c.code_hint}</td><td>{c.revoked_at?'Bekor qilingan':c.redeemed_at?'Kirish ochilgan':'Kod berilgan'}</td></tr>}):<tr><td colSpan={4}>Hali kod yaratilmagan.</td></tr>}</tbody></table></div>
 </section>;
}
