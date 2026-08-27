'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenIcon,
  HeadphonesIcon,
  LayoutGridIcon,
  MicIcon,
  PenToolIcon,
  SparklesIcon,
} from '@/components/UiIcons';
import { ExamSectionsClient } from '@/components/ExamSectionsClient';
import { SkillLibraryClient } from '@/components/SkillLibraryClient';
import type { CloudTest, TestSkill, TestTrack } from '@/lib/cloudTests';

type Skill = 'listening' | 'reading' | 'writing' | 'speaking';
type Screen =
  | { type: 'home' }
  | { type: 'ielts' }
  | { type: 'cefr' }
  | { type: 'library'; track: TestTrack; skill: TestSkill };

type AdminTestRow = {
  id: string;
  title: string;
  description: string;
  track: TestTrack;
  skill: TestSkill;
  status: 'published' | 'draft';
  duration_minutes?: number;
  file_name: string;
  file_path: string;
  daily_task_enabled?: boolean;
  daily_task_points?: number;
  created_at: string;
  updated_at: string;
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
    dailyTaskEnabled: Boolean(row.daily_task_enabled),
    dailyTaskPoints: Number(row.daily_task_points) || 20,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function AdminMenuPreview() {
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<Screen>({ type: 'home' });
  const [tests, setTests] = useState<CloudTest[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    fetch('/api/admin/tests', { cache: 'no-store' })
      .then((response) => response.json())
      .then((body) => {
        if (cancelled) return;
        setTests(((body.tests || []) as AdminTestRow[]).map(mapAdminTest));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => { cancelled = true; };
  }, [loaded, open]);

  const published = useMemo(() => tests.filter((test) => test.status === 'published'), [tests]);

  function openLibrary(track: TestTrack, skill: TestSkill) {
    setScreen({ type: 'library', track, skill });
  }

  const content = (() => {
    if (screen.type === 'ielts') {
      return <ExamSectionsClient track="ielts" title="IELTS" description="Academic IELTS bo‘limlari" preview onOpenSkill={(skill) => openLibrary('ielts', skill)} />;
    }
    if (screen.type === 'cefr') {
      return <ExamSectionsClient track="cefr" title="CEFR" description="CEFR practice bo‘limlari" preview onOpenSkill={(skill) => openLibrary('cefr', skill)} />;
    }
    if (screen.type === 'library') {
      const key = screen.skill as Skill;
      const copy = skillCopy[key] || { title: `${screen.track.toUpperCase()} ${screen.skill}`, description: 'Test kutubxonasi.' };
      return (
        <SkillLibraryClient
          track={screen.track}
          skill={screen.skill}
          title={copy.title}
          description={copy.description}
          tests={published.filter((test) => test.track === screen.track && test.skill === screen.skill)}
          variant="sidebar"
        />
      );
    }
    return (
      <div className="adminPreviewHome">
        <div className="adminPreviewHero"><span><SparklesIcon /> STUDENT MENU PREVIEW</span><h2>Student menyusini tekshiring</h2><p>Admin paneldan chiqmasdan IELTS va CEFR bo‘limlarining student ko‘rinishini ko‘ring.</p></div>
        <div className="adminPreviewChoices">
          <button onClick={() => setScreen({ type: 'ielts' })} type="button"><span><HeadphonesIcon /></span><div><small>EXAM TRACK</small><strong>IELTS</strong><p>Listening, Reading, Writing va boshqa IELTS materiallari.</p></div><ArrowRightIcon /></button>
          <button onClick={() => setScreen({ type: 'cefr' })} type="button"><span><BookOpenIcon /></span><div><small>LEVEL TRACK</small><strong>CEFR</strong><p>CEFR speaking va boshqa level materiallari.</p></div><ArrowRightIcon /></button>
        </div>
      </div>
    );
  })();

  if (typeof document === 'undefined') return null;

  return (
    <>
      <button className="adminPreviewLauncher" type="button" onClick={() => setOpen(true)}><LayoutGridIcon /><span>Student menu preview</span></button>
      {open ? createPortal(
        <div className="adminPreviewOverlay" role="dialog" aria-modal="true">
          <div className="adminPreviewFrame">
            <header><button type="button" onClick={() => screen.type === 'home' ? setOpen(false) : setScreen({ type: 'home' })}><ArrowLeftIcon /> {screen.type === 'home' ? 'Yopish' : 'Orqaga'}</button><strong>STUDENT PREVIEW</strong><button type="button" onClick={() => setOpen(false)}>×</button></header>
            <main>{content}</main>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
