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
    if (!mock || mock.attempt?.status === 'completed') return;
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

  if (!mock || mock.attempt?.status === 'completed' || !host) return null;

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
        <span className={styles.eyebrow}>IELTS FULL MOCK EXAM</span>
        <h2>{mock.title}</h2>
        <div className={styles.facts}><span>LISTENING + READING</span><span>80 QUESTIONS</span><span>ONE ATTEMPT</span><span>FINAL OVERALL BAND</span></div>
      </div>
      <div className={styles.action}>
        <small>{mock.candidateId ? `CANDIDATE · ${mock.candidateId}` : 'SECURE MOCK ACCESS'}</small>
        {mock.setupPending ? (
          <>
            <strong>Mock 01</strong>
            <p>Secure access is being prepared.</p>
            <button className={styles.button} type="button" disabled>Preparing…</button>
          </>
        ) : mock.attempt ? (
          <>
            <strong>{mock.attempt.status === 'completed' ? 'Mock Completed' : 'Mock in progress'}</strong>
            <Link className={styles.button} href={attemptHref}>{mock.attempt.status === 'completed' ? 'View Final Result' : 'Continue Mock'} <ArrowRightIcon /></Link>
          </>
        ) : (
          <form className={styles.codeWrap} onSubmit={submit}>
            <strong>Start Mock Exam</strong>
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
