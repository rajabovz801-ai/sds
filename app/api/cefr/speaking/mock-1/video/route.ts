import { NextRequest, NextResponse } from 'next/server';
import { readActiveStudentSession } from '@/lib/auth/active-student';
import { CEFR_SPEAKING_VIDEO_BUCKET, getCefrSpeakingMock } from '@/lib/cefrSpeaking';
import { getServiceSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const student = await readActiveStudentSession(request);
    if (!student) return NextResponse.json({ error: 'Student sessiyasi faol emas.' }, { status: 403 });

    const mock = await getCefrSpeakingMock();
    if (!mock?.instruction_video_path) {
      return new NextResponse('Speaking instruction video hali biriktirilmagan.', { status: 404 });
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase.storage
      .from(CEFR_SPEAKING_VIDEO_BUCKET)
      .createSignedUrl(mock.instruction_video_path, 10 * 60);

    if (error || !data?.signedUrl) throw error || new Error('Video URL yaratilmadi.');
    return NextResponse.redirect(data.signedUrl, 307);
  } catch (error) {
    return new NextResponse(error instanceof Error ? error.message : 'Video server error', { status: 500 });
  }
}
