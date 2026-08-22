'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  KeyRoundIcon,
  ShieldCheckIcon,
} from '@/components/UiIcons';

type LoginMode = 'student' | 'admin';

export function LoginClient({ nextPath = '/mock' }: { nextPath?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>('student');
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mode === 'admin') pinRef.current?.focus();
  }, [mode]);

  async function submitStudent(event: FormEvent) {
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
      if (data.adminChallenge) {
        setMode('admin');
        setCode('');
        return;
      }
      router.replace(nextPath || data.next || '/mock');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kirish amalga oshmadi.');
    } finally {
      setBusy(false);
    }
  }

  async function submitAdmin(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Admin kirishi amalga oshmadi.');
      router.replace(data.next || '/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin kirishi amalga oshmadi.');
    } finally {
      setBusy(false);
    }
  }

  if (mode === 'admin') {
    return (
      <form className="authForm authAdminForm" onSubmit={submitAdmin}>
        <button
          className="authModeBack"
          type="button"
          onClick={() => { setMode('student'); setPin(''); setError(''); }}
        >
          <ArrowLeftIcon /> Student kirishiga qaytish
        </button>
        <span className="authFormIcon"><ShieldCheckIcon /></span>
        <span className="authEyebrow">RESTRICTED WORKSPACE</span>
        <h1>Admin tasdiqlash</h1>
        <p>Himoyalangan boshqaruv paneliga kirish uchun serverda belgilangan PIN’ni kiriting.</p>

        <div className="authCodeField authPinField">
          <label htmlFor="admin-pin">Admin PIN</label>
          <div className="authInputShell"><KeyRoundIcon /><input
            ref={pinRef}
            id="admin-pin"
            type="password"
            value={pin}
            onChange={(event) => setPin(event.target.value.slice(0, 128))}
            autoComplete="current-password"
            placeholder="••••••••"
          /></div>
          <span>PIN brauzer xotirasida saqlanmaydi</span>
        </div>

        {error && <div className="authError" role="alert">{error}</div>}
        <button className="authPrimary authSubmit" type="submit" disabled={busy || pin.length < 4}>
          {busy ? 'Tasdiqlanmoqda…' : 'Admin panelni ochish'} <span><ArrowRightIcon /></span>
        </button>
      </form>
    );
  }

  return (
    <form className="authForm" onSubmit={submitStudent}>
      <span className="authEyebrow">SECURE STUDENT ACCESS</span>
      <h1>Qaytganingizdan xursandmiz.</h1>
      <p>Telegram bot bergan bir martalik kodingizni kiriting. Sessiya keyingi tashriflarda avtomatik taniladi.</p>

      <div className="authCodeField">
        <label htmlFor="login-code">Bir martalik kirish kodi</label>
        <div className="authInputShell"><KeyRoundIcon /><input
          id="login-code"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 8))}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          placeholder="000000"
          aria-describedby="login-help"
        /></div>
        <span id="login-help">4–8 xonali, faqat bir marta ishlaydigan kod</span>
      </div>

      {error && <div className="authError" role="alert">{error}</div>}

      <button className="authPrimary authSubmit" type="submit" disabled={busy || code.length < 4}>
        {busy ? 'Tekshirilmoqda…' : 'Platformaga kirish'} <span><ArrowRightIcon /></span>
      </button>

      <div className="authDivider"><span>kod hali yo‘qmi?</span></div>
      <Link className="authTelegram" href="https://t.me/arkedu_bot?start=login" target="_blank" rel="noopener noreferrer">
        Telegram botdan kod olish <span><ArrowUpRightIcon /></span>
      </Link>
    </form>
  );
}
