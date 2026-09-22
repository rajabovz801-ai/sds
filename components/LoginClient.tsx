'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpRightIcon,
  TelegramIcon,
  KeyRoundIcon,
  ShieldCheckIcon,
} from '@/components/UiIcons';

type LoginMode = 'student' | 'admin';

export function LoginClient({ nextPath = '/ielts' }: { nextPath?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>('student');
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pinRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

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
      if (!response.ok) {
        if (data.maintenance) {
          router.replace('/maintenance');
          router.refresh();
          return;
        }
        throw new Error(data.error || 'Kirish amalga oshmadi.');
      }
      if (data.adminChallenge) {
        setMode('admin');
        setCode('');
        return;
      }
      router.replace(nextPath || data.next || '/ielts');
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
        <button className="authModeBack" type="button" onClick={() => { setMode('student'); setPin(''); setError(''); }}>
          <ArrowLeftIcon /> Student kirishiga qaytish
        </button>
        <span className="authFormIcon"><ShieldCheckIcon /></span>
        <span className="authEyebrow">RESTRICTED WORKSPACE</span>
        <h1>Admin tasdiqlash</h1>
        <p>Test yuklash paneliga kirish uchun admin PIN’ni kiriting.</p>

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
      <span className="authEyebrow authAccessEyebrow"><ShieldCheckIcon /> SECURE STUDENT ACCESS</span>
      <h1>IELTS testlarga kirish.</h1>
      <p>Telegram bot bergan bir martalik 6 xonali kodni kiriting.</p>

      <div className="authCodeField authStudentCodeField">
        <div className="authCodeLabel">
          <label htmlFor="login-code"><KeyRoundIcon /> 6 xonali kirish kodi</label>
          <span><ShieldCheckIcon /> Xavfsiz kirish</span>
        </div>

        <button className="authOtpShell" type="button" onClick={() => codeRef.current?.focus()} aria-label="Kirish kodini yozish">
          <span className="authOtpBoxes" aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
              <i key={index} className={code[index] ? 'filled' : index === code.length ? 'current' : ''}>{code[index] || ''}</i>
            ))}
          </span>
        </button>

        <input
          ref={codeRef}
          id="login-code"
          className="authOtpInput"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          aria-describedby="login-help"
        />
        <span id="login-help">6 xonali kod · faqat bir marta ishlaydi</span>
      </div>

      {error && <div className="authError" role="alert">{error}</div>}

      <button className="authPrimary authSubmit" type="submit" disabled={busy || code.length !== 6}>
        {busy ? 'Tekshirilmoqda…' : 'Platformaga kirish'} <span><ArrowRightIcon /></span>
      </button>

      <p className="authTelegramHint">Kirish kodi yo‘qmi?</p>
      <Link className="authTelegram" href="https://t.me/arkedu_bot?start=login" target="_blank" rel="noopener noreferrer">
        <span className="authTelegramIcon"><TelegramIcon /></span>
        <b>Telegram botdan kod olish</b>
        <span className="authTelegramArrow"><ArrowUpRightIcon /></span>
      </Link>
    </form>
  );
}
