'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeftIcon } from '@/components/UiIcons';
import styles from './ShadowingLessonClient.module.css';

type Props = {
  lesson: {
    id: string;
    sequenceNo: number;
    title: string;
    script: string;
    videoUrl: string;
    dailyTaskEnabled: boolean;
    dailyTaskPoints: number;
  };
  initiallyCompleted: boolean;
};

export function ShadowingLessonClient({ lesson, initiallyCompleted }: Props) {
  const [videoEnded, setVideoEnded] = useState(false);
  const [completed, setCompleted] = useState(initiallyCompleted);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  async function completeDailyTask() {
    if (busy || completed || !videoEnded) return;
    setBusy(true);
    setMessage('');
    setIsError(false);
    try {
      const response = await fetch(`/api/shadowing/${lesson.id}/complete`, { method: 'POST' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Daily Task yakunlanmadi.');
      setCompleted(true);
      setMessage(body.alreadyCompleted ? 'Bu shadowing uchun PTS oldin hisoblangan.' : `+${body.pointsAwarded || lesson.dailyTaskPoints} PTS hisoblandi.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Daily Task yakunlanmadi.');
      setIsError(true);
    } finally {
      setBusy(false);
    }
  }

  const fullTitle = `Shadowing ${lesson.sequenceNo}. ${lesson.title}`;

  return (
    <div className={styles.page}>
      <header className={styles.topbar}>
        <Link className={styles.back} href="/study-tools/shadowing" aria-label="Shadowing ro‘yxatiga qaytish"><ArrowLeftIcon /></Link>
        <h1>{fullTitle}</h1>
      </header>

      <main className={styles.main}>
        <div className={styles.videoShell}>
          <video className={styles.video} controls playsInline preload="metadata" src={lesson.videoUrl} onEnded={() => setVideoEnded(true)} />
        </div>

        <details className={styles.script}>
          <summary><span>Shadowing script</span><i className={styles.chevron} aria-hidden="true" /></summary>
          <div className={styles.scriptBody}><p>{lesson.script}</p></div>
        </details>

        {lesson.dailyTaskEnabled ? (
          <section className={styles.task}>
            <div className={styles.taskCopy}>
              <small>DAILY TASK</small>
              <strong className={completed ? styles.done : ''}>{completed ? 'Bajarildi ✓' : `Reward: +${lesson.dailyTaskPoints} PTS`}</strong>
              <span>{completed ? 'PTS hisoblangan.' : videoEnded ? 'Videoni tugatdingiz. PTS ni oling.' : 'PTS olish uchun videoni oxirigacha ko‘ring.'}</span>
            </div>
            <button type="button" disabled={busy || completed || !videoEnded} onClick={() => void completeDailyTask()}>
              {completed ? 'Completed' : busy ? 'Hisoblanmoqda…' : 'Daily Taskni yakunlash'}
            </button>
          </section>
        ) : null}

        {message ? <div className={`${styles.notice} ${isError ? styles.error : ''}`}>{message}</div> : null}
      </main>
    </div>
  );
}
