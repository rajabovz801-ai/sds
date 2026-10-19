"use client";
import {membershipState,type Membership} from '@/lib/billing/access-policy';
import './membership.css';
export function MembershipNotice({membership,onBilling,onTrial}:{membership?:Membership;onBilling?:()=>void;onTrial?:()=>void}){
 if(!membership)return null;
 const state=membershipState(membership);
 const copy={
  trial:['Birinchi 2 kun — bepul sinov','Day 1 va Day 2 dagi 6 modulni sinab ko‘ring. Full MOCK alohida paket bilan ochiladi.','Bepul boshlash'],
  trial_finished:['Bepul sinov yakunlandi','Challenge’ni davom ettirish uchun o‘zingizga mos paketni tanlang. Natijalaringiz saqlangan.','Paketlarni ko‘rish'],
  pending:['To‘lov so‘rovingiz tekshirilmoqda','Chekni @rustam_usmon0v ga yuboring. Yuborgan bo‘lsangiz, admin tasdig‘ini kuting.','To‘lov holati'],
  locked:['Challenge’ni davom ettiring','Kundalik topshiriqlar faqat Challenge paketi bilan ochiladi.','Paket tanlash'],
  expired:['Obuna muddati tugadi','Yangi pullik test boshlash uchun obunani uzaytiring. Eski natijalar va fikrlar saqlangan.','Obunani uzaytirish'],
  scheduled:['Obunangiz tayyor','Tasdiqlangan paketingiz belgilangan boshlanish vaqtida faollashadi.','Obunani ko‘rish'],
  scheduled_launch:['19-oktabrdan — obuna bilan davom etamiz','Hozirgi natijalaringiz saqlanadi. Paketni oldindan tanlab, to‘lovni tasdiqlatishingiz mumkin.','Paketlarni ko‘rish'],
  active:['Paketingiz faol',membership.challenge_until?'Challenge: '+new Date(membership.challenge_until).toLocaleString('uz-UZ',{timeZone:'Asia/Tashkent'})+' gacha. '+(membership.mock_dates.length?'MOCK: '+membership.mock_dates.join(', '):'Full MOCK paketga kirmaydi.'):'MOCK ruxsati: '+membership.mock_dates.join(', '),'Obunani boshqarish'],
 }[state];
 return <section className={'membership-notice membership-'+state} aria-label="Obuna holati"><img src={'/images/billing/'+(state==='trial'?'trial':'premium-lock')+'.png'} alt="" width={92} height={80}/><div><span className="membership-kicker">{state==='trial'?'BEPUL SINOV':state==='active'?'FAOL PAKET':'BILLING & MEMBERSHIP'}</span><h2>{copy[0]}</h2><p>{copy[1]}</p>{membership.pending&&state==='active'&&<small>Yangi to‘lov so‘rovi tasdiq kutmoqda.</small>}</div><button type="button" onClick={state==='trial'&&onTrial?onTrial:onBilling}>{copy[2]}</button></section>;
}
export function MembershipLock({membership,day,future,onClose}:{membership?:Membership;day:number;future?:boolean;onClose?:()=>void}){
 if(day===18&&!future)return <section className="membership-lock"><span className="membership-kicker">DAY 18 · SHAXSIY KOD</span><h1>18-oktabr Mock uchun kodni kiriting</h1><p>Bu Mock admin bergan shaxsiy kod bilan ochiladi. Kod olgan bo‘lsangiz, qayta pul to‘lamang.</p><a className="membership-primary" href="/day/18/mock">Mock sahifasini ochish</a><a className="membership-secondary" href="/dashboard">Dashboard</a>{onClose&&<button className="membership-secondary" onClick={onClose}>Orqaga</button>}</section>;
 const mock=new Date(Date.UTC(2026,9,day)).getUTCDay()===0;
 const title=future?'Bu kun hali ochilmagan':membership?.pending?'Admin tasdig‘i kutilmoqda':mock?'Full MOCK uchun ruxsat kerak':'Tayyorgarlikni davom ettiring';
 const body=future?'Topshiriq '+new Date(Date.UTC(2026,9,day)).toLocaleDateString('uz-UZ',{timeZone:'UTC'})+' kuni ochiladi.':membership?.pending?'To‘lov so‘rovingiz saqlangan. Chekni Telegramga yuboring yoki yuborgan bo‘lsangiz, tasdiqni kuting.':mock?'Bu imtihon faqat alohida Full MOCK to‘lovi bilan ochiladi. 7 kunlik Challenge obunasi Mock’ga ruxsat bermaydi.':'Ushbu topshiriq Challenge paketiga kiradi: 15 000 so‘m / 7 kun. Yakshanba ham 7 kunga sanaladi, Full MOCK alohida to‘lanadi.';
 return <section className="membership-lock"><img src="/images/billing/premium-lock.png" alt="" width={170} height={140}/><span className="membership-kicker">DAY {day}</span><h1>{title}</h1><p>{body}</p>{!future&&<a className="membership-primary" href={'/dashboard?view=Billing&plan='+(mock?'mock':'challenge')}>{membership?.pending?'To‘lov holatini ko‘rish':mock?'MOCK paketini tanlash':'Challenge paketini tanlash'}</a>}<a className="membership-secondary" href="/dashboard">Dashboardga qaytish</a>{onClose&&<button className="membership-secondary" onClick={onClose}>Orqaga</button>}<small>Oldingi natijalaringiz va ballaringiz saqlanadi.</small></section>;
}
