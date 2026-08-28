'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  BookOpenIcon,
  CheckCircleIcon,
  ClockIcon,
  FileTextIcon,
  TrashIcon,
  UploadCloudIcon,
  ZapIcon,
} from '@/components/UiIcons';
import styles from './AdminVocabularyQuizPanel.module.css';

type QuizRow = {
  id: string;
  title: string;
  description?: string | null;
  track: 'ielts' | 'cefr';
  skill: string;
  status: 'draft' | 'published';
  duration_minutes?: number | null;
  file_name?: string | null;
  daily_task_enabled?: boolean | null;
  daily_task_points?: number | null;
  daily_task_expires_at?: string | null;
  updated_at?: string | null;
};

type UploadForm = {
  title: string;
  description: string;
  track: 'ielts' | 'cefr';
  status: 'published' | 'draft';
  durationMinutes: number;
  points: number;
  dailyTask: boolean;
};

const initialForm: UploadForm = {
  title: '',
  description: '',
  track: 'ielts',
  status: 'published',
  durationMinutes: 10,
  points: 20,
  dailyTask: false,
};

function clampPoints(value: number) {
  if (!Number.isFinite(value)) return 20;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function formatExpiry(value?: string | null) {
  if (!value || Number.isNaN(Date.parse(value))) return '';
  return new Intl.DateTimeFormat('uz-UZ', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function AdminVocabularyQuizPanel() {
  const [form, setForm] = useState<UploadForm>(initialForm);
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [pointsDraft, setPointsDraft] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [rowBusy, setRowBusy] = useState<string>('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/tests', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Vocabulary quizlar yuklanmadi.');
      const rows = (Array.isArray(body.tests) ? body.tests : [])
        .filter((item: QuizRow) => item.skill === 'vocabulary') as QuizRow[];
      setQuizzes(rows);
      setPointsDraft(Object.fromEntries(rows.map((item) => [item.id, clampPoints(Number(item.daily_task_points ?? 20))])));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Vocabulary quizlar yuklanmadi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const publishedCount = useMemo(() => quizzes.filter((quiz) => quiz.status === 'published').length, [quizzes]);

  async function patchDaily(id: string, enabled: boolean, points: number) {
    const response = await fetch('/api/admin/daily-tasks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, enabled, points: clampPoints(points) }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'PTS / Daily Task saqlanmadi.');
    return body.test as QuizRow;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    setError('');

    if (!file) {
      setError('Vocabulary quiz HTML faylini tanlang.');
      return;
    }
    if (!form.title.trim()) {
      setError('Passage nomini kiriting.');
      return;
    }
    if (form.dailyTask && form.status !== 'published') {
      setError('Daily Taskga chiqarish uchun quiz Published bo‘lishi kerak.');
      return;
    }

    setBusy(true);
    try {
      const data = new FormData();
      data.append('title', form.title.trim());
      data.append('description', form.description.trim() || 'Passage vocabulary quiz');
      data.append('track', form.track);
      data.append('skill', 'vocabulary');
      data.append('status', form.status);
      data.append('durationMinutes', String(Math.max(5, Math.min(240, Math.round(form.durationMinutes || 10)))));
      data.append('file', file);

      const response = await fetch('/api/admin/tests', { method: 'POST', body: data });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Vocabulary quiz yuklanmadi.');

      const created = body.test as QuizRow;
      await patchDaily(created.id, form.dailyTask, form.points);

      setNotice(form.dailyTask
        ? `${form.title.trim()} yuklandi va ${clampPoints(form.points)} PTS bilan Daily Taskga chiqarildi.`
        : `${form.title.trim()} vocabulary quiz sifatida yuklandi.`);
      setForm(initialForm);
      setFile(null);
      setFileKey((value) => value + 1);
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Vocabulary quiz yuklanmadi.');
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function savePoints(quiz: QuizRow) {
    setNotice('');
    setError('');
    setRowBusy(quiz.id);
    try {
      const points = clampPoints(pointsDraft[quiz.id] ?? Number(quiz.daily_task_points ?? 20));
      await patchDaily(quiz.id, Boolean(quiz.daily_task_enabled), points);
      setNotice(`${quiz.title}: ${points} PTS saqlandi.`);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'PTS saqlanmadi.');
    } finally {
      setRowBusy('');
    }
  }

  async function toggleDaily(quiz: QuizRow) {
    setNotice('');
    setError('');
    setRowBusy(quiz.id);
    try {
      const next = !Boolean(quiz.daily_task_enabled);
      const points = clampPoints(pointsDraft[quiz.id] ?? Number(quiz.daily_task_points ?? 20));
      await patchDaily(quiz.id, next, points);
      setNotice(next
        ? `${quiz.title} 24 soatga Daily Taskga chiqarildi.`
        : `${quiz.title} Daily Taskdan olindi.`);
      await load();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Daily Task holati o‘zgarmadi.');
    } finally {
      setRowBusy('');
    }
  }

  async function remove(quiz: QuizRow) {
    if (!window.confirm(`“${quiz.title}” vocabulary quizini o‘chirasizmi?`)) return;
    setNotice('');
    setError('');
    setRowBusy(quiz.id);
    try {
      const response = await fetch(`/api/admin/tests/${quiz.id}`, { method: 'DELETE' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Quiz o‘chirilmadi.');
      setNotice(`${quiz.title} o‘chirildi.`);
      await load();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Quiz o‘chirilmadi.');
    } finally {
      setRowBusy('');
    }
  }

  return (
    <section className={styles.panel} id="admin-vocabulary-quizzes">
      <div className={styles.header}>
        <div className={styles.headerIcon}><BookOpenIcon /></div>
        <div>
          <span>VOCABULARY PRACTICE</span>
          <h2>Vocabulary Quiz yuklash</h2>
          <p>Passage nomi bilan HTML quiz yuklang, PTS belgilang va xohlasangiz shu zahoti Daily Taskga chiqaring.</p>
        </div>
        <div className={styles.stats}>
          <strong>{quizzes.length}</strong><small>quiz</small>
          <i />
          <strong>{publishedCount}</strong><small>published</small>
        </div>
      </div>

      {(notice || error) && <div className={error ? styles.error : styles.notice}>{error || notice}</div>}

      <form className={styles.form} onSubmit={submit}>
        <div className={styles.gridTwo}>
          <label>
            <span>Passage nomi</span>
            <input value={form.title} maxLength={120} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} placeholder="Masalan: Living Walls" />
          </label>
          <label>
            <span>Yo‘nalish</span>
            <select value={form.track} onChange={(event) => setForm((value) => ({ ...value, track: event.target.value as 'ielts' | 'cefr' }))}>
              <option value="ielts">IELTS</option>
              <option value="cefr">CEFR</option>
            </select>
          </label>
        </div>

        <div className={styles.gridThree}>
          <label>
            <span>PTS</span>
            <input type="number" min={0} max={100} value={form.points} onChange={(event) => setForm((value) => ({ ...value, points: clampPoints(Number(event.target.value)) }))} />
          </label>
          <label>
            <span>Vaqt (daqiqa)</span>
            <input type="number" min={5} max={240} value={form.durationMinutes} onChange={(event) => setForm((value) => ({ ...value, durationMinutes: Number(event.target.value) }))} />
          </label>
          <label>
            <span>Holati</span>
            <select value={form.status} onChange={(event) => {
              const status = event.target.value as 'published' | 'draft';
              setForm((value) => ({ ...value, status, dailyTask: status === 'draft' ? false : value.dailyTask }));
            }}>
              <option value="published">Published — userga ko‘rinadi</option>
              <option value="draft">Draft — faqat admin</option>
            </select>
          </label>
        </div>

        <label className={styles.description}>
          <span>Qisqa izoh</span>
          <textarea value={form.description} maxLength={500} onChange={(event) => setForm((value) => ({ ...value, description: event.target.value }))} placeholder="Quiz haqida qisqa izoh — ixtiyoriy" />
        </label>

        <div className={styles.uploadRow}>
          <label className={styles.dropZone}>
            <input key={fileKey} type="file" accept=".html,.htm,text/html" onChange={(event) => setFile(event.target.files?.[0] || null)} />
            <span className={styles.dropIcon}><UploadCloudIcon /></span>
            <div>
              <b>{file ? file.name : 'Vocabulary quiz HTML faylini tanlang'}</b>
              <small>{file ? `${Math.max(1, Math.round(file.size / 1024))} KB · yuklashga tayyor` : '.html yoki .htm · maksimal 10 MB'}</small>
            </div>
          </label>

          <label className={`${styles.dailyToggle} ${form.dailyTask ? styles.dailyToggleOn : ''}`}>
            <input type="checkbox" checked={form.dailyTask} disabled={form.status !== 'published'} onChange={(event) => setForm((value) => ({ ...value, dailyTask: event.target.checked }))} />
            <span><ZapIcon /></span>
            <div><b>Daily Taskga chiqarish</b><small>24 soat · {clampPoints(form.points)} PTS</small></div>
          </label>
        </div>

        <button className={styles.submit} type="submit" disabled={busy}>
          <UploadCloudIcon /> {busy ? 'Yuklanmoqda…' : 'Vocabulary quizni yuklash'}
        </button>
      </form>

      <div className={styles.libraryHeader}>
        <div><span>YUKLANGAN QUIZLAR</span><h3>Vocabulary kutubxonasi</h3></div>
        <small>PTS va Daily Task holatini shu yerning o‘zida boshqaring.</small>
      </div>

      {loading ? (
        <div className={styles.empty}>Vocabulary quizlar yuklanmoqda…</div>
      ) : quizzes.length ? (
        <div className={styles.list}>
          {quizzes.map((quiz) => {
            const active = Boolean(quiz.daily_task_enabled && quiz.daily_task_expires_at && Date.parse(quiz.daily_task_expires_at) > Date.now());
            return (
              <article className={styles.row} key={quiz.id}>
                <div className={styles.rowIcon}><FileTextIcon /></div>
                <div className={styles.rowCopy}>
                  <span>{quiz.track.toUpperCase()} · VOCABULARY</span>
                  <h4>{quiz.title}</h4>
                  <small><ClockIcon /> {quiz.duration_minutes || 10} min {quiz.file_name ? `· ${quiz.file_name}` : ''}</small>
                </div>
                <span className={quiz.status === 'published' ? styles.published : styles.draft}>{quiz.status}</span>
                <label className={styles.pointsEditor}>
                  <span>PTS</span>
                  <input type="number" min={0} max={100} value={pointsDraft[quiz.id] ?? Number(quiz.daily_task_points ?? 20)} onChange={(event) => setPointsDraft((value) => ({ ...value, [quiz.id]: clampPoints(Number(event.target.value)) }))} />
                  <button type="button" disabled={rowBusy === quiz.id} onClick={() => void savePoints(quiz)}>Saqlash</button>
                </label>
                <button type="button" className={`${styles.dailyButton} ${active ? styles.dailyButtonOn : ''}`} disabled={rowBusy === quiz.id || quiz.status !== 'published'} onClick={() => void toggleDaily(quiz)}>
                  {active ? <CheckCircleIcon /> : <ZapIcon />}
                  <span><b>{active ? 'Daily Task faol' : 'Daily Task'}</b><small>{active ? `Tugaydi: ${formatExpiry(quiz.daily_task_expires_at)}` : `${pointsDraft[quiz.id] ?? quiz.daily_task_points ?? 20} PTS · 24 soat`}</small></span>
                </button>
                <button type="button" className={styles.deleteButton} disabled={rowBusy === quiz.id} aria-label={`${quiz.title} ni o‘chirish`} onClick={() => void remove(quiz)}><TrashIcon /></button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className={styles.empty}>Hali vocabulary quiz yuklanmagan.</div>
      )}
    </section>
  );
}
