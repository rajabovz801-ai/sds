import { getServiceSupabase } from '@/lib/supabase/server';

export type DashboardPoint = { label: string; value: number | null; date: string };
export type DashboardRecentResult = {
  id: string;
  title: string;
  skill: string;
  score: string;
  band: number | null;
  date: string;
};
export type DashboardAchievement = {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress: number;
  icon: string;
};
export type DashboardData = {
  overallBand: number | null;
  readingBand: number | null;
  listeningBand: number | null;
  weeklyStudyHours: number;
  weeklyGoalHours: number;
  testsCompleted: number;
  dailyResults: DashboardPoint[];
  bandTrend: DashboardPoint[];
  recentResults: DashboardRecentResult[];
  achievements: DashboardAchievement[];
  unlockedAchievements: number;
  studyStreak: number;
  focusArea: string;
  nextTargetBand: number | null;
  readingAverage: number | null;
  listeningAverage: number | null;
  lastUpdated: string;
};

type SessionRow = {
  id: string;
  raw_score: number | string | null;
  max_score: number | string | null;
  band: number | string | null;
  duration_seconds: number | null;
  submitted_at: string | null;
  created_at: string;
  tests: {
    title: string;
    skill: string;
    track: string;
    duration_minutes: number | null;
  } | Array<{
    title: string;
    skill: string;
    track: string;
    duration_minutes: number | null;
  }> | null;
};

const TZ = 'Asia/Tashkent';
const DAY = 86_400_000;

