import { NextResponse } from 'next/server';
import { getActiveServerSession } from '@/lib/auth/server-session';
import { getGamificationSummary } from '@/lib/gamification';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getActiveServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const summary = await getGamificationSummary(session.studentId);
    return NextResponse.json(summary, {
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (error) {
    console.error('Gamification summary failed', error);
    return NextResponse.json({ error: 'Gamification unavailable' }, { status: 500 });
  }
}
