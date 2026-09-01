'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpenIcon,
  HeadphonesIcon,
  MicIcon,
  PenToolIcon,
  TargetIcon,
} from '@/components/UiIcons';
import type { DashboardData } from '@/lib/dashboard';

type Props = {
  initialData: DashboardData;
};

type SkillKey = 'listening' | 'reading' | 'speaking' | 'writing';

const SEGMENTS = 28;

function latestRecentBand(data: DashboardData, skill: SkillKey) {
  return data.recentResults.find((item) => item.skill === skill && item.band !== null)?.band ?? null;
}

function SkillCard({
  skill,
  title,
  band,
  icon,
}: {
  skill: SkillKey;
  title: string;
  band: number | null;
  icon: React.ReactNode;
}) {
  const safeBand = band === null ? 0 : Math.max(0, Math.min(9, band));
  const filled = band === null ? 0 : Math.round((safeBand / 9) * SEGMENTS);

  return (
    <article className={`skillPerformanceCard skillPerformance-${skill}`}>
      <div className="skillPerformanceTop">
        <div className="skillPerformanceName">
          <span className="skillPerformanceIcon" aria-hidden="true">{icon}</span>
          <div>
            <strong>{title}</strong>
            <small>{band === null ? 'Natija kutilmoqda' : 'Current performance'}</small>
          </div>
        </div>
        <span className="skillPerformanceBand">Band <b>{band === null ? '—' : band.toFixed(1)}</b></span>
      </div>

      <div className="skillPerformanceSegments" aria-label={`${title} band ${band === null ? 'mavjud emas' : band.toFixed(1)}`}>
        {Array.from({ length: SEGMENTS }, (_, index) => (
          <i key={index} className={index < filled ? 'filled' : ''} />
        ))}
      </div>
    </article>
  );
}

export function DashboardSkillPerformancePortal({ initialData }: Props) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const grid = document.querySelector<HTMLElement>('.studentDashboardGrid');
    if (!grid) return;

    const shell = grid.closest<HTMLElement>('.studentDashboardShell');
    let mount = grid.querySelector<HTMLElement>(':scope > .dashboardSkillPerformanceHost');
    if (!mount) {
      mount = document.createElement('div');
      mount.className = 'dashboardSkillPerformanceHost';
      grid.insertBefore(mount, grid.firstChild);
    }

    shell?.classList.add('skillPerformanceMode');
    setHost(mount);

    return () => {
      shell?.classList.remove('skillPerformanceMode');
      mount?.remove();
    };
  }, []);

  // StudentDashboardClient already owns the live dashboard refresh cycle.
  // Reusing the server-provided snapshot here avoids a second identical
  // /api/dashboard request every minute from this presentation-only portal.
  const bands = useMemo(() => ({
    listening: initialData.listeningBand,
    reading: initialData.readingBand,
    speaking: latestRecentBand(initialData, 'speaking'),
    writing: latestRecentBand(initialData, 'writing'),
  }), [initialData]);

  if (!host) return null;

  return createPortal(
    <section className="studentPanel studentSkillPerformancePanel">
      <header className="studentSkillPerformanceHeader">
        <div>
          <span className="studentSkillPerformanceTitleIcon"><TargetIcon /></span>
          <div>
            <h2>Skill Performance</h2>
            <p>Har bir skill bo‘yicha joriy band ko‘rsatkichi</p>
          </div>
        </div>
        <span>LIVE</span>
      </header>

      <div className="skillPerformanceGrid">
        <SkillCard skill="listening" title="Listening" band={bands.listening} icon={<HeadphonesIcon />} />
        <SkillCard skill="reading" title="Reading" band={bands.reading} icon={<BookOpenIcon />} />
        <SkillCard skill="speaking" title="Speaking" band={bands.speaking} icon={<MicIcon />} />
        <SkillCard skill="writing" title="Writing" band={bands.writing} icon={<PenToolIcon />} />
      </div>
    </section>,
    host,
  );
}
