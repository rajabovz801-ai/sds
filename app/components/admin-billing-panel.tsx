"use client";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CreditCard, ExternalLink, RefreshCw, Search, ShieldCheck, Wallet, XCircle } from "lucide-react";
import { BILLING_PLANS, formatSom, type BillingMethod, type BillingPlan } from "@/lib/billing/plans";
import "../billing/billing.css";

type AdminOrder = {
 id: string; order_code: string; plan_key: BillingPlan; price_uzs: number; payment_method: BillingMethod;
 status: "pending"|"approved"|"rejected"; created_at: string; admin_note: string|null;
 student: { id: string; first_name: string; last_name: string; username: string } | null;
};
type AdminCard = { method: BillingMethod; card_number: string; card_holder: string; enabled: boolean };
type Payload = { orders: AdminOrder[]; cards: AdminCard[]; stats: { pending: number; approved: number; rejected: number; approved_uzs: number }; limited: boolean };
type CardForm = { number: string; holder: string; enabled: boolean };
const defaults: Record<BillingMethod,CardForm> = { uzcard: { number: "", holder: "", enabled: true }, humo: { number: "", holder: "", enabled: true } };

export default function AdminBillingPanel() {
 const [data,setData] = useState<Payload|null>(null);
 const [forms,setForms] = useState<Record<BillingMethod,CardForm>>(defaults);
 const [filter,setFilter] = useState("pending");
 const [search,setSearch] = useState("");
 const [busy,setBusy] = useState("");
 const [note,setNote] = useState<Record<string,string>>({});
 const [message,setMessage] = useState("");
 const [loading,setLoading] = useState(true);
 async function load() {
   setLoading(true);
   try {
     const res = await fetch("/api/admin/billing",{credentials:"same-origin",cache:"no-store"});
     const body=await res.json();
     if(!res.ok) throw Error(body.error||"Ma‘lumotlarni yuklab bo‘lmadi.");
     setData(body);
     setForms({
       uzcard:{ number: body.cards.find((item:AdminCard)=>item.method==="uzcard")?.card_number||"", holder: body.cards.find((item:AdminCard)=>item.method==="uzcard")?.card_holder||"", enabled: body.cards.find((item:AdminCard)=>item.method==="uzcard")?.enabled??true },
       humo:{ number: body.cards.find((item:AdminCard)=>item.method==="humo")?.card_number||"", holder: body.cards.find((item:AdminCard)=>item.method==="humo")?.card_holder||"", enabled: body.cards.find((item:AdminCard)=>item.method==="humo")?.enabled??true },
     });
     setMessage("");
   } catch(e) { setMessage(e instanceof Error?e.message:"Billing panel xatoligi."); }
   finally { setLoading(false); }
 }
 useEffect(()=>{void load();},[]);
 const visible=useMemo(()=>data?.orders.filter(order=>{
   const matches=filter==="all"||order.status===filter;
   const q=search.toLowerCase().trim();
   return matches&&(!q||[order.order_code,order.student?.first_name,order.student?.last_name,order.student?.username,order.plan_key].some(value=>String(value||"").toLowerCase().includes(q)));
 })||[],[data,filter,search]);
 async function post(body:object) {
   const res=await fetch("/api/admin/billing",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
   const result=await res.json();
   if(!res.ok)throw Error(result.error||"Amal bajarilmadi.");
 }
 async function review(order:AdminOrder,decision:"approved"|"rejected"){
   if(decision==="approved"&&!window.confirm(order.order_code+" uchun "+formatSom(order.price_uzs)+" BANK HISOBIGA TUSHGANINI tekshirdingizmi? Tasdiqlansa paket ochiladi.")) return;
   if(decision==="rejected"&&!note[order.id]?.trim()) { setMessage("Rad etish uchun sabab yozing."); return; }
   if(decision==="rejected"&&!window.confirm(order.order_code+" to‘lovini rad etasizmi?"))return;
   setBusy(order.id);setMessage("");
   try {await post({action:"review",order_id:order.id,decision,note:note[order.id]||""});await load();setMessage(decision==="approved"?"To‘lov tasdiqlandi, paket yozildi.":"To‘lov rad etildi.");}
   catch(e){setMessage(e instanceof Error?e.message:"Tekshirib bo‘lmadi.");}
   finally{setBusy("");}
 }
 async function saveCard(method:BillingMethod){
   setBusy(method);setMessage("");
   try {await post({action:"set_card",method,number:forms[method].number.replaceAll(" ",""),holder:forms[method].holder,enabled:forms[method].enabled});await load();setMessage(method.toUpperCase()+" karta ma‘lumotlari saqlandi.");}
   catch(e){setMessage(e instanceof Error?e.message:"Kartani saqlab bo‘lmadi.");}
   finally{setBusy("");}
 }
 return <section className="bill-page bill-admin">
   <div className="bill-admin-head"><span className="bill-eyebrow">SUPER ADMIN · PAYMENT CONTROL</span><h1>To‘lovlar boshqaruvi</h1><p>Cheklar faqat Telegramda. Bu yerda buyurtma va bank tushumi tekshirilgach tasdiqlanadi.</p></div>
   <div className="bill-admin-stats">
     <div><span>⏳ Kutilmoqda</span><strong>{data?.stats.pending??"—"}</strong></div>
     <div><span>✓ Tasdiqlangan</span><strong>{data?.stats.approved??"—"}</strong></div>
     <div><span>✕ Rad etilgan</span><strong>{data?.stats.rejected??"—"}</strong></div>
     <div><span>Jami tasdiqlangan</span><strong>{formatSom(data?.stats.approved_uzs??0)}</strong></div>
   </div>
   <div className="bill-section-head"><div><h2>To‘lov so‘rovlari</h2><p>Buyurtma ID raqamini Telegramdagi chek bilan solishtiring.</p></div><button className="bill-small-btn" onClick={()=>void load()} disabled={loading}><RefreshCw size={15}/> Yangilash</button></div>
   <div className="bill-admin-filters">
    <div className="bill-tabs">{[{key:"pending",name:"Kutilmoqda"},{key:"approved",name:"Tasdiqlangan"},{key:"rejected",name:"Rad etilgan"},{key:"all",name:"Barchasi"}].map(item=><button key={item.key} className={filter===item.key?"active":""} onClick={()=>setFilter(item.key)}>{item.name}</button>)}</div>
    <label className="bill-search"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="O‘quvchi yoki buyurtma raqami"/></label>
   </div>
   {!!message&&<p className="bill-message" role="status">{message}</p>}
   <section className="bill-box">
    {!visible.length?<p className="bill-muted">{loading?"Yuklanmoqda...":"Bu bo‘limda so‘rov yo‘q."}</p>:<div className="bill-table-wrap"><table><thead><tr><th>O‘quvchi</th><th>Buyurtma</th><th>Paket</th><th>Summa</th><th>Usul</th><th>Holat</th><th>Amal</th></tr></thead><tbody>{visible.map(order=><tr key={order.id}>
      <td><b>{order.student?order.student.first_name+" "+order.student.last_name:"O‘quvchi"}</b><small className="bill-note">{order.student?.username||order.student?.id||""}</small></td>
      <td><b>{order.order_code}</b><small className="bill-note">{new Date(order.created_at).toLocaleString("uz-UZ")}</small></td>
      <td>{BILLING_PLANS.find(p=>p.key===order.plan_key)?.name}</td><td>{formatSom(order.price_uzs)}</td><td>{order.payment_method.toUpperCase()}</td>
      <td><span className={"bill-status "+order.status}>{order.status==="pending"?"Kutilmoqda":order.status==="approved"?"Tasdiqlangan":"Rad etilgan"}</span>{order.admin_note&&<small className="bill-note">{order.admin_note}</small>}</td>
      <td>{order.status==="pending"?<div className="bill-review-actions">
          <label>Admin izohi<input maxLength={500} placeholder="Izoh (rad etishga majburiy)" value={note[order.id]||""} onChange={e=>setNote(v=>({...v,[order.id]:e.target.value}))}/></label>
          <button className="approve" disabled={!!busy} onClick={()=>void review(order,"approved")}><CheckCircle2 size={15}/> Tasdiqlash</button>
          <button className="reject" disabled={!!busy} onClick={()=>void review(order,"rejected")}><XCircle size={15}/> Rad etish</button>
        </div>:<span className="bill-muted">Tekshirilgan</span>}</td>
    </tr>)}</tbody></table></div>}
    {data?.limited&&<p className="bill-muted">Oxirgi 200 ta to‘lov ko‘rsatilmoqda. Keyingi bosqichda sahifalash qo‘shiladi.</p>}
   </section>
   <div className="bill-section-head"><div><h2>UZCARD / HUMO sozlamalari</h2><p>To‘lov rekvizitlarini faqat Super Admin o‘zgartiradi.</p></div><a href="https://t.me/rustam_usmon0v" target="_blank" rel="noopener noreferrer" className="bill-small-btn"><ExternalLink size={14}/> Telegram lichka</a></div>
   <div className="bill-admin-cards">{(["uzcard","humo"] as BillingMethod[]).map(method=><section className="bill-box" key={method}>
      <h2><CreditCard size={19}/>{method.toUpperCase()}</h2><label className="bill-field">Karta raqami<input inputMode="numeric" value={forms[method].number} onChange={e=>setForms(v=>({...v,[method]:{...v[method],number:e.target.value}}))} placeholder="16 xonali karta raqami" maxLength={19}/></label>
      <label className="bill-field">Karta egasi<input value={forms[method].holder} maxLength={100} onChange={e=>setForms(v=>({...v,[method]:{...v[method],holder:e.target.value}}))} placeholder="Ism familiya"/></label>
      <label className="bill-check"><input type="checkbox" checked={forms[method].enabled} onChange={e=>setForms(v=>({...v,[method]:{...v[method],enabled:e.target.checked}}))}/> O‘quvchilar uchun faol</label>
      <button className="bill-primary" disabled={!!busy} onClick={()=>void saveCard(method)}><ShieldCheck size={16}/> Saqlash</button>
   </section>)}</div>
   <p className="bill-caution"><Wallet size={17}/> Chek rasmlari bu panelga yuklanmaydi. To‘lov faqat bank hisobiga tushgani tekshirilgandan so‘ng tasdiqlanadi. Eski test natijalari va kirish huquqlari o‘zgarmaydi.</p>
 </section>;
}
