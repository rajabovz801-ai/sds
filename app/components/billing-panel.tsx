"use client";
import { useEffect, useState } from "react";
import { BookOpen, CalendarClock, CheckCircle2, ChevronRight, ClipboardCopy, CreditCard, Crown, ExternalLink, LoaderCircle, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import { BILLING_PLANS, formatSom, type BillingMethod, type BillingPlan } from "@/lib/billing/plans";
import "../billing/billing.css";

type Card = { method: BillingMethod; card_number: string; card_holder: string };
type Order = { id: string; order_code: string; plan_key: BillingPlan; price_uzs: number; payment_method: BillingMethod; status: string; created_at?: string; admin_note?: string | null };
type Access = { plan_key: BillingPlan; starts_at: string; expires_at: string | null; mock_on: string | null };
type Data = { cards: Card[]; orders: Order[]; access: Access[]; telegram: string };

export default function BillingPanel() {
 const [data, setData] = useState<Data | null>(null);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState("");
 const [success, setSuccess] = useState("");
 const [working, setWorking] = useState(false);
 const [selected, setSelected] = useState<BillingPlan>("all_access");
 const [method, setMethod] = useState<BillingMethod>("uzcard");
 const [copied, setCopied] = useState("");

 async function refresh() {
   setLoading(true);
   try {
     const res = await fetch("/api/billing", { credentials: "same-origin", cache: "no-store" });
     const body = await res.json();
     if (!res.ok) throw Error(body.error || "To‘lov ma’lumotlari ochilmadi.");
     setData(body); setError("");
   } catch (err) { setError(err instanceof Error ? err.message : "Xatolik yuz berdi."); }
   finally { setLoading(false); }
 }
 useEffect(() => { void refresh(); }, []);
 const card = data?.cards.find(item => item.method === method);
 const pending = data?.orders.find(item => item.status === "pending");
 const selectedPlan = BILLING_PLANS.find(item => item.key === selected)!;
 const active = data?.access.filter(item => (item.expires_at && Date.parse(item.expires_at) > Date.now()) || (item.mock_on && item.mock_on >= new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()))) || [];

 async function copy(value: string, kind: string) {
   try { await navigator.clipboard.writeText(value); setCopied(kind); }
   catch { setError("Nusxalash ishlamadi. Matnni qo‘lda nusxalang."); }
 }
 async function createOrder() {
   setWorking(true); setError(""); setSuccess("");
   try {
     const res = await fetch("/api/billing", {
       method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
       body: JSON.stringify({ plan_key: selected, payment_method: method }),
     });
     const body = await res.json();
     if (!res.ok) throw Error(body.error || "So‘rov yuborilmadi.");
     setSuccess(body.reused ? "Avvalgi to‘lov so‘rovingiz ochildi." : "To‘lov so‘rovi yaratildi. Chekni Telegramga yuboring.");
     await refresh();
   } catch (err) { setError(err instanceof Error ? err.message : "Xatolik yuz berdi."); }
   finally { setWorking(false); }
 }
 const telegramMessage = pending ? "ARK to‘lov: " + pending.order_code + "\nPaket: " + (BILLING_PLANS.find(p => p.key === pending.plan_key)?.name || pending.plan_key) + "\nSumma: " + formatSom(pending.price_uzs) + "\nTo‘lov cheki ilova qilinadi." : "";
 return <section className="bill-page" aria-label="Billing va paketlar">
   <div className="bill-hero"><div><span className="bill-eyebrow">✦ ARK EDUCATION · MEMBERSHIP</span><h1>Billing & Membership</h1><p>O‘zingizga mos paketni tanlang va tayyorgarlikni davom ettiring.</p></div><img src="/images/workspace/wolf-study.png" alt="" /></div>
   <div className="bill-summary">
     <div className="bill-summary-card"><span className="bill-icon blue"><Crown size={23}/></span><div><small>Joriy obuna</small><b>{active.length ? "Faol paket mavjud" : "Faol obuna yo‘q"}</b><span>{active.map(item => BILLING_PLANS.find(p=>p.key===item.plan_key)?.name).filter(Boolean).join(" · ") || "Paketni tanlang"}</span></div></div>
     <div className="bill-summary-card"><span className="bill-icon green"><CalendarClock size={23}/></span><div><small>Obuna muddati</small><b>{active.find(item=>item.expires_at)?.expires_at ? new Date(active.find(item=>item.expires_at)!.expires_at!).toLocaleDateString("uz-UZ") : "—"}</b><span>7 kunlik Challenge paketlari</span></div></div>
     <div className="bill-summary-card"><span className="bill-icon purple"><CreditCard size={23}/></span><div><small>So‘nggi to‘lov</small><b>{pending ? "Tasdiq kutilmoqda" : data?.orders[0] ? data.orders[0].status === "approved" ? "Tasdiqlangan" : "Rad etilgan" : "Hali mavjud emas"}</b><span>To‘lov faqat admin tasdig‘idan keyin faollashadi</span></div></div>
   </div>
   <div className="bill-section-head"><div><h2>O‘zingizga mos paketni tanlang</h2><p>Har bir paket imkoniyatlari va narxi aniq ko‘rsatilgan.</p></div><button className="bill-small-btn" onClick={()=>void refresh()} disabled={loading}><RefreshCw size={15}/> Yangilash</button></div>
   <div className="bill-plans">{BILLING_PLANS.map(plan => <button type="button" key={plan.key} onClick={()=>setSelected(plan.key)} className={"bill-plan "+(selected===plan.key?"chosen ":"")+(plan.key==="all_access"?"highlight":"")}>
      {plan.key==="all_access"&&<span className="bill-popular"><Crown size={13}/> Eng foydali</span>}
      <span className={"bill-plan-art "+plan.key}>{plan.key==="challenge"?<BookOpen/>:plan.key==="mock"?<CalendarClock/>:<Crown/>}</span>
      <strong>{plan.name}</strong><span className="bill-plan-sub">{plan.description}</span>
      <div className="bill-price">{formatSom(plan.price)}</div><small>{plan.period}</small>
      <ul>{plan.features.map(item=><li key={item}><CheckCircle2 size={15}/>{item}</li>)}</ul>
      <span className={"bill-select "+(selected===plan.key?"on":"")}>{selected===plan.key?"Tanlangan":"Ushbu paketni tanlash"} <ChevronRight size={16}/></span>
   </button>)}</div>
   <div className="bill-pay-grid">
    <section className="bill-box">
      <h2><Wallet size={20}/> To‘lov ma’lumotlari</h2>
      <p className="bill-muted">Karta raqamini ko‘chirib, tanlangan paket summasini o‘tkazing.</p>
      <div className="bill-methods">{(["uzcard","humo"] as BillingMethod[]).map(item=><button key={item} type="button" className={method===item?"current":""} onClick={()=>setMethod(item)}>{item.toUpperCase()}</button>)}</div>
      {card ? <div className="bill-card"><small>{method.toUpperCase()} · Karta raqami</small><strong>{card.card_number.replace(/(\d{4})(?=\d)/g,"$1 ")}</strong><span>Karta egasi: {card.card_holder}</span><button type="button" aria-label="Karta raqamini nusxalash" onClick={()=>void copy(card.card_number,"card")}><ClipboardCopy size={19}/>{copied==="card"?"Nusxalandi":"Nusxalash"}</button></div> : <div className="bill-not-set">Karta rekvizitlari hali admin tomonidan kiritilmagan. <a href="https://t.me/rustam_usmon0v" target="_blank" rel="noopener noreferrer">Adminga murojaat qiling.</a></div>}
      <div className="bill-order-amount"><span>Tanlangan paket: <b>{selectedPlan.name}</b></span><strong>{formatSom(selectedPlan.price)}</strong></div>
      {!pending&&<button className="bill-primary" type="button" disabled={working||loading||!card} onClick={()=>void createOrder()}>{working?<LoaderCircle size={16}/>:<ShieldCheck size={17}/>} To‘lov so‘rovini yaratish</button>}
      {!!error&&<p className="bill-error" role="alert">{error}</p>}
      {!!success&&<p className="bill-success" role="status">{success}</p>}
    </section>
    <section className="bill-box">
      <h2><ShieldCheck size={20}/> To‘lovni tasdiqlash tartibi</h2>
      <ol className="bill-steps">
        <li><b>1</b><span>Yuqoridagi kartaga to‘lovni amalga oshiring.</span></li>
        <li><b>2</b><span>To‘lov chekini telefoningizda saqlang.</span></li>
        <li><b>3</b><span>Chek va buyurtma raqamini Telegram orqali <strong>@rustam_usmon0v</strong> ga yuboring.</span></li>
        <li><b>4</b><span>Admin bank tushumini tekshirgach, paket faollashadi.</span></li>
      </ol>
      {pending&&<div className="bill-pending"><span>TO‘LOV KUTILMOQDA · {pending.payment_method.toUpperCase()}</span><strong>{pending.order_code}</strong><p>{formatSom(pending.price_uzs)} · {BILLING_PLANS.find(p=>p.key===pending.plan_key)?.name}</p><button type="button" onClick={()=>void copy(telegramMessage,"order")}><ClipboardCopy size={16}/> {copied==="order"?"Matn nusxalandi":"Telegram uchun buyurtma matnini nusxalash"}</button></div>}
      <a className="bill-telegram" href="https://t.me/rustam_usmon0v" target="_blank" rel="noopener noreferrer"><ExternalLink size={18}/> Chekni Telegram lichkaga yuborish <ChevronRight size={16}/></a>
      <p className="bill-caution">Muhim: chek SAYTGA yuklanmaydi. Chekni Telegram lichkaga yuborish paketni avtomatik ochmaydi. Faqat admin bank tushumini tekshirib, tasdiqlaydi.</p>
    </section>
   </div>
   <section className="bill-box bill-history"><h2>To‘lovlar tarixi</h2>{!data?.orders?.length?<p className="bill-muted">{loading?"Yuklanmoqda...":"Hozircha to‘lov so‘rovlari yo‘q."}</p>:<div className="bill-table-wrap"><table><thead><tr><th>Buyurtma</th><th>Paket</th><th>Summa</th><th>Sana</th><th>Holat</th></tr></thead><tbody>{data.orders.map(item=><tr key={item.id}><td>{item.order_code}</td><td>{BILLING_PLANS.find(p=>p.key===item.plan_key)?.name}</td><td>{formatSom(item.price_uzs)}</td><td>{item.created_at?new Date(item.created_at).toLocaleDateString("uz-UZ"):"—"}</td><td><span className={"bill-status "+item.status}>{item.status==="approved"?"Tasdiqlangan":item.status==="rejected"?"Rad etilgan":"Kutilmoqda"}</span>{item.admin_note&&<small className="bill-note">{item.admin_note}</small>}</td></tr>)}</tbody></table></div>}</section>
  </section>;
}
