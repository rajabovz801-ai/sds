'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { ArrowRightIcon, HeadphonesIcon, BookOpenIcon, ShieldCheckIcon } from '@/components/UiIcons';
import type { ActiveMockData } from '@/lib/activeMock';
import styles from './ActiveMockBanner.module.css';

export function ActiveMockBanner({ mock }: { mock: ActiveMockData | null }) {
  const router = useRouter();
  const codeRef = useRef<HTMLInputElement | null>(null);
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

  const digits = Array.from({ length: 6 }, (_, index) => code[index] || '');

  return createPortal(
    <section className={styles.banner}>
      <div className={styles.glowOne} />
      <div className={styles.glowTwo} />

      <div className={styles.copy}>
        <div className={styles.topline}>
          <span className={styles.liveDot}><i /> LIVE FULL MOCK</span>
          <span className={styles.secure}><ShieldCheckIcon /> SECURE EXAM SESSION</span>
        </div>

        <span className={styles.eyebrow}>ARK EDUCATION · IELTS EXAM WORKSPACE</span>
        <h2>{mock.title}</h2>
        <p>Real exam flow: instruction video, Listening, Reading va faqat oxirida yakuniy natija.</p>

        <div className={styles.flow}>
          <div><span>01</span><i><HeadphonesIcon /></i><b>Listening</b><small>40 questions</small></div>
          <em />
          <div><span>02</span><i><BookOpenIcon /></i><b>Reading</b><small>40 questions</small></div>
          <em />
          <div><span>03</span><i><ShieldCheckIcon /></i><b>Final Result</b><small>Overall band</small></div>
        </div>

        <div className={styles.facts}>
          <span>80 QUESTIONS</span>
          <span>ONE ATTEMPT</span>
          <span>AUTO SAVE</span>
          <span>SERVER TIMING</span>
        </div>
      </div>

      <div className={styles.action}>
        <div className={styles.actionHead}>
          <div>
            <small>{mock.candidateId ? 'CANDIDATE ID' : 'SECURE ACCESS'}</small>
            <strong>{mock.candidateId || 'Enter Mock Code'}</strong>
          </div>
          <span><ShieldCheckIcon /></span>
        </div>

        {mock.setupPending ? (
          <div className={styles.stateBox}>
            <b>Mock tayyorlanmoqda</b>
            <p>Secure access bir necha soniyada tayyor bo‘ladi.</p>
            <button className={styles.button} type="button" disabled>Preparing…</button>
          </div>
        ) : mock.attempt ? (
          <div className={styles.stateBox}>
            <b>{mock.attempt.status === 'completed' ? 'Mock Completed' : 'Mock in progress'}</b>
            <p>{mock.attempt.status === 'completed' ? 'Yakuniy natijangiz tayyor.' : 'Avvalgi joyingizdan xavfsiz davom eting.'}</p>
            <Link className={styles.button} href={attemptHref}>{mock.attempt.status === 'completed' ? 'View Final Result' : 'Continue Mock'} <ArrowRightIcon /></Link>
          </div>
        ) : (
          <form className={styles.codeWrap} onSubmit={submit}>
            <div className={styles.codeLabel}>
              <b>6-digit Mock Code</b>
              <span>{code.length}/6</span>
            </div>

            <button className={styles.codeShell} type="button" onClick={() => codeRef.current?.focus()} aria-label="Mock Code yozish">
              {digits.map((digit, index) => <span key={index} className={digit ? styles.filled : ''}>{digit || '•'}</span>)}
            </button>
            <input
              ref={codeRef}
              className={styles.codeInput}
              value={code}
              onChange={(event) => {
                setCode(event.target.value.replace(/\D/g, '').slice(0, 6));
                if (error) setError('');
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label="6-digit Mock Code"
            />

            <p className={styles.hint}>Admin bergan 6 xonali kodni kiriting. Kod faqat sizning akkauntingiz uchun ishlaydi.</p>
            <button className={styles.button} type="submit" disabled={busy || code.length !== 6}>
              {busy ? 'Checking secure access…' : 'Confirm & Start Mock'} <ArrowRightIcon />
            </button>
            {error && <div className={styles.error}>{error}</div>}
          </form>
        )}

        <div className={styles.actionFoot}><i /> One attempt · answers auto-saved</div>
      </div>
    </section>,
    host,
  );
}
