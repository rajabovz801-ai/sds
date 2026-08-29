'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import styles from './AdminSpeakingMockPanel.module.css';

type Recording = {
  id: string;
  student_id: string | null;
  candidate_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  duration_seconds: number | null;
  status: string;
  started_at: string;
  completed_at: string | null;
  created_at: string;
};

type Data = {
  mock: { id: string; title: string; status: 'draft' | 'published'; instruction_video_path: string | null };
  recordings: Recording[];
};

function duration(value: number | null) {
  if (!value) return '—';
  const m = Math.floor(value / 60);
  const s = value % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function date(value: string | null) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('uz-UZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function AdminSpeakingMockPanel() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/cefr-speaking', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Speaking ma’lumotlari yuklanmadi.');
      setData(body);
      setIsError(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Speaking ma’lumotlari yuklanmadi.');
      setIsError(true);
    }
  }, []);

  useEffect(() => { if (open) void load(); }, [open, load]);

  async function uploadVideo() {
    if (!video || busy) return;
    setBusy(true);
    setMessage('Instruction video yuklanmoqda…');
    setIsError(false);
    try {
      const response = await fetch('/api/admin/cefr-speaking/video-upload-url', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: video.name, type: video.type, size: video.size }),
      });
      const signed = await response.json();
      if (!response.ok) throw new Error(signed.error || 'Video upload URL yaratilmadi.');

      const { error } = await supabase.storage.from(signed.bucket).uploadToSignedUrl(
        signed.path,
        signed.token,
        video,
        { contentType: video.type || 'video/mp4' },
      );
      if (error) throw error;

      const saveResponse = await fetch('/api/admin/cefr-speaking', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'setVideo', videoPath: signed.path }),
      });
      const saveBody = await saveResponse.json();
      if (!saveResponse.ok) throw new Error(saveBody.error || 'Video mockka biriktirilmadi.');

      setMessage('Instruction video tayyor. Endi Speaking Mock’ni ochishingiz mumkin.');
      setVideo(null);
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Video yuklanmadi.');
      setIsError(true);
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(action: 'publish' | 'close') {
    if (busy) return;
    setBusy(true);
    setIsError(false);
    try {
      const response = await fetch('/api/admin/cefr-speaking', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Speaking Mock holati o‘zgarmadi.');
      setMessage(action === 'publish' ? 'CEFR Speaking Mock ochildi.' : 'CEFR Speaking Mock yopildi.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Speaking Mock holati o‘zgarmadi.');
      setIsError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className={styles.launcher} type="button" onClick={() => setOpen(true)}>SPEAKING MOCK</button>
      {open && (
        <div className={styles.backdrop} role="dialog" aria-modal="true">
          <aside className={styles.drawer}>
            <header className={styles.head}>
              <div><small>ARK ADMIN · CEFR MODULE</small><h2>Speaking Mock Control</h2><p>Instruction video va o‘quvchilarning bitta to‘liq audio recordinglari.</p></div>
              <button className={styles.close} onClick={() => setOpen(false)}>×</button>
            </header>

            {message && <div className={`${styles.message} ${isError ? styles.error : ''}`}>{message}</div>}

            <section className={styles.mockCard}>
              <div className={styles.mockTop}>
                <div><small>CEFR · SPEAKING</small><h3>{data?.mock.title || 'Speaking Mock Test 1'}</h3></div>
                <span className={`${styles.status} ${data?.mock.status === 'published' ? styles.live : ''}`}>{data?.mock.status || 'loading'}</span>
              </div>
              <div className={styles.setupGrid}>
                <div className={styles.videoBox}>
                  <label>Instruction video</label>
                  <input type="file" accept="video/mp4,.mp4" onChange={(event) => setVideo(event.target.files?.[0] || null)} />
                  <small>{data?.mock.instruction_video_path ? 'Video biriktirilgan ✓' : 'MP4 · max 80 MB'}</small>
                  <button disabled={!video || busy} onClick={() => void uploadVideo()}>{busy ? 'Working…' : 'Upload video'}</button>
                </div>
                <div className={styles.actions}>
                  <b>Dashboard status</b>
                  <p>Published bo‘lsa CEFR Speaking ichida “Start Speaking” kartasi chiqadi.</p>
                  {data?.mock.status === 'published'
                    ? <button className={styles.danger} disabled={busy} onClick={() => void changeStatus('close')}>Close Speaking Mock</button>
                    : <button className={styles.primary} disabled={busy || !data?.mock.instruction_video_path} onClick={() => void changeStatus('publish')}>Open Speaking Mock</button>}
                </div>
              </div>
            </section>

            <section className={styles.results}>
              <div className={styles.resultsHead}><div><small>RECORDINGS</small><h3>Student audio</h3></div><button onClick={() => void load()}>Refresh</button></div>
              {!data?.recordings.length && <div className={styles.empty}>Hali Speaking recording kelmagan.</div>}
              <div className={styles.list}>
                {(data?.recordings || []).map((row) => (
                  <article className={styles.row} key={row.id}>
                    <div className={styles.meta}><strong>{row.candidate_name}</strong><span>{date(row.completed_at || row.created_at)} · {duration(row.duration_seconds)} · {row.status}</span></div>
                    {row.status === 'completed'
                      ? <audio controls preload="none" src={`/api/admin/cefr-speaking/recordings/${row.id}/audio`} />
                      : <span className={styles.pending}>uploading…</span>}
                  </article>
                ))}
              </div>
            </section>
          </aside>
        </div>
      )}
    </>
  );
}
