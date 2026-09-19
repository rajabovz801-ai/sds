'use client';

import { MouseEvent, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArkLogoIcon } from '@/components/ArkLogoIcon';
import { ExamSectionsClient } from '@/components/ExamSectionsClient';
import { SkillLibraryClient } from '@/components/SkillLibraryClient';
import { StudentDashboardClient } from '@/components/StudentDashboardClient';
import { LayoutGridIcon } from '@/components/UiIcons';
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
  mock_only?: boolean | null;
  file_name: string;
  file_path: string;
  duration_minutes?: number | null;
  created_at: string;
  updated_at: string;
};

const adminUser: StudentSummary = {
  id: 'admin-preview',
  firstName: 'Admin',
  lastName: '',
  avatarUrl: null,
};

function blankPoints(count: number, prefix: string) {
  return Array.from({ length: count }, (_, index) => ({
    label: `${prefix} ${index + 1}`,
    value: null,
    date: new Date(Date.now() - (count - index - 1) * 86_400_000).toISOString(),
  }));
}

const adminDashboard: DashboardData = {
  overallBand: null,
  readingBand: null,
  listeningBand: null,
  weeklyStudyHours: 0,
  weeklyGoalHours: 14,
  testsCompleted: 0,
  dailyResults: blankPoints(14, 'D'),
  bandTrend: blankPoints(8, 'Wk'),
  recentResults: [],
  achievements: [
    { id: 'first-test', title: 'First Test', description: 'Student view preview', unlocked: false, progress: 0, icon: 'first-test' },
    { id: 'streak', title: '7-Day Streak', description: 'Student view preview', unlocked: false, progress: 0, icon: 'streak' },
    { id: 'reading-master', title: 'Reading Master', description: 'Student view preview', unlocked: false, progress: 0, icon: 'study-hero' },
    { id: 'listening-boost', title: 'Listening Boost', description: 'Student view preview', unlocked: false, progress: 0, icon: 'trophy' },
    { id: 'ten-tests', title: '10 Tests Finished', description: 'Student view preview', unlocked: false, progress: 0, icon: 'ten-tests' },
    { id: 'accuracy-ace', title: 'Accuracy Ace', description: 'Student view preview', unlocked: false, progress: 0, icon: 'target' },
    { id: 'band-seven', title: 'Band 7 Reached', description: 'Student view preview', unlocked: false, progress: 0, icon: 'band7' },
    { id: 'perfect-section', title: 'Perfect Section', description: 'Student view preview', unlocked: false, progress: 0, icon: 'perfect-vocab' },
    { id: 'fast-finisher', title: 'Fast Finisher', description: 'Student view preview', unlocked: false, progress: 0, icon: 'fast-learner' },
    { id: 'consistency', title: 'Consistency Pro', description: 'Student view preview', unlocked: false, progress: 0, icon: 'quote-trophy' },
  ],
  unlockedAchievements: 0,
  studyStreak: 0,
  focusArea: 'Reading',
  nextTargetBand: null,
  readingAverage: null,
  listeningAverage: null,
  lastUpdated: new Date().toISOString(),
};

const skillCopy: Record<Skill, { title: string; description: string }> = {
  listening: { title: 'IELTS Listening', description: 'Audio, real savol formatlari va to‘liq vaqt nazoratidagi Listening mocklari.' },
  reading: { title: 'IELTS Reading', description: 'Academic matnlar, real savol formatlari va to‘liq vaqt nazoratidagi Reading mocklari.' },
  writing: { title: 'IELTS Writing', description: 'Task 1 va Task 2 uchun real imtihon formatidagi Writing materiallari.' },
  speaking: { title: 'CEFR Speaking', description: 'Daraja asosidagi professional Speaking practice va mock topshiriqlari.' },
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
  const [testsLoaded, setTestsLoaded] = useState(false);
  const [previewError, setPreviewError] = useState('');
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
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onEscape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  async function loadTests() {
    if (testsLoaded) return;
    try {
      const response = await fetch('/api/admin/tests', { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Testlar yuklanmadi.');
      const rows = Array.isArray(body.tests) ? body.tests as AdminTestRow[] : [];
      setTests(rows
        .filter((test) => test.status === 'published' && !test.mock_only)
        .map(mapAdminTest));
      setTestsLoaded(true);
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Testlar yuklanmadi.');
    }
  }

  function openMenu() {
    setPreviewError('');
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
      setPreviewError('');
      return true;
    }
    if (href === '/ielts' || href === '/cefr') {
      setScreen({ type: 'track', track: href.slice(1) as Track });
      setPreviewError('');
      return true;
    }
    const skillMatch = href.match(/^\/(ielts|cefr)\/(listening|reading|writing|speaking)$/);
    if (skillMatch) {
      setScreen({ type: 'skill', track: skillMatch[1] as Track, skill: skillMatch[2] as Skill });
      setPreviewError('');
      return true;
    }
    const testMatch = href.match(/^\/test\/([^/?#]+)/);
    if (testMatch) {
      window.open(`/api/tests/${testMatch[1]}/content?preview=1`, '_blank', 'noopener,noreferrer');
      return true;
    }
    if (['/practice', '/study-tools', '/daily-tasks', '/leaderboard'].includes(href)) {
      setPreviewError('Bu student funksiyasi. Admin ko‘rinishida faqat interfeys preview qilinadi.');
      return true;
    }
    return false;
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
      <LayoutGridIcon /><span>Asosiy menyu</span>
    </button>,
    topbarHost,
  ) : null;

  const portal = open && bodyHost ? createPortal(
    <div className="adminStudentMenuPortal platformRoot" onClickCapture={interceptNavigation}>
      {previewError && <div className="adminPreviewNotice">{previewError}</div>}

      {screen.type === 'home' ? (
        <StudentDashboardClient
          student={adminUser}
          initialData={adminDashboard}
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
                <div className="profileChip" title="Admin user preview">
                  <span className="profileAvatar">AD</span>
                  <span className="profileLabel"><small>ADMIN</small><strong>Admin</strong></span>
                </div>
                <button className="adminPreviewReturn" type="button" onClick={() => setOpen(false)}>Admin panel</button>
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
        .adminStudentMenuPortal{position:fixed;z-index:10000;inset:0;overflow:auto;background:#f5f6f8}
        .adminMainMenuButton{font-family:var(--font-poppins),Poppins,Arial,sans-serif!important}
        .adminPreviewNotice{position:fixed;z-index:10041;right:16px;top:72px;max-width:360px;padding:10px 12px;border:1px solid #ecd98c;border-radius:10px;background:#fff9d9;color:#6e5600;font:650 9px/1.45 var(--font-poppins),Poppins,Arial,sans-serif;box-shadow:0 10px 28px rgba(17,19,24,.08)}
        .adminPreviewReturn{height:34px;padding:0 11px;border:1px solid #dfe2e6;border-radius:9px;background:#0f1116;color:#fff;font:750 8px/1 var(--font-poppins),Poppins,Arial,sans-serif;cursor:pointer}
        @media(max-width:760px){.adminPreviewNotice{left:8px;right:8px;top:60px;max-width:none}.adminPreviewReturn{padding:0 9px}}
      `}</style>
    </div>,
    bodyHost,
  ) : null;

  return <>{trigger}{portal}</>;
}
