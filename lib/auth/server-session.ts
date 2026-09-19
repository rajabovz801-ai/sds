import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '@/lib/auth/admin-session';
import { PLATFORM_MAINTENANCE_MODE } from '@/lib/auth/maintenance';
import { getServiceSupabase } from '@/lib/supabase/server';

export type StudentSummary = {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  adminPreview?: boolean;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isTransientStudentLookupError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  if (error.code === 'PGRST303') return true;
  const message = String(error.message || '').toLowerCase();
  return message.includes('connection timed out') || message.includes('fetch failed') || message.includes('timeout');
}

async function getActiveStudent(studentId: string, adminPreview = false) {
  const supabase = getServiceSupabase();

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data: student, error } = await supabase
      .from('students')
      .select('id,first_name,last_name,avatar_url,exam_platform_enabled')
      .eq('id', studentId)
      .eq('status', 'active')
      .maybeSingle();

    if (!error) {
      if (!student) return null;
      if (!adminPreview && student.exam_platform_enabled !== true) return null;
      return {
        id: student.id,
        firstName: adminPreview ? 'Admin' : student.first_name,
        lastName: adminPreview ? '' : (student.last_name || ''),
        avatarUrl: adminPreview ? null : (student.avatar_url || null),
        adminPreview,
      };
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

async function isAdminStudentPreview() {
  const cookieStore = await cookies();
  const marker = cookieStore.get('ark_admin_student_preview')?.value === '1';
  if (!marker) return false;
  return Boolean(verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value));
}

export async function getActiveServerSession() {
  const session = await getServerSession();
  if (!session) return null;
  const adminPreview = await isAdminStudentPreview();
  return await getActiveStudent(session.studentId, adminPreview) ? session : null;
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
  const adminPreview = await isAdminStudentPreview();
  const student = await getActiveStudent(session.studentId, adminPreview);
  if (!student) {
    if (PLATFORM_MAINTENANCE_MODE) redirect('/maintenance');
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }
  return student;
}
