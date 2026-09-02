import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRequest } from '@/lib/adminAuth';
import { getServiceSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const supabase = getServiceSupabase();
    const now = new Date();
    const nowIso = now.toISOString();
    const sinceIso = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const [
      staleSessions,
      liveSessions,
      speakingFailed,
      speakingPending,
      botFailed,
      recentSpeakingErrors,
    ] = await Promise.all([
      supabase.from('test_sessions').select('id', { count: 'exact', head: true }).eq('status', 'in_progress').eq('superseded', false).lte('expires_at', nowIso),
      supabase.from('test_sessions').select('id', { count: 'exact', head: true }).eq('status', 'in_progress').eq('superseded', false).gt('expires_at', nowIso),
      supabase.from('speaking_practice_recordings').select('id', { count: 'exact', head: true }).eq('telegram_sent', false).not('telegram_error', 'is', null).gte('created_at', sinceIso),
      supabase.from('speaking_practice_recordings').select('id', { count: 'exact', head: true }).eq('telegram_sent', false).is('telegram_error', null).gte('created_at', sinceIso),
      supabase.from('bot_notifications').select('id', { count: 'exact', head: true }).eq('status', 'failed').gte('created_at', sinceIso),
      supabase.from('speaking_practice_recordings')
        .select('id,student_id,topic_title,question_index,telegram_error,created_at')
        .eq('telegram_sent', false)
        .not('telegram_error', 'is', null)
        .order('created_at', { ascending: false })
        .limit(8),
    ]);

    const firstError = [staleSessions.error, liveSessions.error, speakingFailed.error, speakingPending.error, botFailed.error, recentSpeakingErrors.error].find(Boolean);
    if (firstError) throw firstError;

    const studentIds = Array.from(new Set((recentSpeakingErrors.data || []).map((row) => row.student_id).filter(Boolean)));
    const studentMap = new Map<string, string>();
    if (studentIds.length > 0) {
      const { data: students, error } = await supabase.from('students').select('id,first_name,last_name').in('id', studentIds);
      if (error) throw error;
      for (const student of students || []) {
        studentMap.set(student.id, `${student.first_name || ''} ${student.last_name || ''}`.replace(/\s+/g, ' ').trim() || 'Student');
      }
    }

    return NextResponse.json({
      ok: true,
      checkedAt: nowIso,
      metrics: {
        staleSessions: staleSessions.count || 0,
        liveSessions: liveSessions.count || 0,
        speakingFailed24h: speakingFailed.count || 0,
        speakingPending24h: speakingPending.count || 0,
        botFailed24h: botFailed.count || 0,
      },
      recentSpeakingErrors: (recentSpeakingErrors.data || []).map((row) => ({
        ...row,
        student_name: studentMap.get(row.student_id) || 'Student',
      })),
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('[ADMIN_SYSTEM_HEALTH_ERROR]', error);
    return NextResponse.json({ error: 'System health ma’lumotlari olinmadi.' }, { status: 500 });
  }
}
