'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AdminAttemptResetPanel } from '@/components/AdminAttemptResetPanel';
import { AdminDailyTasksPanel } from '@/components/AdminDailyTasksPanel';
import { AdminMockManager } from '@/components/AdminMockManager';
import { AdminShadowingPanel } from '@/components/AdminShadowingPanel';
import { AdminSpeakingMockPanel } from '@/components/AdminSpeakingMockPanel';
import { AdminSpeakingPracticeInbox } from '@/components/AdminSpeakingPracticeInbox';
import { AdminStudentPointsPanel } from '@/components/AdminStudentPointsPanel';
import { AdminTelegramSchedulerPanel } from '@/components/AdminTelegramSchedulerPanel';
import { AdminTypingExercisesPanel } from '@/components/AdminTypingExercisesPanel';
import { AdminVocabularyQuizPanel } from '@/components/AdminVocabularyQuizPanel';
import {
  AwardIcon,
  BookOpenIcon,
  BotIcon,
  ChecklistIcon,
  FileTextIcon,
  HeadphonesIcon,
  LayoutGridIcon,
  MicIcon,
  RepeatIcon,
  ShieldCheckIcon,
} from '@/components/UiIcons';
import styles from './AdminToolsHub.module.css';

type Tool = 'points' | 'typing' | 'shadowing' | 'vocabulary' | 'daily' | 'speaking' | 'telegram' | 'exam';

const tabs: Array<{ id: Tool; label: string; note: string }> = [
  { id: 'exam', label: 'Exam Controls', note: 'Mock, Speaking, retry' },
  { id: 'points', label: 'PTS', note: 'Berish va ayirish' },
  { id: 'typing', label: 'Typing', note: 'Exercise va sample' },
  { id: 'shadowing', label: 'Shadowing', note: 'Video va script' },
  { id: 'vocabulary', label: 'Vocabulary', note: 'Quiz va PTS' },
  { id: 'daily', label: 'Daily Tasks', note: '24 soatlik vazifalar' },
  { id: 'speaking', label: 'Speaking Inbox', note: 'Practice MP3 javoblar' },
  { id: 'telegram', label: 'Telegram', note: 'Xabar va scheduler' },
];

function ToolIcon({ id }: { id: Tool }) {
  const className = styles.toolIconSvg;
  if (id === 'points') return <AwardIcon className={className} />;
  if (id === 'typing') return <FileTextIcon className={className} />;
  if (id === 'shadowing') return <HeadphonesIcon className={className} />;
  if (id === 'vocabulary') return <BookOpenIcon className={className} />;
  if (id === 'daily') return <ChecklistIcon className={className} />;
  if (id === 'speaking') return <MicIcon className={className} />;
  if (id === 'telegram') return <BotIcon className={className} />;
  return <ShieldCheckIcon className={className} />;
}

export function AdminToolsHub() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Tool>('exam');
  const [topbarHost, setTopbarHost] = useState<HTMLElement | null>(null);
  const [bodyHost, setBodyHost] = useState<HTMLElement | null>(null);
  const [autoOpenMock, setAutoOpenMock] = useState(false);

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
    const onOpenTool = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (detail === 'full-mock') {
        setActive('exam');
        setOpen(true);
        setAutoOpenMock(true);
      }
    };
    window.addEventListener('ark:admin-open-tool', onOpenTool as EventListener);
    return () => window.removeEventListener('ark:admin-open-tool', onOpenTool as EventListener);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const trigger = topbarHost ? createPortal(
    <button className={styles.trigger} type="button" onClick={() => setOpen(true)}>
      <LayoutGridIcon />
      <span>Admin Tools</span>
    </button>,
    topbarHost,
  ) : null;

  const drawer = open && bodyHost ? createPortal(
    <div className={styles.backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-label="Admin tools">
        <header className={styles.header}>
          <div>
            <small>ARK CONTROL · OPERATIONS</small>
            <h2>Admin Tools</h2>
            <p>Imtihon, kontent va student boshqaruvlari bitta professional workspace ichida.</p>
          </div>
          <button className={styles.close} type="button" onClick={() => setOpen(false)} aria-label="Yopish">×</button>
        </header>

        <div className={styles.workspace}>
          <nav className={styles.sidebar} aria-label="Admin tool bo‘limlari">
            {tabs.map((tab) => (
              <button key={tab.id} type="button" className={active === tab.id ? styles.active : ''} onClick={() => setActive(tab.id)}>
                <span className={styles.toolIcon}><ToolIcon id={tab.id} /></span>
                <div><strong>{tab.label}</strong><small>{tab.note}</small></div>
              </button>
            ))}
          </nav>

          <main className={styles.content}>
            {active === 'points' && <AdminStudentPointsPanel />}
            {active === 'typing' && <AdminTypingExercisesPanel />}
            {active === 'shadowing' && <AdminShadowingPanel />}
            {active === 'vocabulary' && <AdminVocabularyQuizPanel />}
            {active === 'daily' && <AdminDailyTasksPanel />}
            {active === 'speaking' && <AdminSpeakingPracticeInbox />}
            {active === 'telegram' && <AdminTelegramSchedulerPanel />}
            {active === 'exam' && (
              <section className={styles.examPanel}>
                <div className={styles.examIntro}>
                  <small>EXAM OPERATIONS</small>
                  <h3>Imtihon boshqaruvlari</h3>
                  <p>Full Mock, Speaking Mock va studentga qayta urinish — barchasi shu yerda.</p>
                </div>

                <div className={styles.examGrid}>
                  <article>
                    <div className={styles.examCardTop}>
                      <span className={styles.examIndex}>01</span>
                      <span className={styles.examCardIcon}><ShieldCheckIcon /></span>
                    </div>
                    <div className={styles.examCopy}>
                      <strong>Full Mock</strong>
                      <small>Listening + Reading, Candidate ID, Mock Code va natijalar</small>
                    </div>
                    <div className={styles.launcherHost}><AdminMockManager autoOpen={autoOpenMock} onAutoOpened={() => setAutoOpenMock(false)} /></div>
                  </article>

                  <article>
                    <div className={styles.examCardTop}>
                      <span className={styles.examIndex}>02</span>
                      <span className={styles.examCardIcon}><MicIcon /></span>
                    </div>
                    <div className={styles.examCopy}>
                      <strong>Speaking Mock</strong>
                      <small>Instruction video va student recordinglari</small>
                    </div>
                    <div className={styles.launcherHost}><AdminSpeakingMockPanel /></div>
                  </article>

                  <article>
                    <div className={styles.examCardTop}>
                      <span className={styles.examIndex}>03</span>
                      <span className={styles.examCardIcon}><RepeatIcon /></span>
                    </div>
                    <div className={styles.examCopy}>
                      <strong>Qayta ruxsat</strong>
                      <small>Yakunlangan test uchun bitta yangi urinish berish</small>
                    </div>
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
