import { NextResponse } from 'next/server';
import { getActiveServerSession } from '@/lib/auth/server-session';
import { getDashboardData } from '@/lib/dashboard';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getActiveServerSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const data = await getDashboardData(session.studentId);
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store, max-age=0' } });
  } catch (error) {
    console.error('Dashboard refresh failed', error);
    return NextResponse.json({ error: 'Dashboard unavailable' }, { status: 500 });
  }
}
