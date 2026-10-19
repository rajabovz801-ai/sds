"use client";
import type {Membership} from "@/lib/billing/access-policy";
import { useEffect, useRef, useState } from "react";
import { CalendarClock, CheckCircle2, ChevronRight, ClipboardCopy, CreditCard, Crown, ExternalLink, LoaderCircle, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import { BILLING_PLANS, formatSom, type BillingMethod, type BillingPlan } from "@/lib/billing/plans";
import "../billing/billing.css";

type Card = { method: BillingMethod; card_number: string; card_holder: string };
type Order = { mock_on?:string|null; id: string; order_code: string; plan_key: string; price_uzs: number; payment_method: BillingMethod|'cash'; status: string; created_at?: string; admin_note?: string | null };
type Access = { plan_key: string; starts_at: string; expires_at: string | null; mock_on: string | null };
type Data = { membership:Membership; student: { first_name: string; last_name: string; username: string }; cards: Card[]; orders: Order[]; access: Access[]; telegram: string };

export default function BillingPanel() {
 const [data, setData] = useState<Data | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState("");
 const [success, setSuccess] = useState("");
 const [working, setWorking] = useState(false);
 const [selected, setSelected] = useState<BillingPlan>("challenge");
 const [method, setMethod] = useState<BillingMethod>("uzcard");
 const [copied, setCopied] = useState("");
 const [confirmation,setConfirmation]=useState<"pay"|"cancel"|null>(null);
 const workingRef=useRef(false);
 const refreshSequence=useRef(0);

 async function refresh() {
   const sequence=++refreshSequence.current;
   setLoading(true);
   try {
     const res = await fetch("/api/billing", { credentials: "same-origin", cache: "no-store" });
     const body = await res.json();
     if (!res.ok) throw Error(body.error || "To‘lov ma’lumotlari ochilmadi.");
     if(sequence===refreshSequence.current){setData(body); setError("");}
   } catch (err) { if(sequence===refreshSequence.current)setError(err instanceof Error ? err.message : "Xatolik yuz berdi."); }
   finally { if(sequence===refreshSequence.current)setLoading(false); }
 }
 useEffect(() => {
  const plan=new URLSearchParams(location.search).get("plan");if(["challenge","mock"].includes(plan||""))setSelected(plan as BillingPlan);
  void refresh();const focus=()=>{if(document.visibilityState==="visible")void refresh()};window.addEventListener("focus",focus);document.addEventListener("visibilitychange",focus);const timer=setInterval(focus,60000);
  return()=>{window.removeEventListener("focus",focus);document.removeEventListener("visibilitychange",focus);clearInterval(timer)};
 }, []);
 const pendingOrder = data?.orders.find(item => item.status === "pending");
 const displayPlan = pendingOrder && BILLING_PLANS.some(plan=>plan.key===pendingOrder.plan_key) ? pendingOrder.plan_key : selected;
 const displayMethod = pendingOrder?.payment_method || method;
 const card = data?.cards.find(item => item.method === displayMethod);
 const pending = data?.orders.find(item => item.status === "pending");
 const selectedPlan = BILLING_PLANS.find(item => item.key === displayPlan)!;
 const active = data?.access.filter(item => Date.parse(item.starts_at)<=Date.now()&&((item.expires_at && Date.parse(item.expires_at) > Date.now()) || (item.mock_on && item.mock_on >= new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())))) || [];

 async function copy(value: string, kind: string) {
   try { await navigator.clipboard.writeText(value); setCopied(kind); }
   catch { setError("Nusxalash ishlamadi. Matnni qo‘lda nusxalang."); }
 }
 async function cancelOrder(){
   if(!pending||workingRef.current)return;
   workingRef.current=true;setConfirmation(null);
   setWorking(true);setError("");try{const res=await fetch("/api/billing",{method:"POST",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"cancel",order_id:pending.id})});const body=await res.json();if(!res.ok)throw Error(body.error);await refresh();setSuccess("So‘rov bekor qilindi. Kerakli paketni qayta tanlashingiz mumkin.")}catch(e){setError(e instanceof Error?e.message:"Bekor qilinmadi.")}finally{workingRef.current=false;setWorking(false)}
 }
 const statusLabel=(status:string)=>({approved:"Tasdiqlangan",rejected:"Rad etilgan",pending:"Kutilmoqda",cancelled:"Bekor qilingan",revoked:"Tasdiq qaytarilgan"}[status]||status);
 async function createOrder() {
   if(workingRef.current||pending||!card)return;
   workingRef.current=true;setConfirmation(null);
   setWorking(true); setError(""); setSuccess("");
   try {
     const res = await fetch("/api/billing", {
       method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ plan_key: selected, payment_method: method }),
     });
     const body = await res.json();
     if (!res.ok) throw Error(body.error || "So‘rov yuborilmadi.");
     setSuccess("To‘lovingiz tekshiruvga yuborildi. Endi chekni Telegram orqali adminga yuboring.");
     await refresh();

   } catch (err) { setError(err instanceof Error ? err.message : "Xatolik yuz berdi."); }
   finally { workingRef.current=false;setWorking(false); }
 }
 function telegramLink(planKey: string, amount: number) {
   const student = data?.student;
   const text = ["To‘lov qildim.", "Ism familiya: " + [student?.first_name, student?.last_name].filter(Boolean).join(" "), "Saytdagi username: " + (student?.username || ""), "Paket: " + (BILLING_PLANS.find(p => p.key === planKey)?.name || "All Access (eski paket)"), "Summa: " + formatSom(amount), "To‘lov chekini ilova qilaman."].join("\n");
   return "https://t.me/rustam_usmon0v?text=" + encodeURIComponent(text);
 }
 return <section className="bill-page bill-compact" aria-label="Billing va paketlar">
   {confirmation&&<BillingConfirmation title={confirmation==='pay'?'To‘lovni amalga oshirdingizmi?':'So‘rovni bekor qilasizmi?'} onClose={()=>setConfirmation(null)}>
     <p>{confirmation==='pay'?<>{selectedPlan.name} · <strong>{formatSom(selectedPlan.price)}</strong><br/>Tasdiqlang, keyin “Chekni adminga yuborish” tugmasi orqali chekni yuboring.</>:'Pul o‘tkazgan bo‘lsangiz, avval @rustam_usmon0v bilan bog‘laning.'}</p>
     <button className="bill-primary" disabled={working} onClick={()=>void (confirmation==='pay'?createOrder():cancelOrder())}>{confirmation==='pay'?'To‘lovni tasdiqlash':'So‘rovni bekor qilish'}</button>
     <button className="membership-secondary" onClick={()=>setConfirmation(null)}>Orqaga</button>
   </BillingConfirmation>}
   <div className="bill-hero"><div><h1>Paketlar va to‘lovlar</h1><p>Challenge — tasdiqdan boshlab 7 kun. Yakshanba ham sanaladi, ammo Full MOCK alohida to‘lanadi.</p></div><button className="bill-small-btn" onClick={()=>void refresh()} disabled={loading}><RefreshCw size={15}/> Yangilash</button></div>
   <div className="bill-summary">
     <div className="bill-summary-card"><span className="bill-icon blue"><Crown size={23}/></span><div><small>Joriy obuna</small><b>{active.length ? "Faol paket mavjud" : "Faol obuna yo‘q"}</b><span>{active.map(item => (BILLING_PLANS.find(p=>p.key===item.plan_key)?.name||"All Access (eski paket)")).filter(Boolean).join(" · ") || "Paketni tanlang"}</span></div></div>
     <div className="bill-summary-card"><span className="bill-icon green"><CalendarClock size={23}/></span><div><small>Obuna muddati</small><b>{active.find(item=>item.expires_at)?.expires_at ? new Date(active.find(item=>item.expires_at)!.expires_at!).toLocaleDateString("uz-UZ",{timeZone:"Asia/Tashkent"}) : "—"}</b><span>7 kunlik Challenge paketlari</span></div></div>
     <div className="bill-summary-card"><span className="bill-icon purple"><CreditCard size={23}/></span><div><small>So‘nggi to‘lov</small><b>{pending ? "Tasdiq kutilmoqda" : data?.orders[0] ? statusLabel(data.orders[0].status) : "Hali mavjud emas"}</b><span>To‘lov faqat admin tasdig‘idan keyin faollashadi</span></div></div>
   </div>
   <div className="bill-plans" id="billing-plans">{BILLING_PLANS.map(plan => <button type="button" key={plan.key} disabled={!!pending} aria-pressed={displayPlan===plan.key} onClick={()=>setSelected(plan.key)} className={"bill-plan "+(displayPlan===plan.key?"chosen ":"")}>
      <div className="bill-plan-top"><img className="bill-art" src={"/images/billing/"+plan.key+".png"} alt="" width={80} height={80}/><div><strong>{plan.name}</strong><div className="bill-price">{formatSom(plan.price)}</div><small>{plan.period}</small></div></div>
      <ul>{plan.features.map(item=><li key={item}><CheckCircle2 size={15}/>{item}</li>)}</ul>
      <span className={"bill-select "+(displayPlan===plan.key?"on":"")}>{displayPlan===plan.key?"Tanlangan":"Tanlash"} <ChevronRight size={16}/></span>
   </button>)}</div>
   <div className="bill-pay-grid">
    <section className="bill-box">
      <h2><Wallet size={20}/> To‘lov ma’lumotlari</h2>
      <p className="bill-muted">Karta raqamini ko‘chirib, tanlangan paket summasini o‘tkazing.</p>
      <div className="bill-methods">{(["uzcard","humo"] as BillingMethod[]).map(item=><button key={item} type="button" disabled={!!pending||!data?.cards.some(card=>card.method===item)} className={displayMethod===item?"current":""} onClick={()=>setMethod(item)}>{item.toUpperCase()}</button>)}</div>
      {card ? <div className="bill-card"><small>{displayMethod.toUpperCase()} · Karta raqami</small><strong>{card.card_number.replace(/(\d{4})(?=\d)/g,"$1 ")}</strong>{card.card_holder !== "Ko‘rsatilmagan" && <span>Karta egasi: {card.card_holder}</span>}<button type="button" aria-label="Karta raqamini nusxalash" onClick={()=>void copy(card.card_number,"card")}><ClipboardCopy size={19}/>{copied==="card"?"Nusxalandi":"Nusxalash"}</button></div> : <div className="bill-not-set">Karta rekvizitlari hali admin tomonidan kiritilmagan. <a href="https://t.me/rustam_usmon0v" target="_blank" rel="noopener noreferrer">Adminga murojaat qiling.</a></div>}
      {selectedPlan.key!=="challenge"&&<p className="bill-muted">Full MOCK: {pending?.mock_on||(()=>{const start=Math.max(Date.now(),Date.parse(data?.membership.launch_at||"2026-10-19T00:00:00+05:00"));const d=new Date(start+5*3600000);d.setUTCDate(d.getUTCDate()+((7-d.getUTCDay())%7));return d.toISOString().slice(0,10)})()}</p>}
      <div className="bill-order-amount"><span>Tanlangan paket: <b>{selectedPlan.name}</b></span><strong>{formatSom(selectedPlan.price)}</strong></div>
      {!pending&&<button className="bill-primary" type="button" disabled={working||loading||!card} onClick={()=>setConfirmation("pay")}>{working?<LoaderCircle size={16}/>:<ShieldCheck size={17}/>} To‘lov qildim</button>}
      {pending?.plan_key==="all_access"&&<p className="bill-error" role="alert">Oldingi All Access buyurtmangiz mavjud. Bu paket endi sotilmaydi. Hali to‘lamagan bo‘lsangiz, so‘rovni bekor qilib, Challenge va Full MOCK uchun alohida buyurtma bering. Pul o‘tkazgan bo‘lsangiz, bekor qilishdan oldin adminga murojaat qiling.</p>}
      {!!error&&<p className="bill-error" role="alert">{error}</p>}
      {!!success&&<p className="bill-success" role="status">{success}</p>}
    </section>
    <section className="bill-box">
      <h2><ShieldCheck size={20}/> To‘lovni tasdiqlash</h2>
      <ol className="bill-steps">
        <li><b>1</b><span>Tanlangan paket summasini kartaga o‘tkazing.</span></li>
        <li><b>2</b><span><strong>To‘lov qildim</strong> tugmasini bosing. Keyin quyidagi tugma orqali Telegram’ga chekni yuboring.</span></li>
        <li><b>3</b><span>Admin chek va bank tushumini tekshirib, to‘lovni tasdiqlaydi.</span></li>
      </ol>
      {pending&&<div className="bill-pending"><span>TASDIQ KUTILMOQDA</span><p>{formatSom(pending.price_uzs)} · {(BILLING_PLANS.find(p=>p.key===pending.plan_key)?.name||"All Access (eski paket)")} · {pending.payment_method.toUpperCase()}</p><small>Chek yuborgan bo‘lsangiz, admin javobini kuting. Qayta to‘lamang.</small><button type="button" disabled={working} onClick={()=>setConfirmation("cancel")}>Adashib bosdim — bekor qilish</button></div>}
      <a className="bill-telegram" href={pending?telegramLink(pending.plan_key,pending.price_uzs):"https://t.me/rustam_usmon0v"} target="_blank" rel="noopener noreferrer"><ExternalLink size={18}/> {pending?"Chekni adminga yuborish":"Adminga murojaat"} <ChevronRight size={16}/></a>
      <p className="bill-muted bill-contact">@rustam_usmon0v</p>
      <p className="bill-caution">Chek faqat Telegramga yuboriladi. Paket admin tasdig‘idan so‘ng faollashadi.</p>
    </section>
   </div>
   <section className="bill-box bill-history"><h2>To‘lovlar tarixi</h2>{!data?.orders?.length?<p className="bill-muted">{loading?"Yuklanmoqda...":"Hozircha to‘lov so‘rovlari yo‘q."}</p>:<div className="bill-table-wrap"><table><thead><tr><th>Paket</th><th>Summa</th><th>Sana</th><th>Holat</th></tr></thead><tbody>{data.orders.map(item=><tr key={item.id}><td>{(BILLING_PLANS.find(p=>p.key===item.plan_key)?.name||"All Access (eski paket)")}</td><td>{formatSom(item.price_uzs)}</td><td>{item.created_at?new Date(item.created_at).toLocaleDateString("uz-UZ",{timeZone:"Asia/Tashkent"}):"—"}</td><td><span className={"bill-status "+item.status}>{statusLabel(item.status)}</span>{item.admin_note&&<small className="bill-note">{item.admin_note}</small>}</td></tr>)}</tbody></table></div>}</section>
  </section>;
}

function BillingConfirmation({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  const dialog=ref.current;if(!dialog)return;
  const body=document.body;const overflow=body.style.overflow,padding=body.style.paddingRight;
  const gap=window.innerWidth-document.documentElement.clientWidth;
  body.style.paddingRight=(parseFloat(getComputedStyle(body).paddingRight)+gap)+'px';body.style.overflow='hidden';
  dialog.showModal();
  return()=>{dialog.close();body.style.overflow=overflow;body.style.paddingRight=padding};
 },[]);
 return <dialog ref={ref} className="bill-confirm" aria-label={title} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose()}}}>
  <h2><ShieldCheck size={22}/>{title}</h2>{children}
 </dialog>;
}
