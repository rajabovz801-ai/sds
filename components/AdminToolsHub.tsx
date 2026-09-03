'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AdminAttemptResetPanel } from '@/components/AdminAttemptResetPanel';
import { AdminDailyTasksPanel } from '@/components/AdminDailyTasksPanel';
import { AdminMockManager } from '@/components/AdminMockManager';
import { AdminSpeakingMockPanel } from '@/components/AdminSpeakingMockPanel';
import { AdminSpeakingPracticeInbox } from '@/components/AdminSpeakingPracticeInbox';
import { AdminStudentPointsPanel } from '@/components/AdminStudentPointsPanel';
import { AdminTelegramSchedulerPanel } from '@/components/AdminTelegramSchedulerPanel';
import { AdminTypingExercisesPanel } from '@/components/AdminTypingExercisesPanel';
import { AdminVocabularyQuizPanel } from '@/components/AdminVocabularyQuizPanel';
import { LayoutGridIcon } from '@/components/UiIcons';
import styles from './AdminToolsHub.module.css';

type Tool = 'points' | 'typing' | 'vocabulary' | 'daily' | 'speaking' | 'telegram' | 'exam';

const tabs: Array<{ id: Tool; label: string; note: string; badge: string }> = [
  { id: 'points', label: 'PTS', note: 'Berish va ayirish', badge: 'P' },
  { id: 'typing', label: 'Typing', note: 'Exercise va sample', badge: 'Y' },
  { id: 'vocabulary', label: 'Vocabulary', note: 'Quiz va PTS', badge: 'V' },
  { id: 'daily', label: 'Daily Tasks', note: '24 soatlik vazifalar', badge: 'D' },
  { id: 'speaking', label: 'Speaking Inbox', note: 'Practice MP3 javoblar', badge: 'S' },
  { id: 'telegram', label: 'Telegram', note: 'Xabar va scheduler', badge: 'T' },
  { id: 'exam', label: 'Exam Controls', note: 'Mock, Speaking, retry', badge: 'E' },
];

export function AdminToolsHub() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Tool>('points');
  const [topbarHost, setTopbarHost] = useState<HTMLElement | null>(null);
  const [bodyHost, setBodyHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setBodyHost(document.body);

    const attach = () => {
      const host = document.querySelector<HTMLElement>('.adminTopActions');
      if (host) setTopbarHost(host);
      return Boolean(host);
    };

    if (attach()) return;
    const observer = new MutationObserver(() => {
      if (attach()) observer.disconnect();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  const trigger = topbarHost ? createPortal(
    <button className={styles.trigger} type="button" onClick={() => setOpen(true)}>
      <LayoutGridIcon />
      <span>Tools</span>
    </button>,
    topbarHost,
  ) : null;

  const drawer = open && bodyHost ? createPortal(
    <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-label="Admin tools">
        <header className={styles.header}>
          <div>
            <small>ARK CONTROL · UTILITIES</small>
            <h2>Admin Tools</h2>
            <p>Kam ishlatiladigan boshqaruvlar bitta joyda. Asosiy panel ixcham qoladi.</p>
          </div>
          <button className={styles.close} type="button" onClick={() => setOpen(false)} aria-label="Yopish">×</button>
        </header>

        <div className={styles.workspace}>
          <nav className={styles.sidebar} aria-label="Admin tool bo‘limlari">
            {tabs.map((tab) => (
              <button key={tab.id} type="button" className={active === tab.id ? styles.active : ''} onClick={() => setActive(tab.id)}>
                <span>{tab.badge}</span>
                <div><strong>{tab.label}</strong><small>{tab.note}</small></div>
              </button>
            ))}
          </nav>

          <main className={styles.content}>
            {active === 'points' && <AdminStudentPointsPanel />}
            {active === 'typing' && <AdminTypingExercisesPanel />}
            {active === 'vocabulary' && <AdminVocabularyQuizPanel />}
            {active === 'daily' && <AdminDailyTasksPanel />}
            {active === 'speaking' && <AdminSpeakingPracticeInbox />}
            {active === 'telegram' && <AdminTelegramSchedulerPanel />}
            {active === 'exam' && (
              <section className={styles.examPanel}>
                <div className={styles.examIntro}>
                  <small>EXAM OPERATIONS</small>
                  <h3>Imtihon boshqaruvlari</h3>
                  <p>Full Mock, Speaking Mock va studentga qayta urinish berish shu yerda jamlangan.</p>
                </div>
                <div className={styles.examGrid}>
                  <article>
                    <span>01</span><div><strong>Full Mock</strong><small>Listening + Reading mock nazorati</small></div>
                    <div className={styles.launcherHost}><AdminMockManager /></div>
                  </article>
                  <article>
                    <span>02</span><div><strong>Speaking Mock</strong><small>Video va student recordinglari</small></div>
                    <div className={styles.launcherHost}><AdminSpeakingMockPanel /></div>
                  </article>
                  <article>
                    <span>03</span><div><strong>Qayta ruxsat</strong><small>Studentga bitta yangi urinish</small></div>
                    <div className={styles.launcherHost}><AdminAttemptResetPanel /></div>
                  </article>
                </div>
              </section>
            )}
          </main>
        </div>
      </aside>
    </div>,
    bodyHost,
  ) : null;

  return <>{trigger}{drawer}</>;
}
