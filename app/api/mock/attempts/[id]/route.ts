import { NextRequest, NextResponse } from 'next/server';
import { readActiveStudentSession } from '@/lib/auth/active-student';
import { getMockAttempt } from '@/lib/mockAttempts';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await readActiveStudentSession(request);
    if (!session) return NextResponse.json({ error: 'Student sessiyasi faol emas.' }, { status: 403 });

    const { id } = await params;
    const data = await getMockAttempt(session.studentId, id);
    if (!data) return NextResponse.json({ error: 'Mock attempt topilmadi.' }, { status: 404 });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Mock attempt server error' }, { status: 500 });
  }
}
