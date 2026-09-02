import { NextRequest, NextResponse } from 'next/server';
import { readActiveStudentSession } from '@/lib/auth/active-student';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_TEXT = 900;

function clean(value: unknown, max = MAX_TEXT) {
  return String(value ?? '')
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ ok: false, error: 'invalid_origin' }, { status: 403 });
  }

  try {
    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > 16_384) {
      return NextResponse.json({ ok: false, error: 'payload_too_large' }, { status: 413 });
    }

    const payload = await request.json().catch(() => ({})) as Record<string, unknown>;
    const student = await readActiveStudentSession(request).catch(() => null);
    const event = {
      event: 'ark_client_error',
      level: clean(payload.level, 16) || 'error',
      source: clean(payload.source, 60) || 'client',
      message: clean(payload.message),
      stack: clean(payload.stack, 1800),
      path: clean(payload.path, 220),
      userAgent: clean(request.headers.get('user-agent'), 320),
      studentId: student?.studentId || null,
      createdAt: new Date().toISOString(),
    };

    console.error('[ARK_CLIENT_ERROR]', JSON.stringify(event));
    return new NextResponse(null, {
      status: 204,
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    console.error('[ARK_CLIENT_ERROR_REPORTER_FAILED]', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
