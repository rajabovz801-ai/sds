import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_CHALLENGE_COOKIE,
  adminSessionCookieOptions,
  adminChallengeCookieOptions,
  createAdminSessionToken,
  readAdminChallenge,
} from '@/lib/auth/admin-session';
import { constantTimeEqual } from '@/lib/auth/secrets';

type Attempt = { count: number; resetAt: number };
const attempts = new Map<string, Attempt>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  try {
    if (!readAdminChallenge(request)) {
      return NextResponse.json({ error: 'Admin tasdiqlash vaqti tugagan. Maxsus kodni qayta kiriting.' }, { status: 403 });
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const now = Date.now();
    if (attempts.size > 1000) {
      for (const [key, attempt] of attempts) if (attempt.resetAt <= now) attempts.delete(key);
      if (attempts.size > 1000) attempts.clear();
    }
    const current = attempts.get(ip);
    if (current && current.resetAt > now && current.count >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: 'Juda ko‘p noto‘g‘ri urinish. 10 daqiqadan keyin qayta urinib ko‘ring.' }, { status: 429, headers: { 'Retry-After': '600' } });
    }
    if (current && current.resetAt <= now) attempts.delete(ip);

    const body = await request.json();
    const pin = String(body?.pin || '').trim();
    const expected = process.env.ADMIN_ACCESS_KEY?.trim();

    if (!expected) {
      return NextResponse.json({ error: 'Admin PIN serverda sozlanmagan.' }, { status: 503 });
    }
    if (pin.length < 4 || pin.length > 128 || !constantTimeEqual(pin, expected)) {
      const active = attempts.get(ip);
      attempts.set(ip, { count: (active?.count || 0) + 1, resetAt: active?.resetAt || now + WINDOW_MS });
      return NextResponse.json({ error: 'Admin PIN noto‘g‘ri.' }, { status: 401 });
    }

    attempts.delete(ip);
    const response = NextResponse.json({ next: '/admin' });
    response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), adminSessionCookieOptions);
    response.cookies.set(ADMIN_CHALLENGE_COOKIE, '', { ...adminChallengeCookieOptions, maxAge: 0 });
    return response;
  } catch {
    return NextResponse.json({ error: 'Admin login so‘rovi noto‘g‘ri.' }, { status: 400 });
  }
}
