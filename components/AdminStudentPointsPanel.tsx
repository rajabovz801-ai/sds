'use client';

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import styles from './AdminStudentPointsPanel.module.css';

type StudentPointsRow = {
  id: string;
  firstName: string;
  lastName: string;
  username: string | null;
  status: string;
  taskPts: number;
  adminPts: number;
  totalPts: number;
};

type Operation = 'add' | 'subtract';

export function AdminStudentPointsPanel() {
  const [students, setStudents] = useState<StudentPointsRow[]>([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [operation, setOperation] = useState<Operation>('add');
  const [amount, setAmount] = useState(10);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/student-points', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'O‘quvchilar yuklanmadi.');
      const rows = Array.isArray(body.students) ? body.students as StudentPointsRow[] : [];
      setStudents(rows);
      setSelectedId((current) => current && rows.some((row) => row.id === current) ? current : rows[0]?.id || '');
      setError('');
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'O‘quvchilar yuklanmadi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return students;
    return students.filter((student) => `${student.firstName} ${student.lastName} ${student.username || ''}`.toLowerCase().includes(normalized));
  }, [query, students]);

  const selected = students.find((student) => student.id === selectedId) || null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice('');
    setError('');
    const safeAmount = Math.round(Number(amount));
    if (!selected) { setError('O‘quvchini tanlang.'); return; }
    if (!Number.isFinite(safeAmount) || safeAmount < 1 || safeAmount > 10000) {
      setError('PTS 1 dan 10 000 gacha bo‘lishi kerak.');
      return;
    }
    if (operation === 'subtract' && safeAmount > selected.totalPts) {
      setError(`O‘quvchida ${selected.totalPts} PTS bor. Bundan ko‘p ayirib bo‘lmaydi.`);
      return;
    }
    if (operation === 'subtract' && !window.confirm(`${selected.firstName} ${selected.lastName}dan ${safeAmount} PTS ayirilsinmi?`)) return;

    setBusy(true);
    try {
      const response = await fetch('/api/admin/student-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selected.id, operation, amount: safeAmount, reason }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'PTS o‘zgartirilmadi.');
      const verb = operation === 'add' ? 'qo‘shildi' : 'ayirildi';
      setNotice(`${selected.firstName} ${selected.lastName}: ${safeAmount} PTS ${verb}. Yangi balans: ${body.student?.totalPts ?? '—'} PTS.`);
      setReason('');
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'PTS o‘zgartirilmadi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <small>STUDENT REWARDS</small>
          <h2>O‘quvchi PTS boshqaruvi</h2>
          <p>O‘quvchiga qo‘lda PTS bering yoki mavjud PTS’dan ayiring. Bu o‘zgarish leaderboardga ham hisoblanadi.</p>
        </div>
        <div className={styles.headerStat}><strong>{students.length}</strong><span>o‘quvchi</span></div>
      </div>

      {(notice || error) && <div className={error ? styles.error : styles.notice}>{error || notice}</div>}

      <div className={styles.layout}>
        <div className={styles.studentPane}>
          <label className={styles.search}>
            <span>O‘quvchini qidirish</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ism, familiya yoki username" />
          </label>

          <div className={styles.studentList}>
            {loading ? <div className={styles.empty}>O‘quvchilar yuklanmoqda…</div> : filtered.length ? filtered.map((student) => (
              <button key={student.id} type="button" className={`${styles.studentRow} ${student.id === selectedId ? styles.studentRowActive : ''}`} onClick={() => setSelectedId(student.id)}>
                <span className={styles.avatar}>{`${student.firstName.charAt(0)}${student.lastName.charAt(0)}`.toUpperCase() || 'AR'}</span>
                <span className={styles.studentCopy}>
                  <strong>{student.firstName} {student.lastName}</strong>
                  <small>{student.username ? `@${student.username}` : student.status}</small>
                </span>
                <b>{student.totalPts} PTS</b>
              </button>
            )) : <div className={styles.empty}>O‘quvchi topilmadi.</div>}
          </div>
        </div>

        <form className={styles.editor} onSubmit={submit}>
          {selected ? (
            <>
              <div className={styles.selectedCard}>
                <div><small>TANLANGAN O‘QUVCHI</small><h3>{selected.firstName} {selected.lastName}</h3></div>
                <strong>{selected.totalPts}<span>PTS</span></strong>
              </div>

              <div className={styles.breakdown}>
                <div><span>Daily Task</span><strong>{selected.taskPts}</strong></div>
                <div><span>Admin</span><strong>{selected.adminPts >= 0 ? '+' : ''}{selected.adminPts}</strong></div>
                <div><span>Jami</span><strong>{selected.totalPts}</strong></div>
              </div>

              <div className={styles.operation}>
                <button type="button" className={operation === 'add' ? styles.addActive : ''} onClick={() => setOperation('add')}>+ PTS berish</button>
                <button type="button" className={operation === 'subtract' ? styles.subtractActive : ''} onClick={() => setOperation('subtract')}>− PTS ayirish</button>
              </div>

              <label className={styles.field}>
                <span>PTS miqdori</span>
                <input type="number" min={1} max={10000} value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
              </label>

              <div className={styles.quickAmounts}>
                {[5, 10, 20, 50, 100].map((value) => <button key={value} type="button" onClick={() => setAmount(value)}>{value}</button>)}
              </div>

              <label className={styles.field}>
                <span>Izoh <small>ixtiyoriy</small></span>
                <input value={reason} maxLength={240} onChange={(event) => setReason(event.target.value)} placeholder="Masalan: speaking faolligi, kechikish…" />
              </label>

              <div className={styles.preview}>
                <span>Yangi balans</span>
                <strong>{Math.max(0, selected.totalPts + (operation === 'add' ? 1 : -1) * Math.max(0, Number(amount) || 0))} PTS</strong>
              </div>

              <button className={`${styles.submit} ${operation === 'subtract' ? styles.submitSubtract : ''}`} disabled={busy} type="submit">
                {busy ? 'Saqlanmoqda…' : operation === 'add' ? 'PTS qo‘shish' : 'PTS ayirish'}
              </button>
            </>
          ) : <div className={styles.empty}>PTS boshqarish uchun o‘quvchini tanlang.</div>}
        </form>
      </div>
    </section>
  );
}
