'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './AdminTelegramSchedulerPanel.module.css';

type Target = {
  id: string;
  chat_id: number;
  chat_type?: 'private' | 'group' | 'supergroup' | 'channel' | string;
  title: string | null;
  username?: string | null;
  enabled: boolean;
};
type Schedule = { id:string; title:string; message_text:string; send_time:string; weekdays:number[]|null; run_date:string|null; reminder_after_minutes:number[]; enabled:boolean; teddy_bot_schedule_targets?: { target_id:string }[] };
type Filter = 'all' | 'users' | 'groups' | 'channels';
const DAYS = [['Du',1],['Se',2],['Cho',3],['Pa',4],['Ju',5],['Sha',6],['Ya',7]] as const;

function targetKind(target: Target): Filter {
  if (target.chat_type === 'private') return 'users';
  if (target.chat_type === 'channel') return 'channels';
  return 'groups';
}

function targetIcon(target: Target) {
  if (target.chat_type === 'private') return '👤';
  if (target.chat_type === 'channel') return '📢';
  return '👥';
}

function targetName(target: Target) {
  const username = target.username ? `@${target.username}` : '';
  return target.title || username || String(target.chat_id);
}

export function AdminTelegramSchedulerPanel() {
  const [open,setOpen]=useState(false); const [targets,setTargets]=useState<Target[]>([]); const [schedules,setSchedules]=useState<Schedule[]>([]); const [selected,setSelected]=useState<string[]>([]); const [filter,setFilter]=useState<Filter>('all');
  const [title,setTitle]=useState(''); const [message,setMessage]=useState(''); const [time,setTime]=useState('19:00'); const [days,setDays]=useState<number[]>([1,2,3,4,5,6,7]); const [reminders,setReminders]=useState('120,360'); const [notice,setNotice]=useState(''); const [busy,setBusy]=useState(false);
  const activeTargets=useMemo(()=>targets.filter(t=>t.enabled),[targets]);
  const counts=useMemo(()=>({
    all: activeTargets.length,
    users: activeTargets.filter(t=>targetKind(t)==='users').length,
    groups: activeTargets.filter(t=>targetKind(t)==='groups').length,
    channels: activeTargets.filter(t=>targetKind(t)==='channels').length,
  }),[activeTargets]);
  const visibleTargets=useMemo(()=>filter==='all'?activeTargets:activeTargets.filter(t=>targetKind(t)===filter),[activeTargets,filter]);

  async function load(){ setBusy(true); try{ const r=await fetch('/api/admin/telegram-scheduler',{cache:'no-store'}); const b=await r.json(); if(!r.ok) throw new Error(b.error||'Yuklanmadi'); const nextTargets:Target[]=b.groups||[]; setTargets(nextTargets); setSchedules(b.schedules||[]); if(!selected.length) setSelected(nextTargets.filter(t=>t.enabled && t.chat_type!=='private').map(t=>t.id)); }catch(e){setNotice(e instanceof Error?e.message:'Xato');}finally{setBusy(false);} }
  useEffect(()=>{ if(open) void load(); },[open]);
  function toggleTarget(id:string){ setSelected(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]); }
  function selectVisible(){ setSelected(v=>Array.from(new Set([...v,...visibleTargets.map(t=>t.id)]))); }
  function clearVisible(){ const visible=new Set(visibleTargets.map(t=>t.id)); setSelected(v=>v.filter(id=>!visible.has(id))); }
  async function save(){ setBusy(true); try{ const r=await fetch('/api/admin/telegram-scheduler',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'save_schedule',target_ids:selected,schedule:{title,message_text:message,send_time:time,weekdays:days,reminder_after_minutes:reminders.split(',').map(x=>Number(x.trim())).filter(n=>n>0)}})}); const b=await r.json(); if(!r.ok) throw new Error(b.error||'Saqlanmadi'); setNotice(`✅ Schedule ${selected.length} ta qabul qiluvchi uchun saqlandi.`); setTitle(''); setMessage(''); await load(); }catch(e){setNotice(e instanceof Error?e.message:'Xato');}finally{setBusy(false);} }
  async function sendNow(){ setBusy(true); try{ const r=await fetch('/api/admin/telegram-scheduler',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'send_now',target_ids:selected,message_text:message})}); const b=await r.json(); if(!r.ok) throw new Error(b.error||'Yuborilmadi'); setNotice(`📤 ${b.queued||0} ta qabul qiluvchiga yuborish navbatiga qo‘shildi.`); }catch(e){setNotice(e instanceof Error?e.message:'Xato');}finally{setBusy(false);} }
  async function toggleSchedule(s:Schedule){ await fetch('/api/admin/telegram-scheduler',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({action:'schedule_enabled',id:s.id,enabled:!s.enabled})}); await load(); }
  async function removeSchedule(id:string){ if(!confirm('Bu schedule o‘chirilsinmi?')) return; await fetch(`/api/admin/telegram-scheduler?id=${encodeURIComponent(id)}`,{method:'DELETE'}); await load(); }
  return <section className={styles.wrap}>
    <button className={styles.head} onClick={()=>setOpen(v=>!v)} type="button"><span>🤖</span><div><small>TEDDY TUTOR CONTROL</small><strong>Telegram Xabarlar & Scheduler</strong><p>Foydalanuvchilar, guruhlar, kanallar, broadcast va rejalashtirilgan xabarlar.</p></div><b>{open?'YOPISH':'OCHISH'}</b></button>
    {open && <div className={styles.body}>
      {notice && <div className={styles.notice}>{notice}</div>}
      <div className={styles.grid}>
        <div className={styles.card}><h3>📨 Qabul qiluvchilar</h3><p>Bot bilan bog‘langan foydalanuvchi, guruh va kanallar shu yerda chiqadi.</p>
          <div className={styles.days}>
            <button className={filter==='all'?styles.dayOn:''} onClick={()=>setFilter('all')} type="button">Hammasi ({counts.all})</button>
            <button className={filter==='users'?styles.dayOn:''} onClick={()=>setFilter('users')} type="button">👤 User ({counts.users})</button>
            <button className={filter==='groups'?styles.dayOn:''} onClick={()=>setFilter('groups')} type="button">👥 Guruh ({counts.groups})</button>
            <button className={filter==='channels'?styles.dayOn:''} onClick={()=>setFilter('channels')} type="button">📢 Kanal ({counts.channels})</button>
          </div>
          <div className={styles.actions}><button disabled={!visibleTargets.length} onClick={selectVisible} type="button">✅ Ko‘ringanlarni tanlash</button><button disabled={!visibleTargets.length} onClick={clearVisible} type="button">Tozalash</button></div>
          <div className={styles.groups}>{visibleTargets.map(t=><label key={t.id}><input type="checkbox" checked={selected.includes(t.id)} onChange={()=>toggleTarget(t.id)}/><span>{targetIcon(t)} {targetName(t)}{t.username && t.title ? ` · @${t.username}` : ''}</span></label>)}{!visibleTargets.length&&<em>Bu bo‘limda hozircha qabul qiluvchi yo‘q.</em>}</div>
          <p>Tanlangan: <strong>{selected.length}</strong> ta</p>
        </div>
        <div className={styles.card}><h3>📝 Xabar / yangi vazifa</h3><input className={styles.input} placeholder="Vazifa yoki schedule nomi" value={title} onChange={e=>setTitle(e.target.value)}/><textarea className={styles.textarea} placeholder="Yuboriladigan xabar..." value={message} onChange={e=>setMessage(e.target.value)}/><div className={styles.row}><label>Vaqt<input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label><label>Reminder (min)<input value={reminders} onChange={e=>setReminders(e.target.value)} placeholder="120,360"/></label></div><div className={styles.days}>{DAYS.map(([n,v])=><button key={v} className={days.includes(v)?styles.dayOn:''} onClick={()=>setDays(d=>d.includes(v)?d.filter(x=>x!==v):[...d,v])} type="button">{n}</button>)}</div><div className={styles.actions}><button disabled={busy||!selected.length||!title.trim()||!message.trim()} onClick={()=>void save()} type="button">⏰ Schedule saqlash</button><button disabled={busy||!selected.length||!message.trim()} onClick={()=>void sendNow()} type="button">📤 Hozir yuborish</button></div></div>
      </div>
      <div className={styles.card}><h3>⏱ Faol schedulelar</h3>{schedules.map(s=><div className={styles.schedule} key={s.id}><div><strong>{s.title}</strong><span>{String(s.send_time).slice(0,5)} · {s.enabled?'ACTIVE':'PAUSED'} · reminder: {(s.reminder_after_minutes||[]).join(', ')||'yo‘q'}</span></div><div><button onClick={()=>void toggleSchedule(s)} type="button">{s.enabled?'Pause':'Resume'}</button><button onClick={()=>void removeSchedule(s.id)} type="button">Delete</button></div></div>)}{!schedules.length&&<em>Hali schedule yo‘q.</em>}</div>
    </div>}
  </section>;
}
