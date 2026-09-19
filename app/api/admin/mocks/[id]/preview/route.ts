import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRequest } from '@/lib/adminAuth';
import { getServiceSupabase } from '@/lib/supabase/server';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { id } = await params;
    const supabase = getServiceSupabase();

    const [{ data: mock, error: mockError }, { data: admin, error: adminError }] = await Promise.all([
      supabase
        .from('mocks')
        .select('id,title,status,listening_test_id,reading_test_id,listening_video_path,reading_video_path')
        .eq('id', id)
        .maybeSingle(),
      supabase
        .from('admins')
        .select('telegram_id,name')
        .eq('active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);
    if (mockError) throw mockError;
    if (adminError) throw adminError;
    if (!mock) return NextResponse.json({ error: 'Mock topilmadi.' }, { status: 404 });
    if (!mock.listening_test_id || !mock.reading_test_id) {
      return NextResponse.json({ error: 'Listening va Reading testlari to‘liq biriktirilmagan.' }, { status: 409 });
    }
    if (!mock.listening_video_path || !mock.reading_video_path) {
      return NextResponse.json({ error: 'Instruction videolar to‘liq biriktirilmagan.' }, { status: 409 });
    }
    if (!admin?.telegram_id) {
      return NextResponse.json({ error: 'Admin profiliga Telegram ID biriktirilmagan.' }, { status: 409 });
    }

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id,first_name,last_name,status,exam_platform_enabled')
      .eq('telegram_id', admin.telegram_id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();
    if (studentError) throw studentError;
    if (!student) {
      return NextResponse.json({ error: 'Admin preview student profili topilmadi.' }, { status: 409 });
    }
    if (student.exam_platform_enabled === true) {
      return NextResponse.json({ error: 'Admin preview profili real exam student sifatida belgilangan. Xavfsizlik uchun preview to‘xtatildi.' }, { status: 409 });
    }

    const { data: previousAttempts, error: previousError } = await supabase
      .from('attempts')
      .select('id')
      .eq('student_id', student.id)
      .eq('mock_id', id)
      .eq('attempt_type', 'mock');
    if (previousError) throw previousError;

    const previousIds = (previousAttempts || []).map((row) => String(row.id));
    if (previousIds.length) {
      const { error: deleteError } = await supabase
        .from('attempts')
        .delete()
        .in('id', previousIds);
      if (deleteError) throw deleteError;
    }

    const now = new Date().toISOString();
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .insert({
        student_id: student.id,
        mock_id: id,
        attempt_type: 'mock',
        status: 'in_progress',
        started_at: now,
      })
      .select('id')
      .single();
    if (attemptError || !attempt) throw attemptError || new Error('Admin preview attempt yaratilmadi.');

    const { error: progressError } = await supabase
      .from('mock_attempt_progress')
      .insert({
        attempt_id: attempt.id,
        stage: 'listening_video',
        updated_at: now,
      });
    if (progressError) {
      await supabase.from('attempts').delete().eq('id', attempt.id);
      throw progressError;
    }

    return NextResponse.json({
      ok: true,
      attemptId: attempt.id,
      mock: { id: mock.id, title: mock.title, status: mock.status },
      student: { id: student.id, firstName: student.first_name, lastName: student.last_name || '' },
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Admin mock preview yaratilmadi.',
    }, { status: 500 });
  }
}
