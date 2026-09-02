'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './AdminSystemHealthPanel.module.css';

type HealthPayload = {
  ok: boolean;
  checkedAt: string;
  metrics: {
    staleSessions: number;
    liveSessions: number;
    speakingFailed24h: number;
    speakingPending24h: number;
    botFailed24h: number;
  };
  recentSpeakingErrors: Array<{
    id: string;
    student_name: string;
    topic_title: string;
    question_index: number;
    telegram_error: string | null;
    created_at: string;
  }>;
};

export function AdminSystemHealthPanel() {
  const [data, setData] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/system-health', { cache: 'no-store', credentials: 'same-origin' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body?.ok) throw new Error(body?.error || 'System health olinmadi.');
      setData(body as HealthPayload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'System health olinmadi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const issueCount = useMemo(() => {
    if (!data) return 0;
    return data.metrics.staleSessions + data.metrics.speakingFailed24h + data.metrics.botFailed24h;
  }, [data]);

  return (
    <section className={styles.root}>
      <header className={styles.head}>
        <div>
          <small>READ-ONLY MONITORING</small>
          <h3>System Health</h3>
          <p>Test sessionlar, Speaking delivery va bot xatolarini bir joyda kuzatadi. Bu panel hech narsani o‘zgartirmaydi.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading}>{loading ? 'Tekshirilmoqda…' : 'Yangilash'}</button>
      </header>

      {error && <div className={styles.error}>{error}</div>}

      {data && (
        <>
          <div className={`${styles.status} ${issueCount === 0 ? styles.healthy : styles.attention}`}>
            <strong>{issueCount === 0 ? 'System normal' : `${issueCount} ta e’tibor talab qiladigan holat`}</strong>
            <span>Oxirgi tekshiruv: {new Intl.DateTimeFormat('uz-UZ', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }).format(new Date(data.checkedAt))}</span>
          </div>

          <div className={styles.metrics}>
            <article><span>Live sessions</span><strong>{data.metrics.liveSessions}</strong><small>hozir faol</small></article>
            <article className={data.metrics.staleSessions ? styles.warn : ''}><span>Stale sessions</span><strong>{data.metrics.staleSessions}</strong><small>vaqti o‘tgan</small></article>
            <article className={data.metrics.speakingFailed24h ? styles.warn : ''}><span>Speaking failed</span><strong>{data.metrics.speakingFailed24h}</strong><small>oxirgi 24 soat</small></article>
            <article className={data.metrics.botFailed24h ? styles.warn : ''}><span>Bot failed</span><strong>{data.metrics.botFailed24h}</strong><small>oxirgi 24 soat</small></article>
          </div>

          <div className={styles.sectionHead}>
            <div><small>RECENT DELIVERY ERRORS</small><h4>Speaking xatolari</h4></div>
            <span>{data.metrics.speakingPending24h} pending</span>
          </div>

          {data.recentSpeakingErrors.length ? (
            <div className={styles.list}>
              {data.recentSpeakingErrors.map((item) => (
                <article key={item.id}>
                  <div><strong>{item.student_name}</strong><span>{item.topic_title} · Q{item.question_index + 1}</span></div>
                  <p>{item.telegram_error || 'unknown_error'}</p>
                  <time>{new Intl.DateTimeFormat('uz-UZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(item.created_at))}</time>
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.empty}>Oxirgi 24 soatda Speaking delivery xatosi yo‘q.</div>
          )}
        </>
      )}
    </section>
  );
}
