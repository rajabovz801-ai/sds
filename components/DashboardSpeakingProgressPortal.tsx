'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRightIcon, CheckCircleIcon, MicIcon } from '@/components/UiIcons';

type Progress = {
  completedCount: number;
  deliveredCount: number;
  totalQuestions: number;
  next: null | {
    day: number;
    dayTitle: string;
    topicId: string;
    topicTitle: string;
    questionIndex: number;
    questionText: string;
  };
};

export function DashboardSpeakingProgressPortal() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  useEffect(() => {
    const grid = document.querySelector<HTMLElement>('.studentDashboardGrid');
    if (!grid) return;

    let mount = grid.querySelector<HTMLElement>(':scope > .dashboardSpeakingProgressHost');
    if (!mount) {
      mount = document.createElement('div');
      mount.className = 'dashboardSpeakingProgressHost';
      grid.insertBefore(mount, grid.firstChild);
    }
    setHost(mount);

    return () => mount?.remove();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/speaking-recording', { cache: 'no-store', credentials: 'same-origin' })
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data?.ok || cancelled) return;
        setProgress({
          completedCount: Number(data.completedCount) || 0,
          deliveredCount: Number(data.deliveredCount) || 0,
          totalQuestions: Number(data.totalQuestions) || 400,
          next: data.next || null,
        });
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const percent = useMemo(() => {
    if (!progress?.totalQuestions) return 0;
    return Math.max(0, Math.min(100, Math.round((progress.completedCount / progress.totalQuestions) * 100)));
  }, [progress]);

  if (!host || !progress || progress.completedCount === 0) return null;

  const href = progress.next
    ? `/practice/speaking?day=${progress.next.day}&topic=${encodeURIComponent(progress.next.topicId)}&q=${progress.next.questionIndex + 1}`
    : '/practice/speaking';

  return createPortal(
    <section className="dashboardSpeakingProgress" aria-label="Speaking Practice progress">
      <div className="dashboardSpeakingProgressIcon"><MicIcon /></div>
      <div className="dashboardSpeakingProgressMain">
        <div className="dashboardSpeakingProgressTop">
          <div>
            <span>SPEAKING SPRINT</span>
            <h2>{progress.next ? 'Practice’ni davom ettiring' : 'Speaking Sprint tugallandi'}</h2>
          </div>
          <strong>{percent}%</strong>
        </div>
        <div className="dashboardSpeakingProgressBar"><i style={{ width: `${percent}%` }} /></div>
        <div className="dashboardSpeakingProgressMeta">
          <span><CheckCircleIcon /> {progress.completedCount}/{progress.totalQuestions} completed</span>
          {progress.next && <span>Day {String(progress.next.day).padStart(2, '0')} · {progress.next.topicTitle} · Q{progress.next.questionIndex + 1}</span>}
        </div>
      </div>
      <Link href={href} className="dashboardSpeakingProgressAction">
        <span>{progress.next ? 'Davom etish' : 'Ko‘rish'}</span><ArrowRightIcon />
      </Link>
    </section>,
    host,
  );
}
