import 'server-only';

import type { NextRequest } from 'next/server';
import { readSession, type SessionPayload } from '@/lib/auth/session';
import { getServiceSupabase } from '@/lib/supabase/server';

export async function readActiveStudentSession(request: NextRequest): Promise<SessionPayload | null> {
  const session = readSession(request);
  if (!session) return null;

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('students')
    .select('id,status')
    .eq('id', session.studentId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  return data ? session : null;
}
