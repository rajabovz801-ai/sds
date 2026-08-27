'use client';

import type { SVGProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FlameIcon } from '@/components/UiIcons';
import styles from '@/components/LeaderboardClient.module.css';

type StudentItem = { id: string; firstName: string; lastName: string };
type AttemptItem = { studentId: string; rawScore: number; maxScore: number; submittedAt: string };
type Period = 'week' | 'month' | 'all';
type IconProps = SVGProps<SVGSVGElement>;

type Props = {
  currentStudentId: string;
  students: StudentItem[];
  attempts: AttemptItem[];
};

type RankedRow = StudentItem & {
  completedTests: number;
  averageScore: number;
  bestScore: number;
  streak: number;
  rank: number;
  lastActivity: string;
};

function TrophyPremiumIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M8 4h8v3.6c0 3-1.7 5.4-4 5.4s-4-2.4-4-5.4V4Z" />
      <path d="M8 6H4v1.5C4 10 5.6 11.7 8.2 12M16 6h4v1.5c0 2.5-1.6 4.2-4.2 4.5M12 13v4M8.5 21h7M10 17h4v4h-4Z" />
      <path d="m12 6.2.7 1.5 1.7.2-1.2 1.2.3 1.7-1.5-.8-1.5.8.3-1.7-1.2-1.2 1.7-.2.7-1.5Z" />
    </svg>
  );
}

function CrownIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="m4 7 4.1 4L12 5l3.9 6L20 7l-1.4 10H5.4L4 7Z" />
      <path d="M6 20h12M7 14h10" />
    </svg>
  );
}

function TrendIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M4 17 9 12l3 3 7-8" />
      <path d="M15 7h4v4" />
      <circle cx="4" cy="17" r="1" />
      <circle cx="9" cy="12" r="1" />
      <circle cx="12" cy="15" r="1" />
    </svg>
  );
}

function CalendarPremiumIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M7 3v4M17 3v4M3 10h18" />
      <path d="m9 15 2 2 4-4" />
    </svg>
  );
}

function MedalPremiumIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <circle cx="12" cy="9" r="5" />
      <path d="m9 13.3-1 7.2 4-2.2 4 2.2-1-7.2" />
      <path d="m12 6.3.8 1.6 1.8.3-1.3 1.3.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.3 1.8-.3.8-1.6Z" />
    </svg>
  );
}

function UsersIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 6.5a2.5 2.5 0 0 1 0 5M17 14c2.4.3 4 1.9 4 4.5" />
    </svg>
  );
}

