import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { performStudentAccess } from '@/lib/arkEnglishStudentAccess';

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function authorized(request: NextRequest) {
  const expected = (process.env.BOT_REGISTRATION_SECRET || '').trim();
  const received = (request.headers.get('x-ark-bot-secret') || '').trim();
  return expected !== '' && received !== '' && safeEqual(expected, received);
}

export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized bot request' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const result = await performStudentAccess(body);
    return NextResponse.json(result.data, { status: result.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Bot access server error' },
      { status: 500 },
    );
  }
}
