'use client';

import { MouseEvent, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArkLogoIcon } from '@/components/ArkLogoIcon';
import { ExamSectionsClient } from '@/components/ExamSectionsClient';
import { SkillLibraryClient } from '@/components/SkillLibraryClient';
import { StudentDashboardClient } from '@/components/StudentDashboardClient';
import { LayoutGridIcon, LogOutIcon } from '@/components/UiIcons';
import type { CloudTest, TestSkill, TestTrack } from '@/lib/cloudTests';
import type { DashboardData } from '@/lib/dashboard';
import type { StudentSummary } from '@/lib/auth/server-session';

type Track = 'ielts' | 'cefr';
type Skill = 'listening' | 'reading' | 'writing' | 'speaking';
type Screen =
  | { type: 'home' }
  | { type: 'track'; track: Track }
  | { type: 'skill'; track: Track; skill: Skill };

type AdminTestRow = {
  id: string;
  title: string;
  description: string | null;
  track: TestTrack;
  skill: TestSkill;
  status: 'published' | 'draft';
  file_name: string;
  file_path: string;
  duration_minutes?: number | null;
  created_at: string;
  updated_at: string;
};

const previewStudent: StudentSummary = {
  id: 'admin-preview',
  firstName: 'Admin',
  lastName: '',
};

const previewDashboard: DashboardData = {
  overallBand: 7.0,
  readingBand: 7.5,
  listeningBand: 7.0,
  weeklyStudyHours: 9.5,
  weeklyGoalHours: 14,
  testsCompleted: 18,
  dailyResults: [
    { label: 'Aug 14', value: 5.5, date: '2026-08-14' },
    { label: 'Aug 15', value: 6.0, date: '2026-08-15' },
    { label: 'Aug 16', value: 6.0, date: '2026-08-16' },
    { label: 'Aug 17', value: 6.5, date: '2026-08-17' },
    { label: 'Aug 18', value: 6.0, date: '2026-08-18' },
    { label: 'Aug 19', value: 6.5, date: '2026-08-19' },
    { label: 'Aug 20', value: 6.5, date: '2026-08-20' },
    { label: 'Aug 21', value: 7.0, date: '2026-08-21' },
    { label: 'Aug 22', value: 6.5, date: '2026-08-22' },
    { label: 'Aug 23', value: 7.0, date: '2026-08-23' },
    { label: 'Aug 24', value: 7.0, date: '2026-08-24' },
    { label: 'Aug 25', value: 7.5, date: '2026-08-25' },
    { label: 'Aug 26', value: 7.0, date: '2026-08-26' },
    { label: 'Aug 27', value: 7.5, date: '2026-08-27' },
  ],
  bandTrend: [
    { label: 'Wk 1', value: 5.5, date: '2026-07-09' },
    { label: 'Wk 2', value: 5.5, date: '2026-07-16' },
    { label: 'Wk 3', value: 6.0, date: '2026-07-23' },
    { label: 'Wk 4', value: 6.0, date: '2026-07-30' },
    { label: 'Wk 5', value: 6.5, date: '2026-08-06' },
    { label: 'Wk 6', value: 6.5, date: '2026-08-13' },
    { label: 'Wk 7', value: 7.0, date: '2026-08-20' },
    { label: 'Wk 8', value: 7.0, date: '2026-08-27' },
  ],
  recentResults: [
    { id: 'preview-1', title: 'Reading Mock Test', skill: 'reading', score: '34/40', band: 7.5, date: '2026-08-27T09:20:00+05:00' },
    { id: 'preview-2', title: 'Listening Mock Test', skill: 'listening', score: '32/40', band: 7.0, date: '2026-08-26T18:10:00+05:00' },
    { id: 'preview-3', title: 'Reading Practice', skill: 'reading', score: '31/40', band: 7.0, date: '2026-08-25T16:40:00+05:00' },
    { id: 'preview-4', title: 'Listening Practice', skill: 'listening', score: '30/40', band: 6.5, date: '2026-08-24T14:05:00+05:00' },
  ],
  achievements: [
    { id: 'first-test', title: 'First Test', description: 'Birinchi test yakunlandi', unlocked: true, progress: 100, icon: 'first-test' },
    { id: 'streak', title: '7-Day Streak', description: '7/7 kun ketma-ket', unlocked: true, progress: 100, icon: 'streak' },
    { id: 'reading-master', title: 'Reading Master', description: 'Reading 7.5 band', unlocked: true, progress: 100, icon: 'study-hero' },
    { id: 'listening-boost', title: 'Listening Boost', description: 'Listening 7.0 band', unlocked: true, progress: 100, icon: 'trophy' },
    { id: 'ten-tests', title: '10 Tests Finished', description: '18/10 test', unlocked: true, progress: 100, icon: 'ten-tests' },
    { id: 'accuracy-ace', title: 'Accuracy Ace', description: 'Eng yuqori aniqlik 92%', unlocked: true, progress: 92, icon: 'target' },
    { id: 'band-seven', title: 'Band 7 Reached', description: 'Overall 7.0', unlocked: true, progress: 100, icon: 'band7' },
    { id: 'perfect-section', title: 'Perfect Section', description: '90%+ aniqlik bilan yakunla', unlocked: false, progress: 92, icon: 'perfect-vocab' },
    { id: 'fast-finisher', title: 'Fast Finisher', description: 'Vaqt limitining 75%ida yakunla', unlocked: false, progress: 72, icon: 'fast-learner' },
    { id: 'consistency', title: 'Consistency Pro', description: '6/7 faol kun', unlocked: false, progress: 86, icon: 'quote-trophy' },
  ],
  unlockedAchievements: 7,
  studyStreak: 7,
  focusArea: 'Listening',
  nextTargetBand: 7.5,
  readingAverage: 7.5,
  listeningAverage: 7.0,
  lastUpdated: '2026-08-27T10:00:00+05:00',
};

