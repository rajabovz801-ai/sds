'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarCheckIcon, ZapIcon } from '@/components/UiIcons';
import styles from './AdminDailyTasksPanel.module.css';

type Row = {
  id: string;
  title: string;
  track: string;
  skill: string;
  status: string;
  daily_task_enabled: boolean;
  daily_task_points: number;
};

export function AdminDailyTasksPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/daily-tasks', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Daily Tasks yuklanmadi.');
      setRows(body.tests || []);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Daily Tasks yuklanmadi.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function save(row: Row, enabled: boolean, points: number) {
    setBusyId(row.id);
    try {
      const response = await fetch('/api/admin/daily-tasks', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: row.id, enabled, points }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Saqlanmadi.');
      setRows((current) => current.map((item) => item.id === row.id ? body.test : item));
      setMessage(`${row.title}: Daily Task sozlamasi saqlandi.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Saqlanmadi.');
    } finally {
      setBusyId('');
    }
  }

  const activeCount = useMemo(() => rows.filter((row) => row.daily_task_enabled).length, [rows]);

  return (
    <section className={styles.wrap}>
      <div className={styles.heading}>
        <div className={styles.icon}><CalendarCheckIcon /></div>
        <div><small>GAMIFICATION CONTROL</small><h2>Daily Tasks boshqaruvi</h2><p>Qaysi test Daily Tasks’da chiqishi va nechta bazaviy PTS berishini shu yerdan boshqaring.</p></div>
        <strong>{activeCount} ACTIVE</strong>
      </div>
      {message ? <div className={styles.notice}>{message}</div> : null}
      {loading ? <div className={styles.empty}>Yuklanmoqda…</div> : (
        <div className={styles.list}>
          {rows.map((row) => (
            <article className={`${styles.row} ${row.daily_task_enabled ? styles.on : ''}`} key={row.id}>
              <div className={styles.copy}><small>{row.track.toUpperCase()} · {row.skill.toUpperCase()} · {row.status.toUpperCase()}</small><strong>{row.title}</strong></div>
              <label className={styles.points}><ZapIcon /><span>PTS</span><input type="number" min="0" max="100" defaultValue={row.daily_task_points || 20} disabled={busyId === row.id} onBlur={(event) => { const value = Math.max(0, Math.min(100, Math.round(Number(event.target.value) || 20))); if (value !== row.daily_task_points) void save(row, row.daily_task_enabled, value); }} /></label>
              <button className={row.daily_task_enabled ? styles.disable : styles.enable} disabled={busyId === row.id || row.status !== 'published'} onClick={() => void save(row, !row.daily_task_enabled, row.daily_task_points || 20)} type="button">
                {busyId === row.id ? 'Saqlanmoqda…' : row.daily_task_enabled ? 'Daily Task’dan olish' : 'Daily Task qilish'}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
