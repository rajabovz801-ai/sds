import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRequest } from '@/lib/adminAuth';
import { getServiceSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const supabase = getServiceSupabase();
    const { data: recordings, error } = await supabase
      .from('speaking_practice_recordings')
      .select('id,student_id,day,day_title,topic_id,topic_title,question_index,question_text,duration_seconds,size_bytes,telegram_sent,telegram_error,created_at')
      .order('created_at', { ascending: false })
      .limit(300);
    if (error) throw error;

    const studentIds = Array.from(new Set((recordings || []).map((row) => row.student_id).filter(Boolean)));
    const studentMap = new Map<string, string>();
    if (studentIds.length > 0) {
      const { data: students, error: studentError } = await supabase
        .from('students')
        .select('id,first_name,last_name')
        .in('id', studentIds);
      if (studentError) throw studentError;
      for (const student of students || []) {
        const name = `${student.first_name || ''} ${student.last_name || ''}`.replace(/\s+/g, ' ').trim() || 'Student';
        studentMap.set(student.id, name);
      }
    }

    return NextResponse.json({
      recordings: (recordings || []).map((row) => ({
        ...row,
        student_name: studentMap.get(row.student_id) || 'Student',
      })),
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Speaking Practice inbox error' }, { status: 500 });
  }
}
