import { NextRequest, NextResponse } from 'next/server';
import { hashAccessCode, normalizeAccessCode } from '@/lib/auth/codes';
import { readActiveStudentSession } from '@/lib/auth/active-student';
import { getServiceSupabase } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const session = await readActiveStudentSession(request);
    if (!session) return NextResponse.json({ error: 'Student sessiyasi faol emas.' }, { status: 403 });

    const body = await request.json();
    const code = normalizeAccessCode(String(body?.code || ''));
    if (!/^[A-Z0-9-]{6,20}$/.test(code)) {
      return NextResponse.json({ error: 'Mock ID noto‘g‘ri formatda.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data: access, error: accessError } = await supabase
      .from('mock_access_codes')
      .select('id,student_id,mock_id,expires_at,used_at')
      .eq('student_id', session.studentId)
      .eq('code_hash', hashAccessCode(code))
      .is('used_at', null)
      .limit(1)
      .maybeSingle();

    if (accessError) throw accessError;
    if (!access) return NextResponse.json({ error: 'Mock ID topilmadi yoki allaqachon ishlatilgan.' }, { status: 401 });
    if (access.expires_at && new Date(access.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Mock ID muddati tugagan.' }, { status: 401 });
    }

    const { data: mock, error: mockError } = await supabase
      .from('mocks')
      .select('id,title,track,status,reading_test_id,listening_test_id,writing_test_id,speaking_test_id')
      .eq('id', access.mock_id)
      .eq('status', 'published')
      .maybeSingle();

    if (mockError) throw mockError;
    if (!mock) return NextResponse.json({ error: 'Bu mock hozir faol emas.' }, { status: 404 });

    const now = new Date().toISOString();
    const { data: consumed, error: consumeError } = await supabase
      .from('mock_access_codes')
      .update({ used_at: now })
      .eq('id', access.id)
      .is('used_at', null)
      .select('id')
      .maybeSingle();

    if (consumeError) throw consumeError;
    if (!consumed) return NextResponse.json({ error: 'Mock ID allaqachon ishlatilgan.' }, { status: 409 });

    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .insert({ student_id: session.studentId, mock_id: mock.id, attempt_type: 'mock', status: 'in_progress' })
      .select('id')
      .single();

    if (attemptError) {
      await supabase.from('mock_access_codes').update({ used_at: null }).eq('id', access.id).eq('used_at', now);
      throw attemptError;
    }
    return NextResponse.json({ attemptId: attempt.id, mock: { id: mock.id, title: mock.title, track: mock.track } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Mock access server error' }, { status: 500 });
  }
}
