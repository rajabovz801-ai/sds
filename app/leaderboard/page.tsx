import { LeaderboardClient } from '@/components/LeaderboardClient';
import { StudentWorkspaceShellClient } from '@/components/StudentWorkspaceShellClient';
import { requireStudent } from '@/lib/auth/server-session';
import { getServiceSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isTransientSupabaseError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  if (error.code === 'PGRST303') return true;
  const message = String(error.message || '').toLowerCase();
  return message.includes('connection timed out') || message.includes('fetch failed') || message.includes('timeout');
}

async function loadLeaderboardRows() {
  const supabase = getServiceSupabase();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const results = await Promise.all([
      supabase
        .from('students')
        .select('id,first_name,last_name,last_login_at')
        .eq('status', 'active')
        .order('first_name', { ascending: true })
        .limit(1000),
      supabase
        .from('test_sessions')
        .select('student_id,raw_score,max_score,submitted_at')
        .eq('status', 'completed')
        .eq('superseded', false)
        .not('raw_score', 'is', null)
        .not('max_score', 'is', null)
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: false })
        .limit(5000),
      supabase
        .from('daily_task_completions')
        .select('student_id,points_awarded,completed_at')
        .order('completed_at', { ascending: false })
        .limit(5000),
    ]);

    const errors = results.map((result) => result.error).filter(Boolean);
    if (errors.length === 0) return results;

    if (attempt === 0 && errors.some((error) => isTransientSupabaseError(error))) {
      await sleep(900);
      continue;
    }

    throw errors[0];
  }

  throw new Error('Leaderboard data could not be loaded');
}

export default async function LeaderboardPage() {
  const student = await requireStudent('/leaderboard');

  const [
    { data: studentRows },
    { data: sessionRows },
    { data: pointRows },
  ] = await loadLeaderboardRows();

  const students = (studentRows || []).map((row) => ({
    id: String(row.id),
    firstName: String(row.first_name || ''),
    lastName: String(row.last_name || ''),
    lastLoginAt: row.last_login_at ? String(row.last_login_at) : '',
  }));

  const attempts = (sessionRows || [])
    .map((row) => ({
      studentId: String(row.student_id || ''),
      rawScore: Number(row.raw_score),
      maxScore: Number(row.max_score),
      submittedAt: String(row.submitted_at || ''),
    }))
    .filter((row) => row.studentId && row.submittedAt && Number.isFinite(row.rawScore) && Number.isFinite(row.maxScore) && row.maxScore > 0);

  const pointEvents = (pointRows || [])
    .map((row) => ({
      studentId: String(row.student_id || ''),
      points: Number(row.points_awarded) || 0,
      completedAt: String(row.completed_at || ''),
    }))
    .filter((row) => row.studentId && row.completedAt);

  return (
    <StudentWorkspaceShellClient student={student} active="leaderboard">
      <LeaderboardClient currentStudentId={student.id} students={students} attempts={attempts} pointEvents={pointEvents} />
    </StudentWorkspaceShellClient>
  );
}
