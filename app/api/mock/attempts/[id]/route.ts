import { NextRequest, NextResponse } from 'next/server';
import { readSession } from '@/lib/auth/session';
import { getMockAttempt } from '@/lib/mockAttempts';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = readSession(request);
    if (!session) return NextResponse.json({ error: 'Avval platformaga kiring.' }, { status: 401 });

    const { id } = await params;
    const data = await getMockAttempt(session.studentId, id);
    if (!data) return NextResponse.json({ error: 'Mock attempt topilmadi.' }, { status: 404 });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Mock attempt server error' }, { status: 500 });
  }
}
