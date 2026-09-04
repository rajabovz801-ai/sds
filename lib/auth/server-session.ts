import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session';
import { PLATFORM_MAINTENANCE_MODE } from '@/lib/auth/maintenance';
import { getServiceSupabase } from '@/lib/supabase/server';

export type StudentSummary = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isTransientStudentLookupError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  if (error.code === 'PGRST303') return true;
  const message = String(error.message || '').toLowerCase();
  return message.includes('connection timed out') || message.includes('fetch failed') || message.includes('timeout');
}

async function getActiveStudent(studentId: string) {
  const supabase = getServiceSupabase();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data: student, error } = await supabase
      .from('students')
      .select('id,first_name,last_name,avatar_url')
      .eq('id', studentId)
      .eq('status', 'active')
      .maybeSingle();

    if (!error) {
      return student ? {
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name || '',
        avatarUrl: student.avatar_url || null,
      } : null;
    }

    if (attempt === 0 && isTransientStudentLookupError(error)) {
      await sleep(900);
      continue;
    }

    throw error;
  }

  return null;
}

export async function getServerSession() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function getActiveServerSession() {
  const session = await getServerSession();
  if (!session) return null;
  return await getActiveStudent(session.studentId) ? session : null;
}

export async function requireServerSession(nextPath: string) {
  const session = await getServerSession();
  if (!session) {
    if (PLATFORM_MAINTENANCE_MODE) redirect('/maintenance');
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  return session;
}

export async function requireStudent(nextPath: string): Promise<StudentSummary> {
  const session = await requireServerSession(nextPath);
  const student = await getActiveStudent(session.studentId);
  if (!student) {
    if (PLATFORM_MAINTENANCE_MODE) redirect('/maintenance');
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  return student;
}