function n(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundHalf(value: number) {
  return Math.max(0, Math.min(9, Math.round(value * 2) / 2));
}

function estimateBand(raw: number | null, max: number | null) {
  if (raw === null || max === null || max <= 0) return null;
  const pct = (raw / max) * 100;
  if (pct >= 97) return 9;
  if (pct >= 90) return 8.5;
  if (pct >= 85) return 8;
  if (pct >= 80) return 7.5;
  if (pct >= 75) return 7;
  if (pct >= 65) return 6.5;
  if (pct >= 55) return 6;
  if (pct >= 45) return 5.5;
  if (pct >= 35) return 5;
  if (pct >= 25) return 4.5;
  return 4;
}

function displayBand(row: SessionRow) {
  const direct = n(row.band);
  return direct === null ? estimateBand(n(row.raw_score), n(row.max_score)) : roundHalf(direct);
}

function testMeta(row: SessionRow) {
  return Array.isArray(row.tests) ? row.tests[0] : row.tests;
}

function dayKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function shortDay(date: Date) {
  return new Intl.DateTimeFormat('en', { timeZone: TZ, month: 'short', day: 'numeric' }).format(date);
}

function average(values: Array<number | null>) {
  const clean = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (!clean.length) return null;
  return roundHalf(clean.reduce((sum, value) => sum + value, 0) / clean.length);
}

function latestBand(rows: SessionRow[], skill: string) {
  for (const row of rows) {
    if (testMeta(row)?.skill === skill) {
      const band = displayBand(row);
      if (band !== null) return band;
    }
  }
  return null;
}

function skillAverage(rows: SessionRow[], skill: string, count = 5) {
  const values: number[] = [];
  for (const row of rows) {
    if (testMeta(row)?.skill !== skill) continue;
    const value = displayBand(row);
    if (value !== null) values.push(value);
    if (values.length >= count) break;
  }
  return average(values);
}

function consecutiveStreak(rows: SessionRow[]) {
  const keys = [...new Set(rows.map((row) => dayKey(new Date(row.submitted_at || row.created_at))))].sort().reverse();
  if (!keys.length) return 0;
  const today = dayKey(new Date());
  const yesterday = dayKey(new Date(Date.now() - DAY));
  if (keys[0] !== today && keys[0] !== yesterday) return 0;
  let streak = 1;
  let cursor = new Date(`${keys[0]}T12:00:00+05:00`);
  for (let i = 1; i < keys.length; i += 1) {
    cursor = new Date(cursor.getTime() - DAY);
    if (keys[i] === dayKey(cursor)) streak += 1;
    else break;
  }
  return streak;
}

function makeDaily(rows: SessionRow[]) {
  const map = new Map<string, number[]>();
  for (const row of rows) {
    const date = new Date(row.submitted_at || row.created_at);
    const key = dayKey(date);
    const band = displayBand(row);
    if (band === null) continue;
    const values = map.get(key) || [];
    values.push(band);
    map.set(key, values);
  }
  return Array.from({ length: 14 }, (_, index) => {
    const date = new Date(Date.now() - (13 - index) * DAY);
    const key = dayKey(date);
    return { label: shortDay(date), date: key, value: average(map.get(key) || []) };
  });
}

function makeWeekly(rows: SessionRow[]) {
  const buckets: Array<{ start: number; end: number; values: number[] }> = [];
  const now = Date.now();
  for (let i = 7; i >= 0; i -= 1) {
    const end = now - i * 7 * DAY;
    buckets.push({ start: end - 7 * DAY, end, values: [] });
  }
  for (const row of rows) {
    const at = new Date(row.submitted_at || row.created_at).getTime();
    const band = displayBand(row);
    if (band === null) continue;
    for (const bucket of buckets) {
      if (at > bucket.start && at <= bucket.end) bucket.values.push(band);
    }
  }
  return buckets.map((bucket, index) => ({
    label: `Wk ${index + 1}`,
    date: new Date(bucket.end).toISOString(),
    value: average(bucket.values),
  }));
}

function accuracy(row: SessionRow) {
  const raw = n(row.raw_score);
  const max = n(row.max_score);
  if (raw === null || max === null || max <= 0) return null;
  return (raw / max) * 100;
}

function achievementData(rows: SessionRow[], overallBand: number | null, readingBand: number | null, listeningBand: number | null, streak: number) {
  const completed = rows.length;
  const maxAccuracy = Math.max(0, ...rows.map((row) => accuracy(row) || 0));
  const activeDays = new Set(rows.filter((row) => new Date(row.submitted_at || row.created_at).getTime() >= Date.now() - 14 * DAY).map((row) => dayKey(new Date(row.submitted_at || row.created_at)))).size;
  const listeningBands = rows.filter((row) => testMeta(row)?.skill === 'listening').map(displayBand).filter((v): v is number => v !== null);
  const listeningBoost = listeningBands.length >= 2 ? listeningBands[0] - listeningBands[1] >= 0.5 : false;
  const fast = rows.some((row) => {
    const duration = row.duration_seconds || 0;
    const minutes = testMeta(row)?.duration_minutes || 0;
    return duration > 0 && minutes > 0 && duration <= minutes * 60 * 0.75;
  });

  const items: DashboardAchievement[] = [
    { id: 'first-test', title: 'First Test', description: 'Birinchi test yakunlandi', unlocked: completed >= 1, progress: Math.min(100, completed * 100), icon: 'first-test' },
    { id: 'streak', title: '7-Day Streak', description: `${streak}/7 kun ketma-ket`, unlocked: streak >= 7, progress: Math.min(100, (streak / 7) * 100), icon: 'streak' },
    { id: 'reading-master', title: 'Reading Master', description: readingBand === null ? 'Reading natija kutilmoqda' : `Reading ${readingBand.toFixed(1)} band`, unlocked: (readingBand || 0) >= 7, progress: Math.min(100, ((readingBand || 0) / 7) * 100), icon: 'study-hero' },
    { id: 'listening-boost', title: 'Listening Boost', description: listeningBand === null ? 'Listening natija kutilmoqda' : `Listening ${listeningBand.toFixed(1)} band`, unlocked: listeningBoost || (listeningBand || 0) >= 7, progress: Math.min(100, ((listeningBand || 0) / 7) * 100), icon: 'trophy' },
    { id: 'ten-tests', title: '10 Tests Finished', description: `${completed}/10 test`, unlocked: completed >= 10, progress: Math.min(100, (completed / 10) * 100), icon: 'ten-tests' },
    { id: 'accuracy-ace', title: 'Accuracy Ace', description: `Eng yuqori aniqlik ${Math.round(maxAccuracy)}%`, unlocked: maxAccuracy >= 90, progress: Math.min(100, maxAccuracy), icon: 'target' },
    { id: 'band-seven', title: 'Band 7 Reached', description: overallBand === null ? 'Umumiy band kutilmoqda' : `Overall ${overallBand.toFixed(1)}`, unlocked: (overallBand || 0) >= 7, progress: Math.min(100, ((overallBand || 0) / 7) * 100), icon: 'band7' },
    { id: 'perfect-section', title: 'Perfect Section', description: '90%+ aniqlik bilan yakunla', unlocked: maxAccuracy >= 97, progress: Math.min(100, maxAccuracy), icon: 'perfect-vocab' },
    { id: 'fast-finisher', title: 'Fast Finisher', description: 'Vaqt limitining 75%ida yakunla', unlocked: fast, progress: fast ? 100 : 55, icon: 'fast-learner' },
    { id: 'consistency', title: 'Consistency Pro', description: `${activeDays}/7 faol kun`, unlocked: activeDays >= 7, progress: Math.min(100, (activeDays / 7) * 100), icon: 'quote-trophy' },
  ];
  return items;
}

export async function getDashboardData(studentId: string): Promise<DashboardData> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('test_sessions')
    .select('id,raw_score,max_score,band,duration_seconds,submitted_at,created_at,tests!inner(title,skill,track,duration_minutes)')
    .eq('student_id', studentId)
    .eq('status', 'completed')
    .eq('superseded', false)
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .limit(250);

  if (error) throw error;
  const rows = (data || []) as unknown as SessionRow[];
  const readingBand = latestBand(rows, 'reading');
  const listeningBand = latestBand(rows, 'listening');
  const speakingBand = latestBand(rows, 'speaking');
  const writingBand = latestBand(rows, 'writing');
  const overallBand = average([readingBand, listeningBand, speakingBand, writingBand].filter((v) => v !== null).length ? [readingBand, listeningBand, speakingBand, writingBand] : rows.slice(0, 1).map(displayBand));
  const readingAverage = skillAverage(rows, 'reading');
  const listeningAverage = skillAverage(rows, 'listening');
  const streak = consecutiveStreak(rows);
  const recentWeekCutoff = Date.now() - 7 * DAY;
  const weeklyStudyHours = rows
    .filter((row) => new Date(row.submitted_at || row.created_at).getTime() >= recentWeekCutoff)
    .reduce((sum, row) => sum + (row.duration_seconds || 0), 0) / 3600;
  const focusArea = readingAverage !== null && listeningAverage !== null
    ? (readingAverage <= listeningAverage ? 'Reading' : 'Listening')
    : readingAverage !== null ? 'Listening' : listeningAverage !== null ? 'Reading' : 'Reading';
  const nextTargetBand = overallBand === null ? 6 : Math.min(9, roundHalf(overallBand + 0.5));
  const achievements = achievementData(rows, overallBand, readingBand, listeningBand, streak);

  return {
    overallBand,
    readingBand,
    listeningBand,
    weeklyStudyHours: Math.round(weeklyStudyHours * 10) / 10,
    weeklyGoalHours: 14,
    testsCompleted: rows.length,
    dailyResults: makeDaily(rows),
    bandTrend: makeWeekly(rows),
    recentResults: rows.slice(0, 5).map((row) => {
      const meta = testMeta(row);
      const raw = n(row.raw_score);
      const max = n(row.max_score);
      return {
        id: row.id,
        title: meta?.title || 'Test',
        skill: meta?.skill || 'test',
        score: raw !== null && max !== null ? `${raw}/${max}` : '—',
        band: displayBand(row),
        date: row.submitted_at || row.created_at,
      };
    }),
    achievements,
    unlockedAchievements: achievements.filter((item) => item.unlocked).length,
    studyStreak: streak,
    focusArea,
    nextTargetBand,
    readingAverage,
    listeningAverage,
    lastUpdated: new Date().toISOString(),
  };
}
