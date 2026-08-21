'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';

type Student = { id: string; firstName: string; lastName: string };

export function MockAccessClient() {
  const router = useRouter();
  const [student, setStudent] = useState<Student | null | undefined>(undefined);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((data) => setStudent(data.student || null))
      .catch(() => setStudent(null));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/mock/access', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Mock ochilmadi.');
      router.push(`/mock/${data.attemptId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mock ochilmadi.');
    } finally {
      setBusy(false);
    }
  }

  if (student === undefined) return <div className="mockLoading">Student session tekshirilmoqda…</div>;

  if (!student) {
    return (
      <section className="mockAccessGate">
        <div className="mockGateIcon">ID</div>
        <span className="authEyebrow">LOGIN REQUIRED</span>
        <h1>Mock ID ishlatish uchun avval kiring.</h1>
        <p>Telegram botdan bir martalik platform login kodini oling. Login tugagach shu sahifaga qaytib Mock ID kiriting.</p>
        <div className="authActions">
          <Link className="authPrimary" href="/login">Platformaga kirish <span>→</span></Link>
          <Link className="authSecondary" href="https://t.me/arkedu_bot?start=login" target="_blank" rel="noopener noreferrer">Telegram bot</Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="pageHeading mockHeading">
        <div className="pageHeadingCopy">
          <span className="authEyebrow">SECURE MOCK ACCESS</span>
          <h1>Mock test</h1>
          <p>{student.firstName} {student.lastName} uchun bir martalik Mock ID kiriting.</p>
        </div>
        <div className="mockStudentChip"><span>{student.firstName.charAt(0)}</span><div><b>{student.firstName} {student.lastName}</b><small>Active session</small></div></div>
      </section>

      <section className="mockAccessLayout">
        <div className="mockAccessCard">
          <div className="mockCardHeader">
            <div><span className="authEyebrow">MOCK ACCESS ID</span><h2>Mockni ochish</h2></div>
            <span className="mockSecureBadge">ONE-TIME</span>
          </div>

          <form onSubmit={submit} className="mockCodeForm">
            <label htmlFor="mock-code">Mock ID</label>
            <input
              id="mock-code"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20))}
              placeholder="RK7M-4Q2P"
              autoComplete="off"
              spellCheck={false}
            />
            <p>Bu ID Telegram bot orqali aynan sizning profilingiz uchun beriladi.</p>
            {error && <div className="authError">{error}</div>}
            <button className="authPrimary mockStartButton" type="submit" disabled={busy || code.length < 6}>
              {busy ? 'Tekshirilmoqda…' : 'Mockni ochish'} <span>→</span>
            </button>
          </form>

          <Link className="mockBotLink" href="https://t.me/arkedu_bot?start=mock" target="_blank" rel="noopener noreferrer">
            Mock ID’ni Telegram botdan olish <span>↗</span>
          </Link>
        </div>

        <aside className="mockInfoPanel">
          <span className="authEyebrow">HOW ACCESS WORKS</span>
          <h2>ID faqat siz uchun ishlaydi.</h2>
          <div className="mockInfoList">
            <article><b>01</b><div><strong>Studentga bog‘langan</strong><p>Boshqa account shu Mock ID’dan foydalana olmaydi.</p></div></article>
            <article><b>02</b><div><strong>Bir martalik</strong><p>Mock boshlangach access ID qayta ishlamaydi.</p></div></article>
            <article><b>03</b><div><strong>Result tracking</strong><p>Reading va Listening natijalari bitta mock attempt ichida saqlanadi.</p></div></article>
          </div>
        </aside>
      </section>
    </>
  );
}
