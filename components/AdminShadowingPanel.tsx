'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase/client';
import { FileTextIcon, HeadphonesIcon, TrashIcon } from '@/components/UiIcons';
import styles from './AdminTypingExercisesPanel.module.css';

type Lesson = {
  id: string;
  sequenceNo: number;
  title: string;
  script: string;
  videoPath: string;
  status: 'draft' | 'published';
  dailyTaskEnabled: boolean;
  dailyTaskPoints: number;
  createdAt: string;
};

type FormState = {
  title: string;
  script: string;
  status: 'draft' | 'published';
};

const initialForm: FormState = { title: '', script: '', status: 'published' };
const MAX_BYTES = 80 * 1024 * 1024;

export function AdminShadowingPanel() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [video, setVideo] = useState<File | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/shadowing', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Shadowing mashqlari yuklanmadi.');
      setLessons(Array.isArray(body.lessons) ? body.lessons : []);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Shadowing mashqlari yuklanmadi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const publishedCount = useMemo(() => lessons.filter((item) => item.status === 'published').length, [lessons]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    setError('');
    const title = form.title.trim();
    const script = form.script.trim();
    if (!title) { setError('Speaker yoki shadowing nomini kiriting.'); return; }
    if (script.length < 10) { setError('Shadowing scriptini kiriting.'); return; }
    if (!video) { setError('MP4 video tanlang.'); return; }
    if (!/\.mp4$/i.test(video.name) || video.size > MAX_BYTES) { setError('Video MP4 va 80 MB dan kichik bo‘lishi kerak.'); return; }

    setBusy(true);
    try {
      setNotice('Video yuklanmoqda…');
      const uploadResponse = await fetch('/api/admin/shadowing/upload-url', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: video.name, type: video.type, size: video.size }),
      });
      const signed = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(signed.error || 'Video upload URL yaratilmadi.');

      const { error: uploadError } = await supabase.storage.from(signed.bucket).uploadToSignedUrl(
        signed.path,
        signed.token,
        video,
        { contentType: video.type || 'video/mp4' },
      );
      if (uploadError) throw uploadError;

      setNotice('Video yuklandi. Shadowing saqlanmoqda…');
      const saveResponse = await fetch('/api/admin/shadowing', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...form, title, script, videoPath: signed.path }),
      });
      const saved = await saveResponse.json();
      if (!saveResponse.ok) throw new Error(saved.error || 'Shadowing saqlanmadi.');

      setNotice(`Shadowing ${saved.lesson.sequenceNo} saqlandi.`);
      setForm(initialForm);
      setVideo(null);
      const input = document.querySelector<HTMLInputElement>('[data-shadowing-video-input="true"]');
      if (input) input.value = '';
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Shadowing saqlanmadi.');
      setNotice('');
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(item: Lesson) {
    setRowBusy(item.id);
    setError('');
    setNotice('');
    try {
      const next = item.status === 'published' ? 'draft' : 'published';
      const response = await fetch('/api/admin/shadowing', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: item.id, status: next }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Shadowing holati o‘zgarmadi.');
      setNotice(`Shadowing ${item.sequenceNo}: ${next}.`);
      await load();
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : 'Shadowing holati o‘zgarmadi.');
    } finally {
      setRowBusy('');
    }
  }

  async function remove(item: Lesson) {
    if (!window.confirm(`“Shadowing ${item.sequenceNo}. ${item.title}” ni o‘chirasizmi?`)) return;
    setRowBusy(item.id);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/shadowing', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Shadowing o‘chirilmadi.');
      setNotice(`Shadowing ${item.sequenceNo} o‘chirildi.`);
      await load();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Shadowing o‘chirilmadi.');
    } finally {
      setRowBusy('');
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerIcon}><HeadphonesIcon /></div>
        <div className={styles.headerCopy}>
          <small>SHADOWING PRACTICE</small>
          <h2>Shadowing boshqaruvi</h2>
          <p>MP4 video va uning scriptini shu yerda yuklang. Tartib avtomatik Shadowing 1, 2, 3… bo‘lib ketadi.</p>
        </div>
        <div className={styles.stats}><strong>{lessons.length}</strong><span>lesson</span><i /><strong>{publishedCount}</strong><span>active</span></div>
      </div>

      {(notice || error) && <div className={error ? styles.error : styles.notice}>{error || notice}</div>}

      <form className={styles.form} onSubmit={submit}>
        <div className={styles.gridTwo}>
          <label><span>Video nomi / speaker</span><input value={form.title} maxLength={120} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} placeholder="Masalan: Jenna Ortega" /></label>
          <label><span>MP4 video</span><input data-shadowing-video-input="true" type="file" accept="video/mp4,.mp4" onChange={(event) => setVideo(event.target.files?.[0] || null)} /></label>
        </div>
        <label><span>Shadowing script <b>{form.script.trim() ? form.script.trim().split(/\s+/).length : 0} words</b></span><textarea className={styles.content} value={form.script} maxLength={30000} onChange={(event) => setForm((value) => ({ ...value, script: event.target.value }))} placeholder="Videodagi to‘liq transcript/scriptni kiriting..." /></label>
        <div className={styles.formFooter}>
          <label className={styles.status}><span>Holati</span><select value={form.status} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value as 'draft' | 'published' }))}><option value="published">Published</option><option value="draft">Draft</option></select></label>
          <button type="submit" disabled={busy}>{busy ? 'Yuklanmoqda…' : 'Shadowing qo‘shish'}</button>
        </div>
      </form>

      <div className={styles.libraryHead}><div><small>SHADOWING LIBRARY</small><h3>Shadowing videolari</h3></div><span>Published videolar student sahifasida ko‘rinadi.</span></div>
      {loading ? <div className={styles.empty}>Shadowing mashqlari yuklanmoqda…</div> : lessons.length ? (
        <div className={styles.list}>{lessons.map((item) => (
          <article key={item.id} className={styles.row}>
            <span className={styles.rowIcon}><FileTextIcon /></span>
            <div className={styles.rowCopy}><small>SHADOWING {item.sequenceNo} · {item.script.trim().split(/\s+/).length} WORDS</small><strong>{item.title}</strong><p>{item.dailyTaskEnabled ? `Daily Task · ${item.dailyTaskPoints} PTS` : 'Video + script tayyor'}</p></div>
            <button type="button" className={item.status === 'published' ? styles.published : styles.draft} disabled={rowBusy === item.id} onClick={() => void changeStatus(item)}>{item.status}</button>
            <button type="button" className={styles.delete} disabled={rowBusy === item.id} onClick={() => void remove(item)} aria-label={`Shadowing ${item.sequenceNo} ni o‘chirish`}><TrashIcon /></button>
          </article>
        ))}</div>
      ) : <div className={styles.empty}>Hali shadowing video qo‘shilmagan.</div>}
    </section>
  );
}
