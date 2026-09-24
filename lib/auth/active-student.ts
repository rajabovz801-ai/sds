import 'server-only';

import type { NextRequest } from 'next/server';
import { readSession, type SessionPayload } from '@/lib/auth/session';
import { readAdminSession } from '@/lib/auth/admin-session';
import { getServiceSupabase } from '@/lib/supabase/server';

export async function readActiveStudentSession(request: NextRequest): Promise<SessionPayload | null> {
  const session = readSession(request);
  if (!session) return null;

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('students')
    .select('id,status,exam_platform_enabled')
    .eq('id', session.studentId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const adminPreview = request.cookies.get('ark_admin_student_preview')?.value === '1' && Boolean(readAdminSession(request));
  if (!adminPreview && data.exam_platform_enabled !== true) return null;
  return session;
}
