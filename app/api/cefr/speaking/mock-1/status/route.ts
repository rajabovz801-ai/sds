import { NextRequest, NextResponse } from 'next/server';
import { readActiveStudentSession } from '@/lib/auth/active-student';
import { getCefrSpeakingMock } from '@/lib/cefrSpeaking';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const student = await readActiveStudentSession(request);
    if (!student) {
      return NextResponse.json({ enabled: false, error: 'Student sessiyasi faol emas.' }, {
        status: 403,
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      });
    }

    const mock = await getCefrSpeakingMock();
    return NextResponse.json(
      { enabled: mock?.status === 'published' && Boolean(mock?.instruction_video_path) },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  } catch (error) {
    return NextResponse.json(
      { enabled: false, error: error instanceof Error ? error.message : 'Speaking Mock status error' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } },
    );
  }
}
