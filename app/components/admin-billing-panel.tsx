"use client";
import {useEffect,useRef,useState} from 'react';
import {RefreshCw,Search,CheckCircle2,XCircle,ShieldCheck} from 'lucide-react';
import {BILLING_PLANS,formatSom,type BillingMethod,type BillingPlan} from '@/lib/billing/plans';
import {BILLING_LAUNCH} from '@/lib/billing/access-policy';
import '../billing/billing.css';
type Person={id:string;first_name:string;last_name:string;username:string;created_at:string};
type Order={id:string;student_id:string;plan_key:string;price_uzs:number;payment_method:BillingMethod|'cash';status:string;created_at:string;admin_note:string|null;mock_on:string|null;transaction_ref:string|null;student:Person|null};
type Access={order_id:string|null;source_order_id:string|null;id:string;student_id:string;plan_key:string;starts_at:string;expires_at:string|null;mock_on:string|null;revoked_at:string|null};
type Payload={orders:Order[];cards:{method:BillingMethod;card_number:string;card_holder:string;enabled:boolean}[];stats:Record<string,number>;students:Person[];events:{id:number;student_id:string;action:string;note:string|null;created_at:string}[];access:Access[];limited:boolean};
const label=(s:string)=>({pending:'Kutilmoqda',approved:'Tasdiqlangan',rejected:'Rad etilgan',cancelled:'Bekor qilingan',revoked:'Tasdiq qaytarilgan',manual_grant:'Imtiyoz berilgan',manual_revoke:'Imtiyoz qaytarilgan',cash_approved:'Naqd to‘lov tasdiqlangan'}[s]||s);
const date=(s:string)=>new Date(s).toLocaleString('uz-UZ',{timeZone:'Asia/Tashkent'});
const upcoming=()=>{const d=new Date(Math.max(Date.now(),Date.parse(BILLING_LAUNCH))+5*3600000);d.setUTCDate(d.getUTCDate()+((7-d.getUTCDay())%7));return d.toISOString().slice(0,10)};
const name=(p:Person|null|undefined)=>p?[p.first_name,p.last_name].join(' '):'O‘quvchi';
export default function AdminBillingPanel(){
 const [data,setData]=useState<Payload|null>(null),[filter,setFilter]=useState('all'),[search,setSearch]=useState(''),[busy,setBusy]=useState(''),[message,setMessage]=useState(''),[loading,setLoading]=useState(true);
 const [notes,setNotes]=useState<Record<string,string>>({}),[mocks,setMocks]=useState<Record<string,string>>({}),[refs,setRefs]=useState<Record<string,string>>({});
 const [cards,setCards]=useState<Record<string,{number:string;holder:string;enabled:boolean}>>({uzcard:{number:'',holder:'',enabled:true},humo:{number:'',holder:'',enabled:false}});
 const [showSettings,setShowSettings]=useState(false),[showGrant,setShowGrant]=useState(false),[showCash,setShowCash]=useState(true);
 const [cash,setCash]=useState({student_id:'',plan:'challenge' as BillingPlan,mock_on:upcoming(),note:'Naqd to‘lov qabul qilindi'});
 const [cashReceipt,setCashReceipt]=useState<{order_code:string;price_uzs:number;starts_at:string;expires_at:string|null;mock_on:string|null}|null>(null);
 const cashRequestRef=useRef<string|null>(null);
 const [grant,setGrant]=useState({student_id:'',plan:'challenge',days:7,starts_at:new Date(Math.max(Date.now(),Date.parse(BILLING_LAUNCH))+5*3600000).toISOString().slice(0,16),mock_on:upcoming(),note:''});
 async function load(){setLoading(true);try{const r=await fetch('/api/admin/billing',{cache:'no-store',credentials:'same-origin'});const j=await r.json();if(!r.ok)throw Error(j.error);setData(j);for(const c of j.cards||[])setCards(v=>({...v,[c.method]:{number:c.card_number,holder:c.card_holder,enabled:c.enabled}}))}catch(e){setMessage(e instanceof Error?e.message:'Yuklanmadi.')}finally{setLoading(false)}}
 useEffect(()=>{void load();const focus=()=>void load();window.addEventListener('focus',focus);return()=>window.removeEventListener('focus',focus)},[]);
 async function post(body:object){const r=await fetch('/api/admin/billing',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const j=await r.json();if(!r.ok)throw Error(j.error||'Amal bajarilmadi.');return j;}
 async function run(key:string,body:object,success:string){setBusy(key);setMessage('');try{await post(body);await load();setMessage(success)}catch(e){setMessage(e instanceof Error?e.message:'Amal bajarilmadi.')}finally{setBusy('')}}
 function activation(o:Order){return new Date(Math.max(Date.now(),Date.parse(BILLING_LAUNCH),...(data?.access||[]).filter(a=>a.student_id===o.student_id&&!a.revoked_at&&a.expires_at).map(a=>Date.parse(a.expires_at!)))).toISOString()}
 function preview(o:Order){if(o.plan_key==='all_access')return 'Eski kombinatsiyalangan paket: tasdiqlash yopilgan. To‘lov bo‘lgan bo‘lsa, o‘quvchi bilan kelishing; aks holda eski so‘rovni rad etib, ikki alohida paketdan foydalaning.';const start=activation(o),end=new Date(Date.parse(start)+7*86400000).toISOString();return (o.plan_key==='challenge'?'Challenge: '+date(start)+' → '+date(end)+'. ':'')+(o.plan_key==='mock'?'MOCK: '+(mocks[o.id]||o.mock_on||upcoming()):'MOCK kirmaydi.');}
 function review(o:Order,decision:string){if(decision==='rejected'&&!(notes[o.id]||'').trim()){setMessage('Rad etish sababini yozing.');return}const text=decision==='approved'?name(o.student)+' · '+formatSom(o.price_uzs)+'\nTelegram cheki va bank tushumini tekshirdingizmi?\n'+preview(o):name(o.student)+' to‘lovini rad etasizmi?';if(window.confirm(text))void run(o.id,{action:'review',order_id:o.id,decision,note:notes[o.id]||'',mock_on:o.plan_key==='challenge'?null:mocks[o.id]||o.mock_on||upcoming(),transaction_ref:refs[o.id]||o.transaction_ref||null},decision==='approved'?'To‘lov tasdiqlandi. Ruxsat belgilangan muddatga yozildi.':'To‘lov rad etildi.');}
 async function confirmCash(){
  if(busy||!cash.student_id)return;
  const person=data?.students.find(p=>p.id===cash.student_id);
  if(!person)return;
  const amount=BILLING_PLANS.find(p=>p.key===cash.plan)?.price||0;
  const preview=cash.plan==='challenge'?'7 kunlik Challenge':'Full MOCK '+cash.mock_on;
  const waiting=(data?.orders||[]).some(o=>o.student_id===cash.student_id&&o.status==='pending'&&(o.plan_key===cash.plan||o.plan_key==='all_access'));
  if(waiting){setMessage('Bu o‘quvchining eski to‘lov so‘rovi bor. Avval uni rad eting yoki tekshiring.');return}
  if(!window.confirm(name(person)+'\\n'+preview+'\\nNaqd pul: '+formatSom(amount)+'\\n\\nPulni haqiqatda qabul qildingizmi? Bu amal to‘lovni kassaga yozadi va ruxsatni ochadi.'))return;
  cashRequestRef.current ||= crypto.randomUUID();
  setBusy('cash');setMessage('');setCashReceipt(null);
  try{
   const result=await post({action:'record_cash',student_id:cash.student_id,plan:cash.plan,mock_on:cash.plan==='mock'?cash.mock_on:null,
     note:cash.note,request_id:cashRequestRef.current,confirmed:true});
   cashRequestRef.current=null;
   setCashReceipt(result.receipt);
   setFilter('approved');
   await load();
   setMessage('Naqd to‘lov tasdiqlandi. Chek raqami: '+result.receipt.order_code+'. Ruxsat faollashdi.');
  }catch(e){setMessage('Naqd to‘lovni saqlashda xatolik: '+(e instanceof Error?e.message:'Amal bajarilmadi.')+' To‘lovlar ro‘yxatini yangilab tekshiring.')}finally{setBusy('')}
 }
 const visibleGrants=(data?.access||[]).filter(a=>!a.revoked_at).sort((a,b)=>Date.parse(b.starts_at)-Date.parse(a.starts_at));
 const grantStatus=(a:Access)=>{
   if(Date.parse(a.starts_at)>Date.now())return 'Boshlanishi kutilmoqda';
   if(a.expires_at)return Date.parse(a.expires_at)>Date.now()?'Faol Challenge':'Muddati tugagan';
   if(a.mock_on)return a.mock_on>=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tashkent',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())?'MOCK ruxsati':'O‘tgan MOCK';
   return 'Ruxsat';
 };
 const grantPayment=(a:Access)=>{
   const o=(data?.orders||[]).find(o=>o.id===(a.order_id||a.source_order_id));
   return !o?'Bepul imtiyoz':o.payment_method==='cash'?'Naqd · '+formatSom(o.price_uzs):o.payment_method.toUpperCase()+' · '+formatSom(o.price_uzs);
 };
 const pendingCash=(data?.orders||[]).filter(o=>o.student_id===cash.student_id&&o.status==='pending'&&(o.plan_key===cash.plan||o.plan_key==='all_access'));
 const cashStart=Math.max(Date.now(),Date.parse(BILLING_LAUNCH),
  ...(cash.plan==='challenge'?(data?.access||[]).filter(a=>a.student_id===cash.student_id&&!a.revoked_at&&a.expires_at&&Date.parse(a.expires_at)>Date.now()).map(a=>Date.parse(a.expires_at!)):[]));
 const q=search.toLowerCase().trim();
 const visible=(data?.orders||[]).filter(o=>(filter==='all'||o.status===filter)&&(!q||[name(o.student),o.student?.username,(BILLING_PLANS.find(p=>p.key===o.plan_key)?.name||'All Access (eski paket)')].some(s=>String(s||'').toLowerCase().includes(q))));
 return <section className="bill-page bill-admin">
  <div className="bill-admin-head"><span className="bill-eyebrow">MEMBERSHIP CONTROL</span><h1>To‘lovlar va obunalar</h1><p>Naqd pul yoki karta to‘lovini faqat qabul qilingandan keyin tasdiqlang. To‘lovni saqlagach chek raqami va ruxsat quyidagi ro‘yxatda ko‘rinadi.</p></div>
  <div className="bill-admin-stats">{[['pending','Kutilmoqda'],['approved_uzs','Jami tasdiqlangan tushum'],['cash_uzs','Naqd kassa'],['bank_uzs','Karta orqali'],['pending_uzs','Kutilayotgan summa'],['active_students','Faol obunachilar']].map(([key,title])=><div key={key}><span>{title}</span><strong>{key.includes('uzs')?formatSom(data?.stats[key]||0):data?.stats[key]??'—'}</strong></div>)}</div>
  <div className="bill-section-head"><div><h2>Berilgan obunalar</h2><p>O‘quvchi so‘rov yuborishi shart emas. Admin orqali berilgan ruxsatlar ham shu yerda ko‘rinadi.</p></div><button type="button" className="bill-small-btn" onClick={()=>void load()}><RefreshCw size={14}/> Yangilash</button></div>
  <section className="bill-box"><div className="bill-table-wrap"><table><thead><tr><th>O‘quvchi</th><th>Paket</th><th>To‘lov</th><th>Boshlanish / tugash</th><th>Holat</th></tr></thead><tbody>
    {visibleGrants.map(a=>{const person=data?.students.find(p=>p.id===a.student_id);return <tr key={a.id}>
      <td><b>{name(person)}</b><small className="bill-note">@{person?.username||'—'}</small></td>
      <td>{a.plan_key==='challenge'?'Challenge · 7 kun':a.plan_key==='mock'?'Full MOCK':'Eski paket'}</td>
      <td>{grantPayment(a)}</td>
      <td>{date(a.starts_at)}{a.expires_at?' → '+date(a.expires_at):a.mock_on?' · Mock '+a.mock_on:''}</td>
      <td><b>{grantStatus(a)}</b></td>
    </tr>})}
    {!visibleGrants.length&&<tr><td colSpan={5} className="bill-muted">{loading?'Ruxsatlar yuklanmoqda…':'Hozircha hech bir o‘quvchiga obuna berilmagan.'}</td></tr>}
  </tbody></table></div></section>
  <div className="bill-section-head"><div><h2>Naqd pulni qabul qilish</h2><p>Faqat haqiqatda olingan pulni tasdiqlang. Challenge va MOCK — alohida to‘lovlar.</p></div><button type="button" className="bill-small-btn" onClick={()=>setShowCash(v=>!v)}>{showCash?'Yopish':'Naqd to‘lov + '}</button></div>
  {showCash&&<section className="bill-box" aria-label="Naqd to‘lovni tasdiqlash">
    <div className="bill-admin-cards">
      <label className="bill-field">O‘quvchi
        <select value={cash.student_id} onChange={e=>{setCash(v=>({...v,student_id:e.target.value}));cashRequestRef.current=null;setCashReceipt(null)}}>
          <option value="">O‘quvchini tanlang</option>
          {(data?.students||[]).map(p=><option key={p.id} value={p.id}>{name(p)} · @{p.username}</option>)}
        </select>
      </label>
      <label className="bill-field">Alohida paket
        <select value={cash.plan} onChange={e=>{setCash(v=>({...v,plan:e.target.value as BillingPlan}));cashRequestRef.current=null;setCashReceipt(null)}}>
          {BILLING_PLANS.map(p=><option key={p.key} value={p.key}>{p.name} — {formatSom(p.price)}</option>)}
        </select>
      </label>
      {cash.plan==='mock'&&<label className="bill-field">Mock sanasi
        <input type="date" value={cash.mock_on} onChange={e=>{setCash(v=>({...v,mock_on:e.target.value}));cashRequestRef.current=null;setCashReceipt(null)}}/>
      </label>}
      <label className="bill-field">Kassa izohi
        <input maxLength={500} value={cash.note} onChange={e=>{setCash(v=>({...v,note:e.target.value}));cashRequestRef.current=null;setCashReceipt(null)}}/>
      </label>
    </div>
    <div className="bill-summary">
      <div className="bill-summary-card"><div><small>Qabul qilinadigan naqd pul</small><b>{formatSom(BILLING_PLANS.find(p=>p.key===cash.plan)?.price||0)}</b><span>O‘zgartirib bo‘lmaydigan paket narxi</span></div></div>
      <div className="bill-summary-card"><div><small>{cash.plan==='challenge'?'7 kunlik ruxsat':'Full MOCK ruxsati'}</small><b>{cash.plan==='challenge'?'168 soat':cash.mock_on||'Sana tanlang'}</b><span>{cash.plan==='challenge'?date(new Date(cashStart).toISOString())+' → '+date(new Date(cashStart+7*86400000).toISOString()):'Challenge obunasi bu to‘lovga kirmaydi'}</span></div></div>
    </div>
    {!!pendingCash.length&&<p className="bill-error" role="alert">Bu o‘quvchi uchun {pendingCash.length} ta eski to‘lov so‘rovi kutilmoqda. Avval quyidagi ro‘yxatdan ko‘rib chiqing.</p>}
    <p className="bill-muted">Naqd pul tasdiqlanganda avtomatik chek raqami, tushum va audit yoziladi. Avvalgi natijalar o‘zgarmaydi. Yangi ro‘yxatdan o‘tganlar uchun Day 1–2 bepul sinov saqlanadi.</p>
    <button type="button" className="bill-primary" disabled={!!busy||!cash.student_id||cash.note.trim().length<3||pendingCash.length>0||(cash.plan==='mock'&&!cash.mock_on)} onClick={()=>void confirmCash()}><CheckCircle2 size={16}/>{busy==='cash'?'Tasdiqlanmoqda…':'Naqd to‘lovni tasdiqlash'}</button>
    {cashReceipt&&<p className="bill-success" role="status">Tasdiqlandi! Chek: <b>{cashReceipt.order_code}</b> · {formatSom(cashReceipt.price_uzs)} · {cashReceipt.expires_at?'Challenge muddati: '+date(cashReceipt.starts_at)+' — '+date(cashReceipt.expires_at):'Full MOCK: '+cashReceipt.mock_on}</p>}
  </section>}
  <div className="bill-section-head"><div><h2>To‘lov so‘rovlari</h2><p>Ism, username, summa va sanani Telegramdagi chek bilan solishtiring.</p></div><button className="bill-small-btn" disabled={loading} onClick={()=>void load()}><RefreshCw size={14}/> Yangilash</button></div>
  <div className="bill-admin-filters"><div className="bill-tabs">{['all','approved','pending','rejected','cancelled','revoked'].map(s=><button key={s} onClick={()=>setFilter(s)} className={filter===s?'active':''}>{s==='all'?'Barchasi':label(s)}</button>)}</div><label className="bill-search"><Search size={15}/><input aria-label="O‘quvchini qidirish" placeholder="Ism familiya yoki username" value={search} onChange={e=>setSearch(e.target.value)}/></label></div>
  {message&&<p className="bill-message" role="alert">{message}</p>}
  <section className="bill-box"><div className="bill-table-wrap"><table><thead><tr><th>O‘quvchi</th><th>Paket / Sana</th><th>Summa / Karta</th><th>Holat</th><th>Tekshirish</th></tr></thead><tbody>{visible.map(o=><tr key={o.id}>
   <td><b>{name(o.student)}</b><small className="bill-note">{o.student?.username}</small></td><td>{BILLING_PLANS.find(p=>p.key===o.plan_key)?.name||'All Access (eski paket)'}<small className="bill-note">{date(o.created_at)}</small></td><td>{formatSom(o.price_uzs)}<small className="bill-note">{o.payment_method==='cash'?'NAQD':o.payment_method.toUpperCase()}</small></td><td><span className={'bill-status '+o.status}>{label(o.status)}</span>{o.admin_note&&<small className="bill-note">{o.admin_note}</small>}</td>
   <td>{o.status==='pending'||o.status==='approved'?<div className="bill-review-actions"><label>Admin izohi<input maxLength={500} placeholder="Sabab / izoh" value={notes[o.id]||''} onChange={e=>setNotes(v=>({...v,[o.id]:e.target.value}))}/></label>
    {o.status==='pending'?<><label>Bank tranzaksiya raqami (bo‘lsa)<input maxLength={100} value={refs[o.id]||''} onChange={e=>setRefs(v=>({...v,[o.id]:e.target.value}))}/></label>{o.plan_key!=='challenge'&&<label>MOCK sanasi<input type="date" value={mocks[o.id]||o.mock_on||upcoming()} onChange={e=>setMocks(v=>({...v,[o.id]:e.target.value}))}/></label>}<small className="bill-note">{preview(o)}</small>{o.plan_key!=='all_access'&&<button className="approve" disabled={!!busy} onClick={()=>review(o,'approved')}><CheckCircle2 size={14}/> Tasdiqlash</button>}<button className="reject" disabled={!!busy} onClick={()=>review(o,'rejected')}><XCircle size={14}/> Rad etish</button></>:<button className="reject" disabled={!!busy} onClick={()=>{if((notes[o.id]||'').trim().length<3){setMessage('Tasdiqni qaytarish sababini yozing.');return}if(window.confirm('Bu to‘lovga tegishli ruxsatni qaytarasizmi? Natijalar o‘chmaydi. Pul avtomatik qaytarilmaydi.'))void run(o.id,{action:'revoke',order_id:o.id,note:notes[o.id]},'Ruxsat qaytarildi. Natijalar saqlangan.')}}>Xato tasdiqni qaytarish</button>}
   </div>:<span className="bill-muted">Yakunlangan</span>}</td>
  </tr>)}</tbody></table></div>{!visible.length&&<p className="bill-muted">{loading?'Yuklanmoqda…':'Bu holatda so‘rov yo‘q.'}</p>}{data?.limited&&<p className="bill-muted">Oxirgi 200 ta so‘rov ko‘rsatilgan. Yuqoridagi umumiy hisob barcha to‘lovlardan olingan.</p>}</section>
  <div className="bill-section-head"><button className="bill-small-btn" onClick={()=>setShowGrant(x=>!x)}>Bepul imtiyoz berish</button><button className="bill-small-btn" onClick={()=>setShowSettings(x=>!x)}>UZCARD / HUMO sozlamalari</button></div>
  {showGrant&&<section className="bill-box"><h2>Bepul / istisno ruxsat</h2><p className="bill-muted">Naqd to‘lovni bu bo‘limdan kiritmang. Bu bank va naqd tushumi sifatida hisoblanmaydi. Sabab audit tarixida saqlanadi.</p><div className="bill-admin-cards"><label className="bill-field">O‘quvchi<select value={grant.student_id} onChange={e=>setGrant(v=>({...v,student_id:e.target.value}))}><option value="">Tanlang</option>{data?.students.map(p=><option key={p.id} value={p.id}>{name(p)} · {p.username}</option>)}</select></label><label className="bill-field">Paket<select value={grant.plan} onChange={e=>setGrant(v=>({...v,plan:e.target.value}))}>{BILLING_PLANS.map(p=><option key={p.key} value={p.key}>{p.name}</option>)}</select></label><label className="bill-field">Boshlanish (O‘zbekiston vaqti)<input type="datetime-local" value={grant.starts_at} onChange={e=>setGrant(v=>({...v,starts_at:e.target.value}))}/></label><label className="bill-field">Kunlar<input type="number" min={1} max={60} value={grant.days} onChange={e=>setGrant(v=>({...v,days:Number(e.target.value)}))}/></label>{grant.plan!=='challenge'&&<label className="bill-field">MOCK sanasi<input type="date" value={grant.mock_on} onChange={e=>setGrant(v=>({...v,mock_on:e.target.value}))}/></label>}<label className="bill-field">Sabab<input maxLength={500} value={grant.note} onChange={e=>setGrant(v=>({...v,note:e.target.value}))}/></label></div><button className="bill-primary" disabled={!!busy||!grant.student_id||!grant.starts_at||grant.note.trim().length<3} onClick={()=>{if(window.confirm(name(data?.students.find(p=>p.id===grant.student_id))+' uchun imtiyoz berasizmi?'))void run('grant',{action:'grant',...grant,starts_at:new Date(grant.starts_at+':00+05:00').toISOString()},'Imtiyoz yozildi.')}}><ShieldCheck size={16}/> Imtiyozni saqlash</button><div className="bill-table-wrap"><table><thead><tr><th>Imtiyoz egasi</th><th>Muddat / MOCK</th><th>Amal</th></tr></thead><tbody>{data?.access.filter(a=>!a.order_id&&!a.source_order_id&&!a.revoked_at).map(a=><tr key={a.id}><td>{name(data.students.find(p=>p.id===a.student_id))}</td><td>{date(a.starts_at)}{a.expires_at?' → '+date(a.expires_at):''}{a.mock_on?' · MOCK '+a.mock_on:''}</td><td><button className="bill-small-btn" disabled={!!busy} onClick={()=>{const reason=window.prompt('Imtiyozni qaytarish sababi:');if(reason&&reason.trim().length>=3)void run(a.id,{action:'revoke_grant',access_id:a.id,note:reason},'Imtiyoz qaytarildi. Natijalar saqlangan.')}}>Imtiyozni qaytarish</button></td></tr>)}</tbody></table></div></section>}
  {showSettings&&<div className="bill-admin-cards">{(['uzcard','humo'] as BillingMethod[]).map(method=><section key={method} className="bill-box"><h2>{method.toUpperCase()}</h2><label className="bill-field">Karta raqami<input inputMode="numeric" maxLength={19} value={cards[method].number} onChange={e=>setCards(v=>({...v,[method]:{...v[method],number:e.target.value}}))}/></label><label className="bill-field">Karta egasi<input maxLength={100} value={cards[method].holder} onChange={e=>setCards(v=>({...v,[method]:{...v[method],holder:e.target.value}}))}/></label><label className="bill-check"><input type="checkbox" checked={cards[method].enabled} onChange={e=>setCards(v=>({...v,[method]:{...v[method],enabled:e.target.checked}}))}/> O‘quvchilar uchun faol</label><button className="bill-primary" disabled={!!busy} onClick={()=>void run(method,{action:'set_card',method,...cards[method]},'Karta sozlamalari saqlandi.')}>Saqlash</button></section>)}</div>}
  <section className="bill-box bill-history"><h2>O‘zgarishlar tarixi</h2><div className="bill-table-wrap"><table><thead><tr><th>Vaqt (UZT)</th><th>O‘quvchi</th><th>Amal</th><th>Izoh</th></tr></thead><tbody>{data?.events.map(e=><tr key={e.id}><td>{date(e.created_at)}</td><td>{name(data.students.find(p=>p.id===e.student_id))}</td><td>{label(e.action)}</td><td>{e.note||'—'}</td></tr>)}</tbody></table></div></section>
 </section>;
}
