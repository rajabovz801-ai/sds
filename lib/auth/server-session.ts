import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session';
import { getServiceSupabase } from '@/lib/supabase/server';

export type StudentSummary = {
  id: string;
  firstName: string;
  lastName: string;
};

type CachedStudent = { student: StudentSummary | null; expiresAt: number };
const studentCache = new Map<string, CachedStudent>();
const STUDENT_STATUS_TTL_MS = 10 * 60 * 1000;

async function getActiveStudent(studentId: string) {
  const now = Date.now();
  const cached = studentCache.get(studentId);
  if (cached && cached.expiresAt > now) return cached.student;

  const supabase = getServiceSupabase();
  const { data: student, error } = await supabase
    .from('students')
    .select('id,first_name,last_name')
    .eq('id', studentId)
    .eq('status', 'active')
    .maybeSingle();
  if (error) throw error;
  const summary = student ? {
    id: student.id,
    firstName: student.first_name,
    lastName: student.last_name || '',
  } : null;

  if (studentCache.size > 500) studentCache.clear();
  studentCache.set(studentId, { student: summary, expiresAt: now + STUDENT_STATUS_TTL_MS });
  return summary;
}

export async function getServerSession() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function requireServerSession(nextPath: string) {
  const session = await getServerSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return session;
}

export async function requireStudent(nextPath: string): Promise<StudentSummary> {
  const session = await requireServerSession(nextPath);
  const sessionAge = session.iat ? Math.floor(Date.now() / 1000) - session.iat : Number.POSITIVE_INFINITY;
  if (session.firstName && sessionAge < STUDENT_STATUS_TTL_MS / 1000) {
    return {
      id: session.studentId,
      firstName: session.firstName,
      lastName: session.lastName || '',
    };
  }

  const student = await getActiveStudent(session.studentId);
  if (!student) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return student;
}
