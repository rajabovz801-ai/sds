'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Student = { id: string; firstName: string; lastName: string; username?: string | null };

function ArrowRight() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" /></svg>;
}

function ArrowUpRight() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9" /></svg>;
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 12 4 4 8-8" /></svg>;
}

export function LoginClient({ nextPath = '/mock' }: { nextPath?: string }) {
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
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Kirish amalga oshmadi.');
      setStudent(data.student);
      setCode('');
      router.replace(nextPath || data.next || '/mock');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kirish amalga oshmadi.');
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    setStudent(null);
  }

  if (student === undefined) {
    return <div className="authStatus">Session tekshirilmoqda…</div>;
  }

  if (student) {
    return (
      <div className="authSuccess">
        <span className="authSuccessIcon"><CheckIcon /></span>
        <span className="authEyebrow">SESSION ACTIVE</span>
        <h1>{student.firstName} {student.lastName}</h1>
        <p>Platformaga muvaffaqiyatli kirilgansiz. IELTS yoki CEFR mock yo‘nalishini tanlashingiz mumkin.</p>
        <div className="authActions">
          <Link className="authPrimary" href="/mock">Mock platforma <span><ArrowRight /></span></Link>
        </div>
        <button className="authLogout" type="button" onClick={logout}>Sessiondan chiqish</button>
      </div>
    );
  }

  return (
    <form className="authForm" onSubmit={submit}>
      <span className="authEyebrow">SECURE ACCESS</span>
      <h1>Platformaga kirish</h1>
      <p>Telegram bot bergan bir martalik kirish kodini kiriting. Kod ishlatilgach qayta ishlamaydi.</p>

      <div className="authCodeField">
        <label htmlFor="login-code">Kirish kodi</label>
        <input
          id="login-code"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 8))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          aria-describedby="login-help"
        />
        <span id="login-help">4–8 xonali bir martalik kod</span>
      </div>

      {error && <div className="authError">{error}</div>}

      <button className="authPrimary authSubmit" type="submit" disabled={busy || code.length < 4}>
        {busy ? 'Tekshirilmoqda…' : 'Kirish'} <span><ArrowRight /></span>
      </button>

      <div className="authDivider"><span>yoki</span></div>
      <Link className="authTelegram" href="https://t.me/arkedu_bot?start=login" target="_blank" rel="noopener noreferrer">
        Telegram botdan kod olish <span><ArrowUpRight /></span>
      </Link>
    </form>
  );
}
