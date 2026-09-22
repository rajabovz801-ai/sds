'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  BookOpenIcon,
  HeadphonesIcon,
  TargetIcon,
} from '@/components/UiIcons';
import type { ProgressAttempt } from '@/lib/progressAttempts';

type Tab = 'reading' | 'listening';

const tabs = [
  { id: 'reading', label: 'Reading', icon: BookOpenIcon },
  { id: 'listening', label: 'Listening', icon: HeadphonesIcon },
] as const;

function durationLabel(seconds: number) {
  if (!seconds) return '< 1 min';
  const minutes = Math.max(1, Math.round(seconds / 60));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function StudentProgressClient({ attempts }: { attempts: ProgressAttempt[] }) {
  const [tab, setTab] = useState<Tab>('reading');
  const [page, setPage] = useState(1);
  const perPage = 8;

  const filtered = useMemo(
    () => attempts.filter((item) => item.skill === tab),
    [attempts, tab],
  );

  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, pages);
  const visible = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  return (
    <div className="attemptProgress">
      <div className="attemptTabs" role="tablist" aria-label="Progress skill">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={tab === id ? 'active' : ''}
            onClick={() => {
              setTab(id);
              setPage(1);
            }}
          >
            <Icon />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <section className="attemptPanel">
        <header className="attemptPanelHead">
          <div>
            <h1><span><TargetIcon /></span>Your attempts</h1>
            <p>You have completed <strong>{filtered.length}</strong> {tab} attempts in total.</p>
          </div>
          <div className="attemptPager">
            <span>Page {safePage} of {pages}</span>
            <button type="button" disabled={safePage <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ArrowLeftIcon /></button>
            <button type="button" disabled={safePage >= pages} onClick={() => setPage((value) => Math.min(pages, value + 1))}><ArrowRightIcon /></button>
          </div>
        </header>

        {visible.length ? (
          <div className="attemptList">
            {visible.map((item) => (
              <article className="attemptCard" key={item.id}>
                <div className="attemptMain">
                  <div className="attemptTitleRow">
                    <strong>{item.title}</strong>
                    <span className="attemptPart">{item.collection === 'real-exam' ? 'Real Exam' : item.collection === 'cambridge' ? 'Cambridge' : 'Gold'} · {item.part}</span>
                    <span className="attemptScore">{item.band !== null ? `Band ${item.band.toFixed(1)}` : item.percentage === null ? '—' : `${item.percentage}%`}</span>
                  </div>
                  <small>Attempt ID: #{item.id.slice(0, 8)}</small>
                  <div className="attemptMeta">
                    <span>◫ {item.correctCount}/{item.maxScore ?? 0} correct</span>
                    <i>•</i>
                    <span>◷ Completed at {dateLabel(item.completedAt)}</span>
                    <i>•</i>
                    <span>◷ Time spent: {durationLabel(item.durationSeconds)}</span>
                  </div>
                </div>

                <Link className="attemptReview" href={`/progress/${item.id}`}>
                  <span>▥</span> Review attempt
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="attemptEmpty">
            <span>{tab === 'reading' ? <BookOpenIcon /> : <HeadphonesIcon />}</span>
            <strong>No attempts yet</strong>
            <small>Your completed {tab} tests will appear here.</small>
          </div>
        )}
      </section>
    </div>
  );
}
