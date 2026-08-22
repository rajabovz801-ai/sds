'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Student = { id: string; firstName: string; lastName: string };

export function LandingAccessCard() {
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
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Kirish amalga oshmadi.');
      setStudent(data.student || null);
      router.push(data.next || '/mock');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kirish amalga oshmadi.');
    } finally {
      setBusy(false);
    }
  }

  if (student) {
    return (
      <div className="arkGateAccessReady">
        <span className="arkGateAccessLabel">SESSION ACTIVE</span>
        <strong>{student.firstName} {student.lastName}</strong>
        <p>Siz platformaga kirgansiz. IELTS yoki CEFR mock yo‘nalishini tanlash uchun davom eting.</p>
        <Link className="arkGateContinue" href="/mock">Mock platformaga davom etish <b>→</b></Link>
      </div>
    );
  }

  return (
    <>
      <div className="arkGateRegisterBlock">
        <label>Ro‘yxatdan o‘tish</label>
        <Link
          className="arkGateRegisterField"
          href="https://t.me/arkedu_bot?start=login"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>Telegram orqali ro‘yxatdan o‘tish</span>
          <b>↗</b>
        </Link>
      </div>

      <form className="arkGateCodeBlock" onSubmit={submit}>
        <label htmlFor="landing-login-code">Telegram bergan kod</label>
        <div className="arkGateCodeField">
          <input
            id="landing-login-code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 8))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Kodni kiriting"
            aria-label="Telegram bergan kirish kodi"
          />
          <button type="submit" disabled={busy || code.length < 4} aria-label="Kirish kodini tasdiqlash">
            {busy ? '…' : '→'}
          </button>
        </div>
        {error && <p className="arkGateCodeError">{error}</p>}
      </form>

      <div className="arkGateNote">
        <span aria-hidden="true">✓</span>
        <p>Botda ism-familiyangizni yuboring, olingan bir martalik kodni shu yerga kiriting.</p>
      </div>
    </>
  );
}
