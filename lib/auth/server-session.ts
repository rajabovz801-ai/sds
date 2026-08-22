import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session';
import { getServiceSupabase } from '@/lib/supabase/server';

export type StudentSummary = {
  id: string;
  firstName: string;
  lastName: string;
};

async function getActiveStudent(studentId: string) {
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

  return summary;
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
  if (!session) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return session;
}

export async function requireStudent(nextPath: string): Promise<StudentSummary> {
  const session = await requireServerSession(nextPath);
  const student = await getActiveStudent(session.studentId);
  if (!student) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return student;
}
