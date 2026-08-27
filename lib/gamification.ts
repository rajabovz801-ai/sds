import { getServiceSupabase } from '@/lib/supabase/server';

export type GamificationSummary = {
  totalPts: number;
  todayPts: number;
  streakDays: number;
  completedTasks: number;
  completedTestIds: string[];
};

type SessionRow = {
  test_id: string;
  raw_score: number | string | null;
  max_score: number | string | null;
  submitted_at: string | null;
  created_at: string;
};

const TZ = 'Asia/Tashkent';
const DAY = 86_400_000;

function dayKey(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function occurredAt(row: SessionRow) {
  return new Date(row.submitted_at || row.created_at);
}

function accuracy(row: SessionRow) {
  const raw = Number(row.raw_score);
  const max = Number(row.max_score);
  if (!Number.isFinite(raw) || !Number.isFinite(max) || max <= 0) return null;
  return Math.max(0, Math.min(100, (raw / max) * 100));
}

function pointsFor(row: SessionRow) {
  const pct = accuracy(row);
  if (pct !== null && pct >= 99.999) return 30;
  if (pct !== null && pct >= 90) return 25;
  return 20;
}

function streakFrom(rows: SessionRow[]) {
  const keys = [...new Set(rows.map((row) => dayKey(occurredAt(row))))].sort().reverse();
  if (!keys.length) return 0;

  const today = dayKey(new Date());
  const yesterday = dayKey(new Date(Date.now() - DAY));
  if (keys[0] !== today && keys[0] !== yesterday) return 0;

  let streak = 1;
  let cursor = new Date(`${keys[0]}T12:00:00+05:00`);
  for (let index = 1; index < keys.length; index += 1) {
    cursor = new Date(cursor.getTime() - DAY);
    if (keys[index] === dayKey(cursor)) streak += 1;
    else break;
  }
  return streak;
}

export async function getGamificationSummary(studentId: string): Promise<GamificationSummary> {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('test_sessions')
    .select('test_id,raw_score,max_score,submitted_at,created_at')
    .eq('student_id', studentId)
    .eq('status', 'completed')
    .eq('superseded', false)
    .order('created_at', { ascending: true })
    .limit(1000);

  if (error) throw error;
  const rows = (data || []) as SessionRow[];

  // One test can award PTS only once. The first completed session owns that reward.
  const firstCompletionByTest = new Map<string, SessionRow>();
  for (const row of rows) {
    if (!firstCompletionByTest.has(row.test_id)) firstCompletionByTest.set(row.test_id, row);
  }

  const today = dayKey(new Date());
  let totalPts = 0;
  let todayPts = 0;
  for (const row of firstCompletionByTest.values()) {
    const pts = pointsFor(row);
    totalPts += pts;
    if (dayKey(occurredAt(row)) === today) todayPts += pts;
  }

  return {
    totalPts,
    todayPts,
    streakDays: streakFrom(rows),
    completedTasks: firstCompletionByTest.size,
    completedTestIds: [...firstCompletionByTest.keys()],
  };
}
