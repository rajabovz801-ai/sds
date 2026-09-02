'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ArrowRightIcon, BookOpenIcon, HeadphonesIcon, MicIcon } from '@/components/UiIcons';
import type { DashboardData } from '@/lib/dashboard';

type Props = { initialData: DashboardData };

function destination(data: DashboardData) {
  const focus = String(data.focusArea || '').toLowerCase();
  if (focus === 'listening') return { href: '/ielts/listening', title: 'Listening davom ettirish', icon: <HeadphonesIcon /> };
  if (focus === 'reading') return { href: '/ielts/reading', title: 'Reading davom ettirish', icon: <BookOpenIcon /> };
  return { href: '/practice/speaking', title: 'Speaking Practice davom ettirish', icon: <MicIcon /> };
}

export function DashboardContinuePracticePortal({ initialData }: Props) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const target = useMemo(() => destination(initialData), [initialData]);
  const latest = initialData.recentResults[0] || null;

  useEffect(() => {
    const grid = document.querySelector<HTMLElement>('.studentDashboardGrid');
    if (!grid) return;
    let mount = grid.querySelector<HTMLElement>(':scope > .dashboardContinuePracticeHost');
    if (!mount) {
      mount = document.createElement('div');
      mount.className = 'dashboardContinuePracticeHost';
      const skillHost = grid.querySelector(':scope > .dashboardSkillPerformanceHost');
      if (skillHost?.nextSibling) grid.insertBefore(mount, skillHost.nextSibling);
      else grid.appendChild(mount);
    }
    setHost(mount);
    return () => mount?.remove();
  }, []);

  if (!host) return null;

  return createPortal(
    <section className="studentPanel dashboardContinuePracticePanel">
      <div className="dashboardContinuePracticeCopy">
        <small>CONTINUE PRACTICE</small>
        <h2>{target.title}</h2>
        <p>
          {latest
            ? `Oxirgi natija: ${latest.title} · ${latest.band === null ? latest.score : `Band ${latest.band.toFixed(1)}`}. Keyingi mashqni shu yerdan davom ettiring.`
            : 'Birinchi natijani yaratish uchun tavsiya etilgan skilldan boshlang.'}
        </p>
      </div>
      <Link href={target.href} className="dashboardContinuePracticeAction">
        <span aria-hidden="true">{target.icon}</span>
        <strong>Davom etish</strong>
        <i><ArrowRightIcon /></i>
      </Link>
    </section>,
    host,
  );
}
