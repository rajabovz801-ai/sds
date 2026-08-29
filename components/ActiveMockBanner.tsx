'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { ArrowRightIcon } from '@/components/UiIcons';
import type { ActiveMockData } from '@/lib/activeMock';
import styles from './ActiveMockBanner.module.css';

export function ActiveMockBanner({ mock }: { mock: ActiveMockData | null }) {
  const router = useRouter();
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!mock) return;
    const welcome = document.querySelector<HTMLElement>('.studentWelcome');
    if (!welcome?.parentElement) return;
    const mount = document.createElement('div');
    mount.className = styles.host;
    welcome.parentElement.insertBefore(mount, welcome);
    const oldDisplay = welcome.style.display;
    welcome.style.display = 'none';
    setHost(mount);
    return () => {
      welcome.style.display = oldDisplay;
      mount.remove();
      setHost(null);
    };
  }, [mock]);

  if (!mock || !host) return null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!mock || mock.setupPending || busy || code.length < 6) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/mock/access', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Mock Code tasdiqlanmadi.');
      router.push(body.completed ? `/result/${body.attemptId}` : `/mock/${body.attemptId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mock Code tasdiqlanmadi.');
    } finally {
      setBusy(false);
    }
  }

  const attemptHref = mock.attempt
    ? mock.attempt.status === 'completed' ? `/result/${mock.attempt.id}` : `/mock/${mock.attempt.id}`
    : '';

  return createPortal(
    <section className={styles.banner}>
      <div className={styles.copy}>
        <span className={styles.eyebrow}>{mock.setupPending ? 'IELTS FULL MOCK EXAM · FINAL SETUP' : 'IELTS FULL MOCK EXAM · ACTIVE NOW'}</span>
        <h2>{mock.title}</h2>
        <p>{mock.setupPending
          ? 'Full Mock engine tayyor. Hozir Listening, Reading va instruction media fayllari yakuniy server ulanishidan o‘tkazilmoqda. Tayyor bo‘lishi bilan shu bannerning o‘zida Mock Code orqali start ochiladi.'
          : 'Bugungi Full Mock real exam flow bo‘yicha ishlaydi: Listening instructions → Listening → Reading instructions → Reading. Section natijalari yakungacha yashiriladi.'}</p>
        <div className={styles.facts}><span>LISTENING + READING</span><span>80 QUESTIONS</span><span>ONE ATTEMPT</span><span>FINAL OVERALL BAND</span></div>
      </div>
      <div className={styles.action}>
        <small>{mock.candidateId ? `CANDIDATE · ${mock.candidateId}` : 'SECURE MOCK ACCESS'}</small>
        {mock.setupPending ? (
          <>
            <strong>Mock setup in progress</strong>
            <p>Test tugmasi faqat barcha media va HTML fayllari xavfsiz ulanganidan keyin ochiladi.</p>
            <button className={styles.button} type="button" disabled>Final setup…</button>
          </>
        ) : mock.attempt ? (
          <>
            <strong>{mock.attempt.status === 'completed' ? 'Mock Completed' : 'Mock in progress'}</strong>
            <p>{mock.attempt.status === 'completed' ? 'Yakuniy natijangiz tayyor.' : 'Oldingi attempt o‘sha joyidan davom etadi.'}</p>
            <Link className={styles.button} href={attemptHref}>{mock.attempt.status === 'completed' ? 'View Final Result' : 'Continue Mock'} <ArrowRightIcon /></Link>
          </>
        ) : (
          <form className={styles.codeWrap} onSubmit={submit}>
            <strong>Start Mock Exam</strong>
            <p>Admin bergan 6 xonali shaxsiy Mock Code’ni kiriting.</p>
            <input className={styles.code} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" aria-label="Mock Code" />
            <button className={styles.button} type="submit" disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Confirm & Start'} <ArrowRightIcon /></button>
            {error && <div className={styles.error}>{error}</div>}
          </form>
        )}
      </div>
      <div className={styles.watermark}>A</div>
    </section>,
    host,
  );
}
