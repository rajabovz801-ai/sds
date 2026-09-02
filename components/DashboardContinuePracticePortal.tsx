'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRightIcon, ClockIcon, SparklesIcon } from '@/components/UiIcons';

type ActivePractice = {
  sessionId: string;
  testId: string;
  title: string;
  skill: string;
  track: string;
  startedAt: string;
  expiresAt: string;
  remainingSeconds: number;
  href: string;
};

function formatRemaining(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(value / 60);
  const secs = value % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export function DashboardContinuePracticePortal() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [active, setActive] = useState<ActivePractice | null>(null);
  const [tick, setTick] = useState(Date.now());

  useEffect(() => {
    const grid = document.querySelector<HTMLElement>('.studentDashboardGrid');
    if (!grid) return;
    let mount = grid.querySelector<HTMLElement>(':scope > .dashboardContinuePracticeHost');
    if (!mount) {
      mount = document.createElement('div');
      mount.className = 'dashboardContinuePracticeHost';
      grid.insertBefore(mount, grid.firstChild);
    }
    setHost(mount);
    return () => mount?.remove();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/dashboard/continue', { cache: 'no-store', credentials: 'same-origin' })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (cancelled || !response.ok || !data?.ok) return;
        setActive(data.active || null);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  const remaining = useMemo(() => {
    if (!active) return 0;
    return Math.max(0, Math.floor((new Date(active.expiresAt).getTime() - tick) / 1000));
  }, [active, tick]);

  if (!host || !active || remaining <= 0) return null;

  return createPortal(
    <section className="dashboardContinuePractice" aria-label="Active practice">
      <div className="dashboardContinuePracticeIcon"><SparklesIcon /></div>
      <div className="dashboardContinuePracticeCopy">
        <span>ACTIVE PRACTICE · {active.skill.toUpperCase()}</span>
        <h2>{active.title}</h2>
        <p><ClockIcon /> {formatRemaining(remaining)} vaqt qoldi · mavjud session davom ettiriladi</p>
      </div>
      <Link href={active.href} className="dashboardContinuePracticeAction">
        <span>Davom etish</span><ArrowRightIcon />
      </Link>
    </section>,
    host,
  );
}
