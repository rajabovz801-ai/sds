'use client';

import { MouseEvent, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArkLogoIcon } from '@/components/ArkLogoIcon';
import { ExamSectionsClient } from '@/components/ExamSectionsClient';
import { SkillLibraryClient } from '@/components/SkillLibraryClient';
import { StudentDashboardClient } from '@/components/StudentDashboardClient';
import { LayoutGridIcon, LogOutIcon, UserIcon } from '@/components/UiIcons';
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

type PreviewStudent = StudentSummary & { telegramId?: string };
type PreviewResponse = {
  students: Array<{ id: string; firstName: string; lastName: string; telegramId: string }>;
  student: PreviewStudent | null;
  dashboard: DashboardData | null;
  error?: string;
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
  const [students, setStudents] = useState<PreviewResponse['students']>([]);
  const [student, setStudent] = useState<PreviewStudent | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
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
      if (!response.ok) return;
      const rows = Array.isArray(body.tests) ? body.tests as AdminTestRow[] : [];
      setTests(rows
        .filter((test) => test.status === 'published' && !test.mock_only)
        .map(mapAdminTest));
      setTestsLoaded(true);
    } catch {
      // Student menu remains usable if test library refresh fails.
    }
  }

  async function loadStudentPreview(studentId?: string) {
    setLoadingPreview(true);
    setPreviewError('');
    try {
      const suffix = studentId ? `?studentId=${encodeURIComponent(studentId)}` : '';
      const response = await fetch(`/api/admin/student-preview${suffix}`, { cache: 'no-store' });
      const body = await response.json() as PreviewResponse;
      if (!response.ok) throw new Error(body.error || 'Student preview yuklanmadi.');
      setStudents(body.students || []);
      setStudent(body.student);
      setDashboard(body.dashboard);
      setSelectedId(body.student?.id || '');
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Student preview yuklanmadi.');
      setStudent(null);
      setDashboard(null);
    } finally {
      setLoadingPreview(false);
    }
  }

  function openMenu() {
    setScreen({ type: 'home' });
    setOpen(true);
    void Promise.all([loadTests(), loadStudentPreview(selectedId || undefined)]);
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
    if (['/practice', '/study-tools', '/daily-tasks', '/leaderboard'].includes(href)) {
      setPreviewError('Bu bo‘lim student sessiyasiga bog‘langan. Admin preview ichida ma’lumot o‘zgartirilmaydi.');
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
      <div className="adminPreviewToolbar">
        <div className="adminPreviewLabel"><UserIcon /><span><small>REAL STUDENT VIEW</small><strong>{student ? `${student.firstName} ${student.lastName}` : 'Student tanlanmagan'}</strong></span></div>
        <label>
          <span>Student</span>
          <select
            value={selectedId}
            disabled={loadingPreview || !students.length}
            onChange={(event) => void loadStudentPreview(event.target.value)}
          >
            {students.map((item) => <option key={item.id} value={item.id}>{item.firstName} {item.lastName}</option>)}
          </select>
        </label>
        <button type="button" onClick={() => setOpen(false)}><LogOutIcon /><span>Admin panel</span></button>
      </div>

      {previewError && <div className="adminPreviewNotice">{previewError}</div>}

      {loadingPreview && !dashboard ? (
        <div className="adminPreviewLoading">Student dashboard yuklanmoqda…</div>
      ) : screen.type === 'home' && student && dashboard ? (
        <StudentDashboardClient
          student={student}
          initialData={dashboard}
          previewMode
          onExitPreview={() => setOpen(false)}
        />
      ) : screen.type !== 'home' ? (
        <>
          <div className="platformBarWrap adminPreviewPlatformBar">
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
                <div className="profileChip" title="Admin preview">
                  <span className="profileAvatar">{student?.firstName?.[0] || 'A'}{student?.lastName?.[0] || ''}</span>
                  <span className="profileLabel"><small>Preview</small><strong>{student ? `${student.firstName} ${student.lastName}` : 'Student'}</strong></span>
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
      ) : (
        <div className="adminPreviewLoading">Faol student topilmadi.</div>
      )}

      <style>{`
        .adminStudentMenuPortal{position:fixed;z-index:10000;inset:0;overflow:auto;background:#f5f6f8}
        .adminMainMenuButton{font-family:var(--font-poppins),Poppins,Arial,sans-serif!important}
        .adminPreviewToolbar{position:fixed;z-index:10040;top:12px;right:14px;display:flex;align-items:center;gap:8px;padding:7px;border:1px solid #e1e4e8;border-radius:13px;background:rgba(255,255,255,.96);box-shadow:0 12px 32px rgba(17,19,24,.12);backdrop-filter:blur(12px)}
        .adminPreviewLabel{display:flex;align-items:center;gap:8px;padding:0 6px;color:#17191e}.adminPreviewLabel>svg{width:17px;height:17px;fill:none;stroke:currentColor}.adminPreviewLabel small{display:block;color:#9a7a00;font-size:7px;font-weight:800;letter-spacing:.09em}.adminPreviewLabel strong{display:block;margin-top:1px;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:9px}
        .adminPreviewToolbar label{display:flex;align-items:center;gap:6px}.adminPreviewToolbar label>span{color:#8b919b;font-size:7px;font-weight:800}.adminPreviewToolbar select{height:34px;max-width:190px;border:1px solid #dfe2e6;border-radius:9px;background:#f8f9fa;color:#272b31;padding:0 28px 0 9px;font:650 9px/1 var(--font-poppins),Poppins,Arial,sans-serif}
        .adminPreviewToolbar button{height:34px;padding:0 10px;border:0;border-radius:9px;background:#0f1116;color:#fff;display:flex;align-items:center;gap:6px;font:750 8px/1 var(--font-poppins),Poppins,Arial,sans-serif;cursor:pointer}.adminPreviewToolbar button svg{width:14px;height:14px;fill:none;stroke:currentColor}
        .adminPreviewNotice{position:fixed;z-index:10041;right:14px;top:70px;max-width:380px;padding:10px 12px;border:1px solid #eddba2;border-radius:10px;background:#fff9df;color:#725900;font:650 9px/1.45 var(--font-poppins),Poppins,Arial,sans-serif}
        .adminPreviewLoading{min-height:100vh;display:grid;place-items:center;color:#7f8791;font:650 11px/1.5 var(--font-poppins),Poppins,Arial,sans-serif}
        .adminPreviewPlatformBar{padding-top:60px}
        @media(max-width:760px){.adminPreviewToolbar{left:8px;right:8px;top:8px}.adminPreviewLabel{display:none}.adminPreviewToolbar label{flex:1}.adminPreviewToolbar select{width:100%;max-width:none}.adminPreviewToolbar button span{display:none}.adminPreviewNotice{left:8px;right:8px;top:58px;max-width:none}}
      `}</style>
    </div>,
    bodyHost,
  ) : null;

  return <>{trigger}{portal}</>;
}
