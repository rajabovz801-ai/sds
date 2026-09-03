import { getServiceSupabase } from '@/lib/supabase/server';

export type GamificationSummary = {
  totalPts: number;
  todayPts: number;
  streakDays: number;
  completedTasks: number;
  completedTestIds: string[];
};

type CompletionRow = {
  test_id: string;
  points_awarded: number | string;
  completed_at: string;
};

type AdjustmentRow = {
  points: number | string;
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

function streakFrom(rows: CompletionRow[]) {
  const keys = [...new Set(rows.map((row) => dayKey(new Date(row.completed_at))))].sort().reverse();
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
  const [completionQuery, adjustmentQuery] = await Promise.all([
    supabase
      .from('daily_task_completions')
      .select('test_id,points_awarded,completed_at')
      .eq('student_id', studentId)
      .order('completed_at', { ascending: true })
      .limit(1000),
    supabase
      .from('student_point_adjustments')
      .select('points,created_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: true })
      .limit(1000),
  ]);

  if (completionQuery.error) throw completionQuery.error;
  if (adjustmentQuery.error) throw adjustmentQuery.error;

  const rows = (completionQuery.data || []) as CompletionRow[];
  const adjustments = (adjustmentQuery.data || []) as AdjustmentRow[];
  const today = dayKey(new Date());
  const taskTotal = rows.reduce((sum, row) => sum + Math.max(0, Number(row.points_awarded) || 0), 0);
  const adminTotal = adjustments.reduce((sum, row) => sum + (Number(row.points) || 0), 0);
  const todayTaskPts = rows
    .filter((row) => dayKey(new Date(row.completed_at)) === today)
    .reduce((sum, row) => sum + Math.max(0, Number(row.points_awarded) || 0), 0);
  const todayAdminPts = adjustments
    .filter((row) => dayKey(new Date(row.created_at)) === today)
    .reduce((sum, row) => sum + (Number(row.points) || 0), 0);

  return {
    totalPts: Math.max(0, taskTotal + adminTotal),
    todayPts: Math.max(0, todayTaskPts + todayAdminPts),
    streakDays: streakFrom(rows),
    completedTasks: rows.length,
    completedTestIds: rows.map((row) => row.test_id),
  };
}
