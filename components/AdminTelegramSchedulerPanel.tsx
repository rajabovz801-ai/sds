'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './AdminTelegramSchedulerPanel.module.css';

type Group = { id:string; chat_id:number; title:string|null; enabled:boolean };
type Schedule = { id:string; title:string; message_text:string; send_time:string; weekdays:number[]|null; run_date:string|null; reminder_after_minutes:number[]; enabled:boolean; teddy_bot_schedule_targets?: { target_id:string }[] };
const DAYS = [['Du',1],['Se',2],['Cho',3],['Pa',4],['Ju',5],['Sha',6],['Ya',7]] as const;

export function AdminTelegramSchedulerPanel() {
  const [open,setOpen]=useState(false); const [groups,setGroups]=useState<Group[]>([]); const [schedules,setSchedules]=useState<Schedule[]>([]); const [selected,setSelected]=useState<string[]>([]);
  const [title,setTitle]=useState(''); const [message,setMessage]=useState(''); const [time,setTime]=useState('19:00'); const [days,setDays]=useState<number[]>([1,2,3,4,5,6,7]); const [reminders,setReminders]=useState('120,360'); const [notice,setNotice]=useState(''); const [busy,setBusy]=useState(false);
  const activeGroups=useMemo(()=>groups.filter(g=>g.enabled),[groups]);
  async function load(){ setBusy(true); try{ const r=await fetch('/api/admin/telegram-scheduler',{cache:'no-store'}); const b=await r.json(); if(!r.ok) throw new Error(b.error||'Yuklanmadi'); setGroups(b.groups||[]); setSchedules(b.schedules||[]); if(!selected.length) setSelected((b.groups||[]).filter((g:Group)=>g.enabled).map((g:Group)=>g.id)); }catch(e){setNotice(e instanceof Error?e.message:'Xato');}finally{setBusy(false);} }
  useEffect(()=>{ if(open) void load(); },[open]);
  function toggleGroup(id:string){ setSelected(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]); }
  async function save(){ setBusy(true); try{ const r=await fetch('/api/admin/telegram-scheduler',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'save_schedule',target_ids:selected,schedule:{title,message_text:message,send_time:time,weekdays:days,reminder_after_minutes:reminders.split(',').map(x=>Number(x.trim())).filter(n=>n>0)}})}); const b=await r.json(); if(!r.ok) throw new Error(b.error||'Saqlanmadi'); setNotice('✅ Vazifa schedule saqlandi.'); setTitle(''); setMessage(''); await load(); }catch(e){setNotice(e instanceof Error?e.message:'Xato');}finally{setBusy(false);} }
  async function sendNow(){ setBusy(true); try{ const r=await fetch('/api/admin/telegram-scheduler',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'send_now',target_ids:selected,message_text:message})}); const b=await r.json(); if(!r.ok) throw new Error(b.error||'Yuborilmadi'); setNotice(`📤 ${b.queued||0} ta guruhga yuborish navbatiga qo‘shildi.`); }catch(e){setNotice(e instanceof Error?e.message:'Xato');}finally{setBusy(false);} }
  async function toggleSchedule(s:Schedule){ await fetch('/api/admin/telegram-scheduler',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({action:'schedule_enabled',id:s.id,enabled:!s.enabled})}); await load(); }
  async function removeSchedule(id:string){ if(!confirm('Bu schedule o‘chirilsinmi?')) return; await fetch(`/api/admin/telegram-scheduler?id=${encodeURIComponent(id)}`,{method:'DELETE'}); await load(); }
  return <section className={styles.wrap}>
    <button className={styles.head} onClick={()=>setOpen(v=>!v)} type="button"><span>🤖</span><div><small>TEDDY TUTOR CONTROL</small><strong>Telegram Groups & Scheduler</strong><p>Guruhlar, vazifalar, vaqt va reminderlar.</p></div><b>{open?'YOPISH':'OCHISH'}</b></button>
    {open && <div className={styles.body}>
      {notice && <div className={styles.notice}>{notice}</div>}
      <div className={styles.grid}>
        <div className={styles.card}><h3>📚 Guruhlar</h3><p>Bot yozgan guruhlar avtomatik shu yerga tushadi.</p><div className={styles.groups}>{activeGroups.map(g=><label key={g.id}><input type="checkbox" checked={selected.includes(g.id)} onChange={()=>toggleGroup(g.id)}/><span>{g.title||g.chat_id}</span></label>)}{!activeGroups.length&&<em>Guruh topilmadi. Guruhda bitta oddiy xabar yozing.</em>}</div></div>
        <div className={styles.card}><h3>📝 Yangi vazifa</h3><input className={styles.input} placeholder="Vazifa nomi" value={title} onChange={e=>setTitle(e.target.value)}/><textarea className={styles.textarea} placeholder="Guruhga yuboriladigan xabar..." value={message} onChange={e=>setMessage(e.target.value)}/><div className={styles.row}><label>Vaqt<input type="time" value={time} onChange={e=>setTime(e.target.value)}/></label><label>Reminder (min)<input value={reminders} onChange={e=>setReminders(e.target.value)} placeholder="120,360"/></label></div><div className={styles.days}>{DAYS.map(([n,v])=><button key={v} className={days.includes(v)?styles.dayOn:''} onClick={()=>setDays(d=>d.includes(v)?d.filter(x=>x!==v):[...d,v])} type="button">{n}</button>)}</div><div className={styles.actions}><button disabled={busy} onClick={()=>void save()} type="button">⏰ Schedule saqlash</button><button disabled={busy||!message.trim()} onClick={()=>void sendNow()} type="button">📤 Hozir yuborish</button></div></div>
      </div>
      <div className={styles.card}><h3>⏱ Faol schedulelar</h3>{schedules.map(s=><div className={styles.schedule} key={s.id}><div><strong>{s.title}</strong><span>{String(s.send_time).slice(0,5)} · {s.enabled?'ACTIVE':'PAUSED'} · reminder: {(s.reminder_after_minutes||[]).join(', ')||'yo‘q'}</span></div><div><button onClick={()=>void toggleSchedule(s)} type="button">{s.enabled?'Pause':'Resume'}</button><button onClick={()=>void removeSchedule(s.id)} type="button">Delete</button></div></div>)}{!schedules.length&&<em>Hali schedule yo‘q.</em>}</div>
    </div>}
  </section>;
}
