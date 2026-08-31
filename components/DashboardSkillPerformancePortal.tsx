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
  const [data, setData] = useState(initialData);

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

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const response = await fetch('/api/dashboard', { cache: 'no-store' });
        if (!response.ok) return;
        const next = await response.json() as DashboardData;
        if (!cancelled) setData(next);
      } catch {
        // Keep the last good snapshot visible if the live refresh is temporarily unavailable.
      }
    }

    const interval = window.setInterval(refresh, 10000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const bands = useMemo(() => ({
    listening: data.listeningBand,
    reading: data.readingBand,
    speaking: latestRecentBand(data, 'speaking'),
    writing: latestRecentBand(data, 'writing'),
  }), [data]);

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
