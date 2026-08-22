'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './AdminAttemptResetPanel.module.css';

type Attempt = {
  sessionId: string;
  studentId: string;
  studentName: string;
  telegramId: string;
  studentStatus: string;
  testId: string;
  testTitle: string;
  track: string;
  skill: string;
  mode: string;
  status: string;
  finishedAt: string;
};

export function AdminAttemptResetPanel() {
  const [open, setOpen] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [studentId, setStudentId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function loadAttempts() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/attempts/reopen', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Urinishlar yuklanmadi.');
      setAttempts(body.attempts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Urinishlar yuklanmadi.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) void loadAttempts();
  }, [open]);

  const students = useMemo(() => {
    const map = new Map<string, { id: string; name: string; telegramId: string }>();
    for (const attempt of attempts) {
      if (!map.has(attempt.studentId)) {
        map.set(attempt.studentId, {
          id: attempt.studentId,
          name: attempt.studentName,
          telegramId: attempt.telegramId,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [attempts]);

  const studentAttempts = useMemo(
    () => attempts.filter((attempt) => attempt.studentId === studentId),
    [attempts, studentId],
  );

  useEffect(() => {
    if (!studentId || !students.some((student) => student.id === studentId)) {
      setStudentId(students[0]?.id || '');
    }
  }, [studentId, students]);

  useEffect(() => {
    if (!sessionId || !studentAttempts.some((attempt) => attempt.sessionId === sessionId)) {
      setSessionId(studentAttempts[0]?.sessionId || '');
    }
  }, [sessionId, studentAttempts]);

  async function reopenAttempt() {
    const selected = attempts.find((attempt) => attempt.sessionId === sessionId);
    if (!selected) return;
    if (!window.confirm(`${selected.studentName} uchun “${selected.testTitle}” testini yana bir marta ochib berilsinmi? Eski natija tarixda qoladi.`)) return;

    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/attempts/reopen', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Qayta ruxsat berilmadi.');
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Qayta ruxsat berilmadi.');
      setBusy(false);
    }
  }

  return (
    <>
      <button type="button" className={styles.trigger} onClick={() => setOpen(true)}>
        <span>↻</span>
        <div><strong>Qayta ruxsat</strong><small>Studentga testni yana ochish</small></div>
      </button>

      {open && (
        <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section className={styles.modal} role="dialog" aria-modal="true" aria-label="Testni qayta ochish">
            <header>
              <div><small>ADMIN OVERRIDE</small><h2>Testni qayta ochish</h2><p>Student odatda testni faqat bir marta ishlaydi. Shu yerda bitta yangi urinish berishingiz mumkin.</p></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Yopish">×</button>
            </header>

            {error && <div className={styles.error}>{error}</div>}

            {loading ? <div className={styles.loading}>Urinishlar yuklanmoqda…</div> : attempts.length === 0 ? (
              <div className={styles.empty}>Qayta ochish mumkin bo‘lgan yakunlangan test topilmadi.</div>
            ) : (
              <div className={styles.form}>
                <label>
                  <span>O‘quvchi</span>
                  <select value={studentId} onChange={(event) => setStudentId(event.target.value)}>
                    {students.map((student) => <option key={student.id} value={student.id}>{student.name}{student.telegramId ? ` · ${student.telegramId}` : ''}</option>)}
                  </select>
                </label>

                <label>
                  <span>Yakunlangan test</span>
                  <select value={sessionId} onChange={(event) => setSessionId(event.target.value)}>
                    {studentAttempts.map((attempt) => (
                      <option key={attempt.sessionId} value={attempt.sessionId}>
                        {attempt.testTitle} · {attempt.skill.toUpperCase()} · {attempt.status === 'completed' ? 'YAKUNLANGAN' : 'VAQTI TUGAGAN'}
                      </option>
                    ))}
                  </select>
                </label>

                <div className={styles.note}><b>Natija saqlanadi.</b> Eski urinish admin tarixida qoladi, student esa shu testni yana faqat bir marta ishlay oladi.</div>

                <button type="button" className={styles.primary} disabled={busy || !sessionId} onClick={reopenAttempt}>
                  {busy ? 'Ochilyapti…' : 'Yana 1 marta ruxsat berish'}
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
