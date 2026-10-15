"use client";
import { useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, ChevronRight, ClipboardCopy, CreditCard, Crown, ExternalLink, LoaderCircle, RefreshCw, ShieldCheck, Wallet } from "lucide-react";
import { BILLING_PLANS, formatSom, type BillingMethod, type BillingPlan } from "@/lib/billing/plans";
import "../billing/billing.css";

type Card = { method: BillingMethod; card_number: string; card_holder: string };
type Order = { id: string; order_code: string; plan_key: BillingPlan; price_uzs: number; payment_method: BillingMethod; status: string; created_at?: string; admin_note?: string | null };
type Access = { plan_key: BillingPlan; starts_at: string; expires_at: string | null; mock_on: string | null };
type Data = { student: { first_name: string; last_name: string; username: string }; cards: Card[]; orders: Order[]; access: Access[]; telegram: string };

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
 const pendingOrder = data?.orders.find(item => item.status === "pending");
 const displayPlan = pendingOrder?.plan_key || selected;
 const displayMethod = pendingOrder?.payment_method || method;
 const card = data?.cards.find(item => item.method === displayMethod);
 const pending = data?.orders.find(item => item.status === "pending");
 const selectedPlan = BILLING_PLANS.find(item => item.key === displayPlan)!;
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
     setSuccess("To‘lovingiz tekshiruvga yuborildi. Endi chekni Telegram orqali adminga yuboring.");
     await refresh();
     window.location.assign(telegramLink(body.order.plan_key, body.order.price_uzs));
   } catch (err) { setError(err instanceof Error ? err.message : "Xatolik yuz berdi."); }
   finally { setWorking(false); }
 }
 function telegramLink(planKey: BillingPlan, amount: number) {
   const student = data?.student;
   const text = ["To‘lov qildim.", "Ism familiya: " + [student?.first_name, student?.last_name].filter(Boolean).join(" "), "Saytdagi username: " + (student?.username || ""), "Paket: " + BILLING_PLANS.find(p => p.key === planKey)?.name, "Summa: " + formatSom(amount), "To‘lov chekini ilova qilaman."].join("\n");
   return "https://t.me/rustam_usmon0v?text=" + encodeURIComponent(text);
 }
 return <section className="bill-page bill-compact" aria-label="Billing va paketlar">
   <div className="bill-hero"><div><h1>Paketlar va to‘lovlar</h1><p>Paketingizni tanlang. To‘lang. Chekni adminga yuboring.</p></div><button className="bill-small-btn" onClick={()=>void refresh()} disabled={loading}><RefreshCw size={15}/> Yangilash</button></div>
   <div className="bill-summary">
     <div className="bill-summary-card"><span className="bill-icon blue"><Crown size={23}/></span><div><small>Joriy obuna</small><b>{active.length ? "Faol paket mavjud" : "Faol obuna yo‘q"}</b><span>{active.map(item => BILLING_PLANS.find(p=>p.key===item.plan_key)?.name).filter(Boolean).join(" · ") || "Paketni tanlang"}</span></div></div>
     <div className="bill-summary-card"><span className="bill-icon green"><CalendarClock size={23}/></span><div><small>Obuna muddati</small><b>{active.find(item=>item.expires_at)?.expires_at ? new Date(active.find(item=>item.expires_at)!.expires_at!).toLocaleDateString("uz-UZ") : "—"}</b><span>7 kunlik Challenge paketlari</span></div></div>
     <div className="bill-summary-card"><span className="bill-icon purple"><CreditCard size={23}/></span><div><small>So‘nggi to‘lov</small><b>{pending ? "Tasdiq kutilmoqda" : data?.orders[0] ? data.orders[0].status === "approved" ? "Tasdiqlangan" : "Rad etilgan" : "Hali mavjud emas"}</b><span>To‘lov faqat admin tasdig‘idan keyin faollashadi</span></div></div>
   </div>
   <div className="bill-plans">{BILLING_PLANS.map(plan => <button type="button" key={plan.key} disabled={!!pending} aria-pressed={displayPlan===plan.key} onClick={()=>setSelected(plan.key)} className={"bill-plan "+(displayPlan===plan.key?"chosen ":"")+(plan.key==="all_access"?"highlight":"")}>
      {plan.key==="all_access"&&<span className="bill-popular"><Crown size={13}/> Eng foydali</span>}
      <div className="bill-plan-top"><img className="bill-art" src={"/images/billing/"+plan.key+".png"} alt="" width={80} height={80}/><div><strong>{plan.name}</strong><div className="bill-price">{formatSom(plan.price)}</div><small>{plan.period}</small></div></div>
      <ul>{plan.features.map(item=><li key={item}><CheckCircle2 size={15}/>{item}</li>)}</ul>
      <span className={"bill-select "+(displayPlan===plan.key?"on":"")}>{displayPlan===plan.key?"Tanlangan":"Tanlash"} <ChevronRight size={16}/></span>
   </button>)}</div>
   <div className="bill-pay-grid">
    <section className="bill-box">
      <h2><Wallet size={20}/> To‘lov ma’lumotlari</h2>
      <p className="bill-muted">Karta raqamini ko‘chirib, tanlangan paket summasini o‘tkazing.</p>
      <div className="bill-methods">{(["uzcard","humo"] as BillingMethod[]).map(item=><button key={item} type="button" disabled={!!pending} className={displayMethod===item?"current":""} onClick={()=>setMethod(item)}>{item.toUpperCase()}</button>)}</div>
      {card ? <div className="bill-card"><small>{displayMethod.toUpperCase()} · Karta raqami</small><strong>{card.card_number.replace(/(\d{4})(?=\d)/g,"$1 ")}</strong>{card.card_holder !== "Ko‘rsatilmagan" && <span>Karta egasi: {card.card_holder}</span>}<button type="button" aria-label="Karta raqamini nusxalash" onClick={()=>void copy(card.card_number,"card")}><ClipboardCopy size={19}/>{copied==="card"?"Nusxalandi":"Nusxalash"}</button></div> : <div className="bill-not-set">Karta rekvizitlari hali admin tomonidan kiritilmagan. <a href="https://t.me/rustam_usmon0v" target="_blank" rel="noopener noreferrer">Adminga murojaat qiling.</a></div>}
      <div className="bill-order-amount"><span>Tanlangan paket: <b>{selectedPlan.name}</b></span><strong>{formatSom(selectedPlan.price)}</strong></div>
      {!pending&&<button className="bill-primary" type="button" disabled={working||loading||!card} onClick={()=>void createOrder()}>{working?<LoaderCircle size={16}/>:<ShieldCheck size={17}/>} To‘lov qildim</button>}
      {!!error&&<p className="bill-error" role="alert">{error}</p>}
      {!!success&&<p className="bill-success" role="status">{success}</p>}
    </section>
    <section className="bill-box">
      <h2><ShieldCheck size={20}/> To‘lovni tasdiqlash</h2>
      <ol className="bill-steps">
        <li><b>1</b><span>Tanlangan paket summasini kartaga o‘tkazing.</span></li>
        <li><b>2</b><span><strong>To‘lov qildim</strong> tugmasini bosing. Ochilgan Telegram chatiga chek va ism familiyangizni yuboring.</span></li>
        <li><b>3</b><span>Admin chek va bank tushumini tekshirib, to‘lovni tasdiqlaydi.</span></li>
      </ol>
      {pending&&<div className="bill-pending"><span>TASDIQ KUTILMOQDA</span><p>{formatSom(pending.price_uzs)} · {BILLING_PLANS.find(p=>p.key===pending.plan_key)?.name} · {pending.payment_method.toUpperCase()}</p><small>Chek yuborgan bo‘lsangiz, admin javobini kuting. Qayta to‘lamang.</small></div>}
      <a className="bill-telegram" href={pending?telegramLink(pending.plan_key,pending.price_uzs):"https://t.me/rustam_usmon0v"} target="_blank" rel="noopener noreferrer"><ExternalLink size={18}/> {pending?"Chekni adminga yuborish":"Adminga murojaat"} <ChevronRight size={16}/></a>
      <p className="bill-muted bill-contact">@rustam_usmon0v</p>
      <p className="bill-caution">Chek faqat Telegramga yuboriladi. Paket admin tasdig‘idan so‘ng faollashadi.</p>
    </section>
   </div>
   <section className="bill-box bill-history"><h2>To‘lovlar tarixi</h2>{!data?.orders?.length?<p className="bill-muted">{loading?"Yuklanmoqda...":"Hozircha to‘lov so‘rovlari yo‘q."}</p>:<div className="bill-table-wrap"><table><thead><tr><th>Paket</th><th>Summa</th><th>Sana</th><th>Holat</th></tr></thead><tbody>{data.orders.map(item=><tr key={item.id}><td>{BILLING_PLANS.find(p=>p.key===item.plan_key)?.name}</td><td>{formatSom(item.price_uzs)}</td><td>{item.created_at?new Date(item.created_at).toLocaleDateString("uz-UZ"):"—"}</td><td><span className={"bill-status "+item.status}>{item.status==="approved"?"Tasdiqlangan":item.status==="rejected"?"Rad etilgan":"Kutilmoqda"}</span>{item.admin_note&&<small className="bill-note">{item.admin_note}</small>}</td></tr>)}</tbody></table></div>}</section>
  </section>;
}
