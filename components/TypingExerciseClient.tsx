'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  EditIcon,
  RepeatIcon,
  TargetIcon,
  ZapIcon,
} from '@/components/UiIcons';
import styles from './TypingExerciseClient.module.css';

type Exercise = {
  id: string;
  title: string;
  promptTitle: string;
  prompt: string;
  content: string;
};

type Props = { exercise: Exercise };

type TimeOption = { label: string; seconds: number };

const TIME_OPTIONS: TimeOption[] = [
  { label: 'Unlimited', seconds: 0 },
  { label: '30 sec', seconds: 30 },
  { label: '1 min', seconds: 60 },
  { label: '10 min', seconds: 600 },
  { label: '40 min', seconds: 2400 },
];

function formatTime(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function wordCount(value: string) {
  return value.trim() ? value.trim().split(/\s+/).length : 0;
}

function mistypedWords(typed: string, target: string) {
  const typedWords = typed.trim().split(/\s+/).filter(Boolean);
  const targetWords = target.trim().split(/\s+/).filter(Boolean);
  return typedWords.reduce((sum, word, index) => sum + (word === targetWords[index] ? 0 : 1), 0);
}

export function TypingExerciseClient({ exercise }: Props) {
  const target = useMemo(() => exercise.content.replace(/\r/g, '').replace(/\n{2,}/g, '\n'), [exercise.content]);
  const [typed, setTyped] = useState('');
  const [limit, setLimit] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const captureRef = useRef<HTMLTextAreaElement | null>(null);
  const currentRef = useRef<HTMLSpanElement | null>(null);

  const totalWords = useMemo(() => wordCount(target), [target]);
  const typedWords = useMemo(() => wordCount(typed), [typed]);
  const correctChars = useMemo(() => {
    let correct = 0;
    for (let index = 0; index < typed.length; index += 1) {
      if (typed[index] === target[index]) correct += 1;
    }
    return correct;
  }, [target, typed]);
  const accuracy = typed.length ? Math.round((correctChars / typed.length) * 100) : 100;
  const errors = useMemo(() => mistypedWords(typed, target), [target, typed]);
  const wpm = elapsed > 0 ? Math.round(((correctChars / 5) / elapsed) * 60) : 0;
  const shownTime = limit > 0 ? Math.max(0, limit - elapsed) : elapsed;

  const finish = useCallback(() => {
    if (finished) return;
    setFinished(true);
    if (startedAt) setElapsed(Math.max(1, Math.floor((Date.now() - startedAt) / 1000)));
  }, [finished, startedAt]);

  useEffect(() => {
    if (!startedAt || finished) return;
    const tick = window.setInterval(() => {
      const next = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      setElapsed(next);
      if (limit > 0 && next >= limit) {
        window.clearInterval(tick);
        setFinished(true);
      }
    }, 250);
    return () => window.clearInterval(tick);
  }, [finished, limit, startedAt]);

  useEffect(() => {
    if (!finished) captureRef.current?.focus();
  }, [finished]);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center', inline: 'nearest' });
  }, [typed.length]);

  function reset(nextLimit = limit) {
    setTyped('');
    setLimit(nextLimit);
    setStartedAt(null);
    setElapsed(0);
    setFinished(false);
    window.setTimeout(() => captureRef.current?.focus(), 0);
  }

  function onType(value: string) {
    if (finished) return;
    if (!startedAt && value.length > 0) setStartedAt(Date.now());
    const next = value.slice(0, target.length);
    setTyped(next);
    if (next.length >= target.length) {
      setFinished(true);
      if (!startedAt) setElapsed(1);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/study-tools/typing" className={styles.back}><span><ArrowLeftIcon /></span><strong>Typing</strong></Link>
        <div className={styles.timePicker}>
          <span className={styles.timeLabel}><ClockIcon /> Time</span>
          {TIME_OPTIONS.map((option) => (
            <button key={option.seconds} type="button" disabled={Boolean(startedAt) && !finished} className={limit === option.seconds ? styles.timeActive : ''} onClick={() => reset(option.seconds)}>{option.label}</button>
          ))}
        </div>
        <div className={styles.actions}>
          <button className={styles.reset} type="button" onClick={() => reset()} aria-label="Qayta boshlash"><RepeatIcon /></button>
          <button className={styles.finish} type="button" onClick={finish}><CheckCircleIcon /> Finish</button>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.promptCard}>
          <small>{exercise.promptTitle}</small>
          <h1>{exercise.title}</h1>
        </section>

        {!finished ? (
          <section className={styles.exercise}>
            <div className={styles.exerciseMeta}>
              <span><ClockIcon /> {formatTime(shownTime)}</span>
              <strong>{typedWords}/{totalWords}</strong>
            </div>
            <div className={styles.typeSurface} onClick={() => captureRef.current?.focus()}>
              <textarea
                ref={captureRef}
                className={styles.capture}
                value={typed}
                onChange={(event) => onType(event.target.value)}
                onPaste={(event) => event.preventDefault()}
                autoFocus
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                aria-label="Typing input"
              />
              <div className={styles.targetText} aria-hidden="true">
                {Array.from(target).map((character, index) => {
                  const done = index < typed.length;
                  const current = index === typed.length;
                  const correct = done && typed[index] === character;
                  const className = done ? (correct ? styles.correct : styles.wrong) : current ? styles.current : styles.pending;
                  return <span key={index} ref={current ? currentRef : undefined} className={className}>{character}</span>;
                })}
              </div>
              {!typed.length && <div className={styles.hint}>Yozishni boshlang — timer birinchi harf bilan ishga tushadi.</div>}
            </div>
          </section>
        ) : (
          <section className={styles.results}>
            <div className={styles.resultIntro}>
              <small>TYPING RESULT</small>
              <h2>Exercise yakunlandi</h2>
            </div>
            <div className={styles.metrics}>
              <article><span className={styles.metricViolet}><ZapIcon /></span><div><small>Speed</small><strong>{wpm} WPM</strong><p>Words Per Minute</p></div></article>
              <article><span className={styles.metricGreen}><TargetIcon /></span><div><small>Accuracy</small><strong>{accuracy}%</strong><p>{correctChars} correct characters</p></div></article>
              <article><span className={styles.metricRed}><EditIcon /></span><div><small>Errors</small><strong>{errors}</strong><p>Mistyped words</p></div></article>
              <article><span className={styles.metricBlue}><ClockIcon /></span><div><small>Time</small><strong>{formatTime(elapsed)}</strong><p>{typedWords}/{totalWords} words typed</p></div></article>
            </div>
            <div className={styles.resultActions}>
              <button type="button" onClick={() => reset()}><RepeatIcon /> Try again</button>
              <Link href="/study-tools/typing"><ArrowLeftIcon /> Exercises’ga qaytish</Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
