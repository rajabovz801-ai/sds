'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { FileTextIcon, PenToolIcon, TrashIcon } from '@/components/UiIcons';
import styles from './AdminTypingExercisesPanel.module.css';

type ExerciseRow = {
  id: string;
  slug: string;
  title: string;
  promptTitle: string;
  prompt: string;
  content: string;
  status: 'draft' | 'published';
  wordCount: number;
  createdAt: string;
};

type FormState = {
  title: string;
  promptTitle: string;
  prompt: string;
  content: string;
  status: 'draft' | 'published';
};

const initialForm: FormState = {
  title: '',
  promptTitle: 'Writing Task 2',
  prompt: '',
  content: '',
  status: 'published',
};

function countWords(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

export function AdminTypingExercisesPanel() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/typing-exercises', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Typing mashqlari yuklanmadi.');
      setExercises(Array.isArray(body.exercises) ? body.exercises : []);
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Typing mashqlari yuklanmadi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const wordCount = useMemo(() => countWords(form.content), [form.content]);
  const publishedCount = useMemo(() => exercises.filter((item) => item.status === 'published').length, [exercises]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    setError('');
    if (!form.title.trim()) { setError('Exercise nomini kiriting.'); return; }
    if (!form.prompt.trim()) { setError('Topshiriq savolini kiriting.'); return; }
    if (wordCount < 20) { setError('Typing matni kamida 20 ta so‘z bo‘lishi kerak.'); return; }

    setBusy(true);
    try {
      const response = await fetch('/api/admin/typing-exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Typing exercise saqlanmadi.');
      setNotice(`${form.title.trim()} saqlandi · ${wordCount} ta so‘z.`);
      setForm(initialForm);
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Typing exercise saqlanmadi.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: ExerciseRow) {
    if (!window.confirm(`“${item.title}” typing exercise’ni o‘chirasizmi?`)) return;
    setNotice('');
    setError('');
    setRowBusy(item.id);
    try {
      const response = await fetch('/api/admin/typing-exercises', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Exercise o‘chirilmadi.');
      setNotice(`${item.title} o‘chirildi.`);
      await load();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Exercise o‘chirilmadi.');
    } finally {
      setRowBusy('');
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerIcon}><PenToolIcon /></div>
        <div className={styles.headerCopy}>
          <small>TYPING PRACTICE</small>
          <h2>Typing exercise boshqaruvi</h2>
          <p>Studentlar yozadigan original matn va topshiriqni shu yerda kiriting. Published exercise Typing bo‘limida avtomatik ko‘rinadi.</p>
        </div>
        <div className={styles.stats}><strong>{exercises.length}</strong><span>exercise</span><i /><strong>{publishedCount}</strong><span>active</span></div>
      </div>

      {(notice || error) && <div className={error ? styles.error : styles.notice}>{error || notice}</div>}

      <form className={styles.form} onSubmit={submit}>
        <div className={styles.gridTwo}>
          <label><span>Exercise nomi</span><input value={form.title} maxLength={120} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} placeholder="Masalan: Typing Exercise 2" /></label>
          <label><span>Prompt turi</span><input value={form.promptTitle} maxLength={80} onChange={(event) => setForm((value) => ({ ...value, promptTitle: event.target.value }))} placeholder="Writing Task 2" /></label>
        </div>
        <label><span>Topshiriq / savol</span><textarea className={styles.prompt} value={form.prompt} maxLength={2000} onChange={(event) => setForm((value) => ({ ...value, prompt: event.target.value }))} placeholder="Agree / disagree savolini kiriting..." /></label>
        <label><span>Typing matni <b>{wordCount} words</b></span><textarea className={styles.content} value={form.content} maxLength={20000} onChange={(event) => setForm((value) => ({ ...value, content: event.target.value }))} placeholder="Student aynan ko‘chirib yozadigan sample essay..." /></label>
        <div className={styles.formFooter}>
          <label className={styles.status}><span>Holati</span><select value={form.status} onChange={(event) => setForm((value) => ({ ...value, status: event.target.value as 'draft' | 'published' }))}><option value="published">Published</option><option value="draft">Draft</option></select></label>
          <button type="submit" disabled={busy}>{busy ? 'Saqlanmoqda…' : 'Exercise qo‘shish'}</button>
        </div>
      </form>

      <div className={styles.libraryHead}><div><small>EXERCISE LIBRARY</small><h3>Typing mashqlari</h3></div><span>Student sahifasi shu ro‘yxatdan ishlaydi.</span></div>
      {loading ? <div className={styles.empty}>Typing mashqlari yuklanmoqda…</div> : exercises.length ? (
        <div className={styles.list}>{exercises.map((item) => (
          <article key={item.id} className={styles.row}>
            <span className={styles.rowIcon}><FileTextIcon /></span>
            <div className={styles.rowCopy}><small>{item.promptTitle} · {item.wordCount} WORDS</small><strong>{item.title}</strong><p>{item.prompt}</p></div>
            <span className={item.status === 'published' ? styles.published : styles.draft}>{item.status}</span>
            <button type="button" className={styles.delete} disabled={rowBusy === item.id} onClick={() => void remove(item)} aria-label={`${item.title} ni o‘chirish`}><TrashIcon /></button>
          </article>
        ))}</div>
      ) : <div className={styles.empty}>Hali typing exercise qo‘shilmagan.</div>}
    </section>
  );
}
