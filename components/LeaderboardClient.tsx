'use client';

import { useMemo, useState } from 'react';
import { AwardIcon, CalendarCheckIcon, FlameIcon, SparklesIcon } from '@/components/UiIcons';
import styles from '@/components/LeaderboardClient.module.css';

type StudentItem = { id: string; firstName: string; lastName: string };
type AttemptItem = { studentId: string; rawScore: number; maxScore: number; submittedAt: string };
type Period = 'week' | 'month' | 'all';

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
};

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

export function LeaderboardClient({ currentStudentId, students, attempts }: Props) {
  const [period, setPeriod] = useState<Period>('week');

  const rows = useMemo<RankedRow[]>(() => {
    const start = startForPeriod(period);
    const filtered = attempts.filter((item) => start === null || new Date(item.submittedAt).getTime() >= start);
    return students
      .map((student) => {
        const own = filtered.filter((item) => item.studentId === student.id && item.maxScore > 0);
        const scores = own.map((item) => (item.rawScore / item.maxScore) * 100).filter(Number.isFinite);
        if (!scores.length) return null;
        return {
          ...student,
          completedTests: scores.length,
          averageScore: scores.reduce((sum, value) => sum + value, 0) / scores.length,
          bestScore: Math.max(...scores),
          streak: streakFor(student.id, attempts),
          rank: 0,
        };
      })
      .filter((item): item is RankedRow => Boolean(item))
      .sort((a, b) => b.averageScore - a.averageScore || b.completedTests - a.completedTests || b.bestScore - a.bestScore || `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))
      .map((item, index) => ({ ...item, rank: index + 1 }));
  }, [attempts, period, students]);

  const podium = rows.slice(0, 3);
  const podiumDisplay = podium.length >= 3 ? [podium[1], podium[0], podium[2]] : podium;
  const rest = rows.slice(3);
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date());
  const current = rows.find((row) => row.id === currentStudentId);

  return (
    <div className={styles.leaderboardPage}>
      <section className={styles.hero}>
        <div>
          <div className={styles.eyebrow}><SparklesIcon /> Tools · Leaderboard</div>
          <h1>Leaderboard</h1>
          <p>Tugallangan real testlar va o‘rtacha natijalar asosida avtomatik tuziladigan o‘quvchilar reytingi.</p>
        </div>
        <div className={styles.season}>
          <span className={styles.seasonIcon}><CalendarCheckIcon /></span>
          <div><small>CURRENT SEASON</small><strong>{monthLabel}</strong><span>Natijalar jonli yangilanadi</span></div>
        </div>
      </section>

      <div className={styles.controls}>
        <button className={`${styles.tab} ${period === 'week' ? styles.tabActive : ''}`} onClick={() => setPeriod('week')} type="button"><SparklesIcon /> This Week</button>
        <button className={`${styles.tab} ${period === 'month' ? styles.tabActive : ''}`} onClick={() => setPeriod('month')} type="button"><CalendarCheckIcon /> This Month</button>
        <button className={`${styles.tab} ${period === 'all' ? styles.tabActive : ''}`} onClick={() => setPeriod('all')} type="button"><AwardIcon /> All Time</button>
      </div>

      {podiumDisplay.length ? (
        <section className={styles.summary}>
          {podiumDisplay.map((row) => (
            <article key={row.id} className={`${styles.podium} ${row.rank === 1 ? styles.podiumFirst : row.rank === 3 ? styles.podiumThird : ''}`}>
              <span className={styles.rankBadge}>{row.rank}</span>
              <span className={styles.avatar}>{initials(row.firstName, row.lastName)}</span>
              <div>
                <h3>{row.firstName} {row.lastName}{row.id === currentStudentId ? <span className={styles.you}>YOU</span> : null}</h3>
                <p>{row.completedTests} ta completed test</p>
                <div className={styles.podiumStats}><span>Avg: {row.averageScore.toFixed(1)}</span><span>Best: {row.bestScore.toFixed(1)}</span></div>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      <section className={styles.tableCard}>
        <div className={styles.tableHead}><span>Rank</span><span>Student</span><span>Completed Tests</span><span>Average Score</span><span>Best Score</span><span>Streak</span></div>
        {rows.length ? (
          (rest.length ? rest : rows).map((row) => (
            <div key={row.id} className={`${styles.row} ${row.id === currentStudentId ? styles.rowMe : ''}`}>
              <span className={styles.rank}>#{row.rank}</span>
              <div className={styles.studentCell}><span className={styles.miniAvatar}>{initials(row.firstName, row.lastName)}</span><strong>{row.firstName} {row.lastName}{row.id === currentStudentId ? <span className={styles.you}>YOU</span> : null}</strong></div>
              <span>{row.completedTests}</span>
              <span className={styles.score}>{row.averageScore.toFixed(1)}%</span>
              <span className={styles.best}>{row.bestScore.toFixed(1)}%</span>
              <span className={styles.streak}><FlameIcon /> {row.streak}</span>
            </div>
          ))
        ) : (
          <div className={styles.empty}><strong>Bu davrda natija hali yo‘q</strong><span>Studentlar test tugatishi bilan reyting avtomatik paydo bo‘ladi.</span></div>
        )}
      </section>

      <section className={styles.note}>
        <span className={styles.noteIcon}><AwardIcon /></span>
        <div><strong>Ranking qanday hisoblanadi?</strong><p>Faqat completed testlar olinadi. Asosiy mezon — o‘rtacha accuracy; teng bo‘lsa ko‘proq tugallangan test va best score ustunlik beradi.{current ? ` Sizning hozirgi o‘rningiz: #${current.rank}.` : ''}</p></div>
      </section>
    </div>
  );
}