function initials(firstName: string, lastName: string) {
  return `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.toUpperCase() || 'AR';
}

function startForPeriod(period: Period) {
  const now = new Date();
  if (period === 'all') return null;
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const day = now.getDay() || 7;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - day + 1);
  return start.getTime();
}

function dayKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function streakFor(studentId: string, attempts: AttemptItem[]) {
  const days = [...new Set(attempts.filter((item) => item.studentId === studentId).map((item) => dayKey(item.submittedAt)))].sort().reverse();
  if (!days.length) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const latest = new Date(`${days[0]}T00:00:00`);
  if (latest.getTime() !== today.getTime() && latest.getTime() !== yesterday.getTime()) return 0;
  let streak = 1;
  let cursor = latest;
  for (let index = 1; index < days.length; index += 1) {
    const expected = new Date(cursor);
    expected.setDate(cursor.getDate() - 1);
    const actual = new Date(`${days[index]}T00:00:00`);
    if (actual.getTime() !== expected.getTime()) break;
    streak += 1;
    cursor = actual;
  }
  return streak;
}

function formatLastActivity(value: string) {
  const date = new Date(value);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const time = new Intl.DateTimeFormat('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
  if (target === today) return `Bugun, ${time}`;
  if (target === today - 86_400_000) return `Kecha, ${time}`;
  return new Intl.DateTimeFormat('uz-UZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

export function LeaderboardClient({ currentStudentId, students, attempts }: Props) {
  const [period, setPeriod] = useState<Period>('week');
  const router = useRouter();

  useEffect(() => {
    const refresh = window.setInterval(() => router.refresh(), 12000);
    return () => window.clearInterval(refresh);
  }, [router]);

  const rows = useMemo<RankedRow[]>(() => {
    const start = startForPeriod(period);
    const filtered = attempts.filter((item) => start === null || new Date(item.submittedAt).getTime() >= start);
    return students
      .map((student) => {
        const own = filtered.filter((item) => item.studentId === student.id && item.maxScore > 0);
        const scores = own.map((item) => (item.rawScore / item.maxScore) * 100).filter(Number.isFinite);
        if (!scores.length) return null;
        const lastActivity = own.reduce((latest, item) => new Date(item.submittedAt).getTime() > new Date(latest).getTime() ? item.submittedAt : latest, own[0].submittedAt);
        return {
          ...student,
          completedTests: scores.length,
          averageScore: scores.reduce((sum, value) => sum + value, 0) / scores.length,
          bestScore: Math.max(...scores),
          streak: streakFor(student.id, attempts),
          rank: 0,
          lastActivity,
        };
      })
      .filter((item): item is RankedRow => Boolean(item))
      .sort((a, b) => b.averageScore - a.averageScore || b.completedTests - a.completedTests || b.bestScore - a.bestScore || new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }, [attempts, period, students]);

  const podium = rows.slice(0, 3);
  const podiumDisplay = podium.length >= 3 ? [podium[1], podium[0], podium[2]] : podium;
  const tableRows = rows;
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date());
  const current = rows.find((row) => row.id === currentStudentId);

  return (
    <div className={styles.leaderboardPage}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.heroTrophy}><TrophyPremiumIcon /></span>
          <div>
            <div className={styles.eyebrow}>LEADERBOARD</div>
            <h1>Leaderboard</h1>
            <p>Tugallangan real testlar va o‘rtacha natijalar asosida avtomatik tuziladigan o‘quvchilar reytingi.</p>
          </div>
        </div>
        <div className={styles.season}>
          <span className={styles.seasonIcon}><CalendarPremiumIcon /></span>
          <div><small>JORIY DAVR</small><strong>{monthLabel}</strong><span>Natijalar jonli yangilanadi</span></div>
        </div>
      </section>

      <div className={styles.controls}>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${period === 'week' ? styles.tabActive : ''}`} onClick={() => setPeriod('week')} type="button"><TrendIcon /> This Week</button>
          <button className={`${styles.tab} ${period === 'month' ? styles.tabActive : ''}`} onClick={() => setPeriod('month')} type="button"><CalendarPremiumIcon /> This Month</button>
          <button className={`${styles.tab} ${period === 'all' ? styles.tabActive : ''}`} onClick={() => setPeriod('all')} type="button"><TrophyPremiumIcon /> All Time</button>
        </div>
        <div className={styles.participants}><span><UsersIcon /></span><div><small>FAOL O‘QUVCHILAR</small><strong>{rows.length}</strong></div><i /></div>
      </div>

      {podiumDisplay.length ? (
        <section className={styles.summary}>
          {podiumDisplay.map((row) => (
            <article key={row.id} className={`${styles.podium} ${row.rank === 1 ? styles.podiumFirst : row.rank === 3 ? styles.podiumThird : styles.podiumSecond}`}>
              <span className={styles.rankBadge}><MedalPremiumIcon /><b>{row.rank}</b></span>
              {row.rank === 1 ? <span className={styles.crown}><CrownIcon /></span> : null}
              <span className={styles.avatar}>{initials(row.firstName, row.lastName)}</span>
              <div className={styles.podiumBody}>
                <h3>{row.firstName} {row.lastName}{row.id === currentStudentId ? <span className={styles.you}>YOU</span> : null}</h3>
                <p>{row.completedTests} ta test yakunlangan</p>
                <div className={styles.podiumStats}><span>Avg: {row.averageScore.toFixed(1)}%</span><span>Best: {row.bestScore.toFixed(1)}%</span></div>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      <section className={styles.tableCard}>
        <div className={styles.tableHead}>
          <span><MedalPremiumIcon /> Rank</span><span>Student</span><span>Completed Tests</span><span>Average Score</span><span>Best Score</span><span><FlameIcon /> Streak</span><span>Last Activity</span>
        </div>
        {tableRows.length ? tableRows.map((row) => (
          <div key={row.id} className={`${styles.row} ${row.id === currentStudentId ? styles.rowMe : ''}`}>
            <span className={styles.rank}>{row.rank <= 3 ? <MedalPremiumIcon /> : `#${row.rank}`}</span>
            <div className={styles.studentCell}><span className={styles.miniAvatar}>{initials(row.firstName, row.lastName)}</span><strong>{row.firstName} {row.lastName}{row.id === currentStudentId ? <span className={styles.you}>YOU</span> : null}</strong></div>
            <span>{row.completedTests}</span>
            <span className={styles.score}>{row.averageScore.toFixed(1)}%</span>
            <span className={styles.best}>{row.bestScore.toFixed(1)}%</span>
            <span className={styles.streak}><FlameIcon /> {row.streak}</span>
            <span className={styles.activity}><i />{formatLastActivity(row.lastActivity)}</span>
          </div>
        )) : (
          <div className={styles.empty}><strong>Bu davrda natija hali yo‘q</strong><span>Studentlar test tugatishi bilan reyting avtomatik paydo bo‘ladi.</span></div>
        )}
      </section>

      <section className={styles.note}>
        <span className={styles.noteIcon}><CrownIcon /></span>
        <div><strong>Ranking qanday hisoblanadi?</strong><p>Faqat completed testlar olinadi. Asosiy mezon — o‘rtacha accuracy; teng bo‘lsa completed testlar soni, best score va oxirgi faoliyat inobatga olinadi.{current ? ` Sizning hozirgi o‘rningiz: #${current.rank}.` : ''}</p></div>
        <span className={styles.liveRefresh}><i />Har 12 soniyada yangilanadi</span>
      </section>
    </div>
  );
}
