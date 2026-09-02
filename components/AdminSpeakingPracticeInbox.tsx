'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './AdminSpeakingPracticeInbox.module.css';

type Recording = {
  id: string;
  student_id: string;
  student_name: string;
  day: number;
  day_title: string;
  topic_id: string;
  topic_title: string;
  question_index: number;
  question_text: string;
  duration_seconds: number | null;
  size_bytes: number;
  telegram_sent: boolean;
  telegram_error: string | null;
  created_at: string;
};

function durationText(seconds: number | null) {
  const value = Math.max(0, Math.round(Number(seconds) || 0));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

function timeText(value: string) {
  try {
    return new Intl.DateTimeFormat('uz-UZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
  } catch {
    return value;
  }
}

export function AdminSpeakingPracticeInbox() {
  const [items, setItems] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/speaking-practice', { cache: 'no-store', credentials: 'same-origin' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Speaking inbox yuklanmadi.');
      setItems(Array.isArray(data?.recordings) ? data.recordings : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speaking inbox server xatosi.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  const normalized = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!normalized) return items;
    return items.filter((item) => [item.student_name, item.day_title, item.topic_title, item.question_text]
      .some((value) => String(value || '').toLowerCase().includes(normalized)));
  }, [items, normalized]);

  const today = new Date().toDateString();
  const metrics = useMemo(() => ({
    total: items.length,
    delivered: items.filter((item) => item.telegram_sent).length,
    failed: items.filter((item) => !item.telegram_sent).length,
    today: items.filter((item) => new Date(item.created_at).toDateString() === today).length,
  }), [items, today]);

  return (
    <section className={styles.root}>
      <header className={styles.head}>
        <div>
          <small>SPEAKING PRACTICE · INBOX</small>
          <h3>Student recordinglari</h3>
          <p>Practice’dagi MP3 javoblar serverda saqlanadi. Telegram delivery holati ham shu yerda ko‘rinadi.</p>
        </div>
        <button className={styles.refresh} type="button" onClick={() => void load()} disabled={loading}>{loading ? 'Yangilanmoqda…' : 'Yangilash'}</button>
      </header>

      <div className={styles.metrics}>
        <article><span>Jami</span><strong>{metrics.total}</strong></article>
        <article><span>Telegram OK</span><strong>{metrics.delivered}</strong></article>
        <article><span>Delivery issue</span><strong>{metrics.failed}</strong></article>
        <article><span>Bugun</span><strong>{metrics.today}</strong></article>
      </div>

      <input
        className={styles.filter}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Student, topic yoki savol bo‘yicha qidirish…"
        aria-label="Speaking recording qidirish"
      />

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.list}>
        {!loading && filtered.length === 0 && <div className={styles.empty}>Hozircha Speaking Practice recording topilmadi.</div>}
        {filtered.map((item) => (
          <article className={styles.card} key={item.id}>
            <div className={styles.meta}>
              <div className={styles.top}>
                <strong className={styles.student}>{item.student_name}</strong>
                <span className={`${styles.status} ${item.telegram_sent ? '' : styles.failed}`}>
                  {item.telegram_sent ? 'TELEGRAM ✓' : 'SAVED · RETRY NEEDED'}
                </span>
              </div>
              <div className={styles.context}>Day {String(item.day).padStart(2, '0')} · {item.day_title} · {item.topic_title}</div>
              <p className={styles.question}>Q{item.question_index + 1}. {item.question_text}</p>
              <div className={styles.foot}>
                <span>{durationText(item.duration_seconds)}</span>
                <span>{Math.max(1, Math.round((item.size_bytes || 0) / 1024))} KB</span>
                <span>{timeText(item.created_at)}</span>
                {!item.telegram_sent && item.telegram_error && <span>{item.telegram_error}</span>}
              </div>
            </div>
            <div className={styles.audio}>
              <audio controls preload="none" src={`/api/admin/speaking-practice/${item.id}/audio`} />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
