'use client';

import { useMemo, useState } from 'react';
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
  daily_task_started_at: string | null;
  daily_task_expires_at: string | null;
  updated_at: string;
};

function formatDate(value?: string | null) {
  if (!value || Number.isNaN(Date.parse(value))) return 'Sana noma’lum';
  return new Intl.DateTimeFormat('uz-UZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function isActive(row: Row) {
  const expires = row.daily_task_expires_at ? Date.parse(row.daily_task_expires_at) : 0;
  return Boolean(row.daily_task_enabled && expires > Date.now());
}

function expiryLabel(row: Row) {
  if (!row.daily_task_expires_at) return `Yangilangan: ${formatDate(row.updated_at)}`;
  const expired = Date.parse(row.daily_task_expires_at) <= Date.now();
  return expired
    ? `EXPIRED · ${formatDate(row.daily_task_expires_at)}`
    : `Tugaydi: ${formatDate(row.daily_task_expires_at)} · 24 soatlik oynada`;
}

export function AdminDailyTasksPanel() {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch('/api/admin/daily-tasks', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Daily Tasks yuklanmadi.');
      setRows(body.tests || []);
      setLoaded(true);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Daily Tasks yuklanmadi.');
    } finally {
      setLoading(false);
    }
  }

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next) await load();
  }

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
      setMessage(enabled
        ? `${row.title}: Daily Task 24 soatga yoqildi.`
        : `${row.title}: Daily Task’dan olindi.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Saqlanmadi.');
    } finally {
      setBusyId('');
    }
  }

  const sortedRows = useMemo(() => [...rows].sort((a, b) => {
    const bTime = Date.parse(b.updated_at || '') || 0;
    const aTime = Date.parse(a.updated_at || '') || 0;
    return bTime - aTime;
  }), [rows]);

  const activeCount = useMemo(() => rows.filter(isActive).length, [rows]);

  return (
    <section className={`${styles.wrap} ${open ? styles.open : ''}`} data-admin-daily-tasks="true">
      <button className={styles.heading} type="button" onClick={() => void toggleOpen()} aria-expanded={open}>
        <span className={styles.icon}><CalendarCheckIcon /></span>
        <span className={styles.headingCopy}>
          <small>GAMIFICATION CONTROL</small>
          <strong>Daily Tasks boshqaruvi</strong>
          <span>Daily Task yoqilgandan boshlab 24 soat faol turadi va keyin avtomatik yo‘qoladi.</span>
        </span>
        <span className={styles.headingMeta}>
          <b>{loaded ? `${activeCount} ACTIVE` : 'DROPDOWN'}</b>
          <i className={open ? styles.chevronOpen : ''} aria-hidden="true" />
        </span>
      </button>

      {open ? (
        <div className={styles.body}>
          {message ? <div className={styles.notice}>{message}</div> : null}
          {loading ? <div className={styles.empty}>Yuklanmoqda…</div> : (
            <div className={styles.list}>
              {sortedRows.map((row) => {
                const active = isActive(row);
                return (
                  <article className={`${styles.row} ${active ? styles.on : ''}`} key={row.id}>
                    <div className={styles.copy}>
                      <small>{row.track.toUpperCase()} · {row.skill.toUpperCase()} · {row.status.toUpperCase()}</small>
                      <strong>{row.title}</strong>
                      <span>{expiryLabel(row)}</span>
                    </div>
                    <label className={styles.points}>
                      <ZapIcon /><span>PTS</span>
                      <input type="number" min="0" max="100" defaultValue={row.daily_task_points || 20} disabled={busyId === row.id} onBlur={(event) => {
                        const value = Math.max(0, Math.min(100, Math.round(Number(event.target.value) || 20)));
                        if (value !== row.daily_task_points) void save(row, active, value);
                      }} />
                    </label>
                    <button className={active ? styles.disable : styles.enable} disabled={busyId === row.id || row.status !== 'published'} onClick={() => void save(row, !active, row.daily_task_points || 20)} type="button">
                      {busyId === row.id ? 'Saqlanmoqda…' : active ? 'Daily Task’dan olish' : '24 soatga Daily Task qilish'}
                    </button>
                  </article>
                );
              })}
              {!sortedRows.length && !loading ? <div className={styles.empty}>Testlar topilmadi.</div> : null}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
