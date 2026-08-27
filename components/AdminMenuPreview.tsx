'use client';

import { MouseEvent, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArkLogoIcon } from '@/components/ArkLogoIcon';
import { ExamSectionsClient } from '@/components/ExamSectionsClient';
import { MockTrackChoiceClient } from '@/components/MockTrackChoiceClient';
import { SkillLibraryClient } from '@/components/SkillLibraryClient';
import { LayoutGridIcon, LogOutIcon } from '@/components/UiIcons';
import type { CloudTest, TestSkill, TestTrack } from '@/lib/cloudTests';
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
      <div className="platformBarWrap">
        <header className="platformBar">
          <a href="/mock" className="platformBrand" aria-label="ARK Education platformasi">
            <span className="platformBrandMark"><ArkLogoIcon /></span>
            <span className="platformBrandText"><strong>ARK Education</strong><small>EXAM WORKSPACE</small></span>
          </a>

          <nav className="platformNav" aria-label="Platforma bo‘limlari">
            <a href="/mock" className={activePath === '/mock' ? 'active' : ''}>Boshqaruv</a>
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
        {screen.type === 'home' && <MockTrackChoiceClient student={previewStudent} />}
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
