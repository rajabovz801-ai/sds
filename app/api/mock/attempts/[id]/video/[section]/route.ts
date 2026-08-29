import { NextRequest, NextResponse } from 'next/server';
import { readActiveStudentSession } from '@/lib/auth/active-student';
import { getServiceSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; section: string }> }) {
  try {
    const student = await readActiveStudentSession(request);
    if (!student) return NextResponse.json({ error: 'Student sessiyasi faol emas.' }, { status: 403 });

    const { id, section: rawSection } = await params;
    const section = rawSection.toLowerCase();
    if (!['listening', 'reading'].includes(section)) return new NextResponse('Video topilmadi.', { status: 404 });

    const supabase = getServiceSupabase();
    const { data: attempt, error: attemptError } = await supabase
      .from('attempts')
      .select('id,mock_id,status')
      .eq('id', id)
      .eq('student_id', student.studentId)
      .eq('attempt_type', 'mock')
      .maybeSingle();
    if (attemptError) throw attemptError;
    if (!attempt?.mock_id) return new NextResponse('Mock attempt topilmadi.', { status: 404 });

    const { data: mock, error: mockError } = await supabase
      .from('mocks')
      .select('listening_video_path,reading_video_path')
      .eq('id', attempt.mock_id)
      .maybeSingle();
    if (mockError) throw mockError;
    if (!mock) return new NextResponse('Mock topilmadi.', { status: 404 });

    const path = section === 'listening' ? mock.listening_video_path : mock.reading_video_path;
    if (!path) return new NextResponse('Instruction video biriktirilmagan.', { status: 404 });

    const { data, error } = await supabase.storage.from('mock-assets').createSignedUrl(path, 10 * 60);
    if (error || !data?.signedUrl) throw error || new Error('Video URL yaratilmadi.');

    return NextResponse.redirect(data.signedUrl, 307);
  } catch (error) {
    return new NextResponse(error instanceof Error ? error.message : 'Video server error', { status: 500 });
  }
}