const skillCopy: Record<Skill, { title: string; description: string }> = {
  listening: {
    title: 'IELTS Listening',
    description: 'Audio, real savol formatlari va to‘liq vaqt nazoratidagi Listening mocklari.',
  },
  reading: {
    title: 'IELTS Reading',
    description: 'Academic matnlar, real savol formatlari va to‘liq vaqt nazoratidagi Reading mocklari.',
  },
  writing: {
    title: 'IELTS Writing',
    description: 'Task 1 va Task 2 uchun real imtihon formatidagi Writing materiallari.',
  },
  speaking: {
    title: 'CEFR Speaking',
    description: 'Daraja asosidagi professional Speaking practice va mock topshiriqlari.',
  },
};

function mapAdminTest(row: AdminTestRow): CloudTest {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    track: row.track,
    skill: row.skill,
    status: row.status,
    fileName: row.file_name,
    filePath: row.file_path,
    durationMinutes: Number(row.duration_minutes) || 60,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function AdminMenuPreview() {
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>({ type: 'home' });
  const [tests, setTests] = useState<CloudTest[]>([]);
  const [loaded, setLoaded] = useState(false);
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

  async function loadTests() {
    if (loaded) return;
    try {
      const response = await fetch('/api/admin/tests', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) return;
      const rows = Array.isArray(body.tests) ? body.tests as AdminTestRow[] : [];
      setTests(rows.filter((test) => test.status === 'published').map(mapAdminTest));
      setLoaded(true);
    } catch {
      // Menu remains usable even if the library request fails.
    }
  }

  function openMenu() {
    setScreen({ type: 'home' });
    setOpen(true);
    void loadTests();
  }

  const activePath = screen.type === 'home'
    ? '/mock'
    : screen.type === 'track'
      ? `/${screen.track}`
      : `/${screen.track}/${screen.skill}`;

  const visibleTests = useMemo(() => {
    if (screen.type !== 'skill') return [];
    return tests.filter((test) => test.track === screen.track && test.skill === screen.skill);
  }, [screen, tests]);

  function navigateFromHref(href: string) {
    if (href === '/mock') {
      setScreen({ type: 'home' });
      return true;
    }
    if (href === '/ielts' || href === '/cefr') {
      setScreen({ type: 'track', track: href.slice(1) as Track });
      return true;
    }
    const skillMatch = href.match(/^\/(ielts|cefr)\/(listening|reading|writing|speaking)$/);
    if (skillMatch) {
      setScreen({ type: 'skill', track: skillMatch[1] as Track, skill: skillMatch[2] as Skill });
      return true;
    }
    const testMatch = href.match(/^\/test\/([^/?#]+)/);
    if (testMatch) {
      window.open(`/api/tests/${testMatch[1]}/content`, '_blank', 'noopener,noreferrer');
      return true;
    }
    return href === '/practice' || href === '/study-tools';
  }

  function interceptNavigation(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const anchor = target.closest<HTMLAnchorElement>('a[href]');
    if (!anchor) return;
    const href = anchor.getAttribute('href') || '';
    if (!href.startsWith('/')) return;
    if (navigateFromHref(href)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  const trigger = topbarHost ? createPortal(
    <button className="adminMainMenuButton" type="button" onClick={openMenu}>
      <LayoutGridIcon /> Asosiy menyu
    </button>,
    topbarHost,
  ) : null;

  const portal = open && bodyHost ? createPortal(
    <div className="adminStudentMenuPortal platformRoot" onClickCapture={interceptNavigation}>
      {screen.type === 'home' ? (
        <StudentDashboardClient
          student={previewStudent}
          initialData={previewDashboard}
          previewMode
          onExitPreview={() => setOpen(false)}
        />
      ) : (
        <>
          <div className="platformBarWrap">
            <header className="platformBar">
              <a href="/mock" className="platformBrand" aria-label="ARK Education platformasi">
                <span className="platformBrandMark"><ArkLogoIcon /></span>
                <span className="platformBrandText"><strong>ARK Education</strong><small>EXAM WORKSPACE</small></span>
              </a>

              <nav className="platformNav" aria-label="Platforma bo‘limlari">
                <a href="/mock" className={activePath === '/mock' ? 'active' : ''}>Dashboard</a>
                <a href="/ielts" className={activePath.startsWith('/ielts') ? 'active' : ''}>IELTS</a>
                <a href="/cefr" className={activePath.startsWith('/cefr') ? 'active' : ''}>CEFR</a>
                <a href="/practice">Practice <span className="soonDot">SOON</span></a>
                <a href="/study-tools">Tools <span className="soonDot">SOON</span></a>
              </nav>

              <div className="platformActions">
                <button className="adminBackToPanel" type="button" onClick={() => setOpen(false)} aria-label="Admin panelga qaytish" title="Admin panelga qaytish">
                  <LogOutIcon /><span>Admin panelga qaytish</span>
                </button>
                <div className="profileChip" title="Admin preview">
                  <span className="profileAvatar">AR</span>
                  <span className="profileLabel"><small>Admin</small><strong>Student menu preview</strong></span>
                </div>
              </div>
            </header>
          </div>

          <main className="platformMain">
            {screen.type === 'track' && <ExamSectionsClient track={screen.track} />}
            {screen.type === 'skill' && (
              <SkillLibraryClient
                track={screen.track}
                skill={screen.skill}
                title={skillCopy[screen.skill].title}
                description={skillCopy[screen.skill].description}
                tests={visibleTests}
              />
            )}
          </main>
        </>
      )}

      <style>{`
        .adminStudentMenuPortal{position:fixed;z-index:10000;inset:0;overflow:auto}
        .adminMainMenuButton{height:39px;padding:0 12px;border:1px solid rgba(255,255,255,.11);border-radius:12px;background:rgba(255,255,255,.06);color:#dae3ed;display:flex;align-items:center;gap:7px;font:800 8px/1 "Avenir Next","Segoe UI Variable","SF Pro Display","Helvetica Neue",Arial,sans-serif;cursor:pointer}
        .adminMainMenuButton svg{width:15px!important;height:15px!important}.adminMainMenuButton:hover{background:rgba(255,255,255,.11)}
        .adminBackToPanel{height:44px;padding:0 14px;border:1px solid rgba(16,35,63,.12);border-radius:13px;background:#10233f;color:#fff;display:flex;align-items:center;gap:8px;font:800 9px/1 "Avenir Next","Segoe UI Variable","SF Pro Display","Helvetica Neue",Arial,sans-serif;white-space:nowrap;cursor:pointer;box-shadow:0 10px 22px rgba(16,35,63,.12);transition:.18s ease}
        .adminBackToPanel svg{width:15px!important;height:15px!important}.adminBackToPanel:hover{background:#193858;transform:translateY(-1px)}
        @media(max-width:780px){.adminBackToPanel{width:42px;height:42px;padding:11px}.adminBackToPanel span{display:none}}
      `}</style>
    </div>,
    bodyHost,
  ) : null;

  return <>{trigger}{portal}</>;
}
