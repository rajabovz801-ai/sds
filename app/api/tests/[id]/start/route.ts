import { NextRequest, NextResponse } from 'next/server';
import { readActiveStudentSession } from '@/lib/auth/active-student';
import { getServiceSupabase } from '@/lib/supabase/server';

type SectionName = 'reading' | 'listening' | 'writing' | 'speaking';

const sectionFields: Record<SectionName, 'reading_test_id' | 'listening_test_id' | 'writing_test_id' | 'speaking_test_id'> = {
  reading: 'reading_test_id',
  listening: 'listening_test_id',
  writing: 'writing_test_id',
  speaking: 'speaking_test_id',
};

type SessionRow = {
  id: string;
  status: string;
  started_at: string;
  expires_at: string;
  locked_until: string | null;
};

function migrationError(error: unknown) {
  const value = error as { code?: string; message?: string } | null;
  if (value?.code === '42P01' || value?.code === '42703') {
    return 'Exam control bazasi hali o‘rnatilmagan. Supabase migrationlarni ishga tushiring.';
  }
  return value?.message || 'Test session yaratilmadi.';
}

function sessionResponse(row: SessionRow, resumed: boolean, durationSeconds: number) {
  return NextResponse.json({
    sessionId: row.id,
    startedAt: row.started_at,
    expiresAt: row.expires_at,
    lockedUntil: row.locked_until,
    durationSeconds,
    resumed,
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const student = await readActiveStudentSession(request);
    if (!student) return NextResponse.json({ error: 'Student sessiyasi faol emas.' }, { status: 403 });

    const { id: testId } = await params;
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const mode = body.mode === 'mock' ? 'mock' : 'practice';
    const attemptId = String(body.attemptId || '').trim();
    const section = String(body.section || '').toLowerCase() as SectionName;
    const supabase = getServiceSupabase();

    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('id,status,duration_minutes')
      .eq('id', testId)
      .eq('status', 'published')
      .maybeSingle();
    if (testError) throw testError;
    if (!test) return NextResponse.json({ error: 'Test hozir yopiq yoki topilmadi.' }, { status: 404 });

    if (mode === 'mock') {
      if (!attemptId || !Object.prototype.hasOwnProperty.call(sectionFields, section)) {
        return NextResponse.json({ error: 'Mock session ma’lumotlari noto‘g‘ri.' }, { status: 400 });
      }

      const { data: attempt, error: attemptError } = await supabase
        .from('attempts')
        .select('id,mock_id,status')
        .eq('id', attemptId)
        .eq('student_id', student.studentId)
        .eq('attempt_type', 'mock')
        .maybeSingle();
      if (attemptError) throw attemptError;
      if (!attempt?.mock_id || attempt.status !== 'in_progress') {
        return NextResponse.json({ error: 'Mock session faol emas.' }, { status: 409 });
      }

      const { data: mock, error: mockError } = await supabase
        .from('mocks')
        .select('reading_test_id,listening_test_id,writing_test_id,speaking_test_id,status')
        .eq('id', attempt.mock_id)
        .eq('status', 'published')
        .maybeSingle();
      if (mockError) throw mockError;
      if (!mock || String(mock[sectionFields[section]] || '') !== testId) {
        return NextResponse.json({ error: 'Test bu mock sectioniga tegishli emas.' }, { status: 403 });
      }

      if (section === 'listening' || section === 'reading') {
        const [{ data: progress, error: progressError }, { data: savedSections, error: sectionsError }] = await Promise.all([
          supabase.from('mock_attempt_progress').select('listening_video_seen_at,reading_video_seen_at').eq('attempt_id', attemptId).maybeSingle(),
          supabase.from('section_results').select('section').eq('attempt_id', attemptId),
        ]);
        if (progressError) throw progressError;
        if (sectionsError) throw sectionsError;
        const completed = new Set((savedSections || []).map((row) => row.section));

        if (section === 'listening') {
          if (!progress?.listening_video_seen_at) {
            return NextResponse.json({ error: 'Avval Listening instruction videoni oxirigacha ko‘ring.' }, { status: 409 });
          }
          if (completed.has('listening')) {
            return NextResponse.json({ error: 'Listening section allaqachon yakunlangan.', code: 'ATTEMPT_USED' }, { status: 409 });
          }
        }

        if (section === 'reading') {
          if (!completed.has('listening')) {
            return NextResponse.json({ error: 'Avval Listening sectionni yakunlang.' }, { status: 409 });
          }
          if (!progress?.reading_video_seen_at) {
            return NextResponse.json({ error: 'Avval Reading instruction videoni oxirigacha ko‘ring.' }, { status: 409 });
          }
          if (completed.has('reading')) {
            return NextResponse.json({ error: 'Reading section allaqachon yakunlangan.', code: 'ATTEMPT_USED' }, { status: 409 });
          }
        }
      }
    }

    const durationSeconds = Math.max(300, Math.min(14400, Math.round(Number(test.duration_minutes || 60) * 60)));
    let existingQuery = supabase
      .from('test_sessions')
      .select('id,status,started_at,expires_at,locked_until')
      .eq('student_id', student.studentId)
      .eq('test_id', testId)
      .eq('mode', mode)
      .eq('superseded', false);

    if (mode === 'mock') {
      existingQuery = existingQuery
        .eq('mock_attempt_id', attemptId)
        .eq('section', section);
    }

    const { data: existing, error: existingError } = await existingQuery.maybeSingle();
    if (existingError) throw existingError;

    if (existing) {
      if (existing.status === 'in_progress' && new Date(existing.expires_at).getTime() > Date.now()) {
        return sessionResponse(existing as SessionRow, true, durationSeconds);
      }

      if (existing.status === 'in_progress') {
        const { error: expireError } = await supabase
          .from('test_sessions')
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .eq('status', 'in_progress');
        if (expireError) throw expireError;
      }

      if (mode === 'mock') {
        return NextResponse.json({
          error: existing.status === 'completed' ? 'Bu mock bo‘limini allaqachon ishlagansiz.' : 'Bu mock bo‘limi uchun ajratilgan vaqt tugagan.',
          code: 'ATTEMPT_USED',
        }, { status: 409 });
      }

      const { error: archiveError } = await supabase
        .from('test_sessions')
        .update({ superseded: true, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .eq('superseded', false);
      if (archiveError) throw archiveError;
    }

    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + durationSeconds * 1000);
    const { data: created, error: createError } = await supabase
      .from('test_sessions')
      .insert({
        student_id: student.studentId,
        test_id: testId,
        mock_attempt_id: mode === 'mock' ? attemptId : null,
        mode,
        section: mode === 'mock' ? section : null,
        status: 'in_progress',
        started_at: startedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        superseded: false,
      })
      .select('id,status,started_at,expires_at,locked_until')
      .single();

    if (createError) {
      if ((createError as { code?: string }).code === '23505' && mode === 'practice') {
        const { data: current, error: currentError } = await supabase
          .from('test_sessions')
          .select('id,status,started_at,expires_at,locked_until')
          .eq('student_id', student.studentId)
          .eq('test_id', testId)
          .eq('mode', 'practice')
          .eq('superseded', false)
          .eq('status', 'in_progress')
          .maybeSingle();
        if (currentError) throw currentError;
        if (current && new Date(current.expires_at).getTime() > Date.now()) {
          return sessionResponse(current as SessionRow, true, durationSeconds);
        }
      }
      if ((createError as { code?: string }).code === '23505') {
        return NextResponse.json({ error: 'Bu test uchun faol urinish allaqachon mavjud.', code: 'ATTEMPT_ACTIVE' }, { status: 409 });
      }
      throw createError;
    }

    return sessionResponse(created as SessionRow, false, durationSeconds);
  } catch (error) {
    return NextResponse.json({ error: migrationError(error) }, { status: 500 });
  }
}
