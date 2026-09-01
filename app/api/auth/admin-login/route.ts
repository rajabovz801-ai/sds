import { createHash } from 'node:crypto';
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
import { getServiceSupabase } from '@/lib/supabase/server';

type Attempt = { count: number; resetAt: number };
type RateLimitState = { allowed: boolean; retryAfter: number };

const attempts = new Map<string, Attempt>();
const WINDOW_MS = 10 * 60 * 1000;
const WINDOW_SECONDS = WINDOW_MS / 1000;
const MAX_ATTEMPTS = 5;

function requestIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown';
}

function rateBucket(ip: string) {
  return `admin-pin:${createHash('sha256').update(ip).digest('hex')}`;
}

function requestOriginAllowed(request: NextRequest) {
  const fetchSite = request.headers.get('sec-fetch-site')?.toLowerCase();
  if (fetchSite === 'cross-site') return false;

  const origin = request.headers.get('origin');
  if (!origin) return true;
  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

function localRateLimit(ip: string, increment: boolean): RateLimitState {
  const now = Date.now();
  const active = attempts.get(ip);
  if (!active || active.resetAt <= now) {
    const count = increment ? 1 : 0;
    attempts.set(ip, { count, resetAt: now + WINDOW_MS });
    return { allowed: count < MAX_ATTEMPTS, retryAfter: WINDOW_SECONDS };
  }

  if (increment) active.count += 1;
  attempts.set(ip, active);
  return {
    allowed: active.count < MAX_ATTEMPTS,
    retryAfter: Math.max(1, Math.ceil((active.resetAt - now) / 1000)),
  };
}

async function consumeRateLimit(ip: string, increment: boolean): Promise<RateLimitState> {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.rpc('consume_login_rate_limit', {
      p_bucket: rateBucket(ip),
      p_window_seconds: WINDOW_SECONDS,
      p_max_attempts: MAX_ATTEMPTS,
      p_increment: increment,
    });
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row || typeof row.allowed !== 'boolean') throw new Error('Invalid rate-limit response');
    return {
      allowed: row.allowed,
      retryAfter: Math.max(1, Number(row.retry_after) || WINDOW_SECONDS),
    };
  } catch (error) {
    console.warn('Durable admin rate limit unavailable; using local fallback', error);
    return localRateLimit(ip, increment);
  }
}

async function clearRateLimit(ip: string) {
  attempts.delete(ip);
  try {
    const supabase = getServiceSupabase();
    const { error } = await supabase.from('login_rate_limits').delete().eq('bucket', rateBucket(ip));
    if (error) throw error;
  } catch (error) {
    console.warn('Unable to clear durable admin rate limit', error);
  }
}

function json(body: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('X-Content-Type-Options', 'nosniff');
  return NextResponse.json(body, { ...init, headers });
}

export async function POST(request: NextRequest) {
  try {
    if (!requestOriginAllowed(request)) {
      return json({ error: 'Admin login so‘rovi manbasi tasdiqlanmadi.' }, { status: 403 });
    }

    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
      return json({ error: 'Admin login formati noto‘g‘ri.' }, { status: 415 });
    }

    if (!readAdminChallenge(request)) {
      return json({ error: 'Admin tasdiqlash vaqti tugagan. Maxsus kodni qayta kiriting.' }, { status: 403 });
    }

    const ip = requestIp(request);
    const rateLimit = await consumeRateLimit(ip, false);
    if (!rateLimit.allowed) {
      return json(
        { error: 'Juda ko‘p noto‘g‘ri urinish. Birozdan keyin qayta urinib ko‘ring.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
      );
    }

    const body = await request.json();
    const pin = String(body?.pin || '').trim();
    const expected = process.env.ADMIN_ACCESS_KEY?.trim();

    if (!expected) {
      return json({ error: 'Admin PIN serverda sozlanmagan.' }, { status: 503 });
    }
    if (pin.length < 4 || pin.length > 128 || !constantTimeEqual(pin, expected)) {
      await consumeRateLimit(ip, true);
      return json({ error: 'Admin PIN noto‘g‘ri.' }, { status: 401 });
    }

    await clearRateLimit(ip);
    const response = json({ next: '/admin' });
    response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), adminSessionCookieOptions);
    response.cookies.set(ADMIN_CHALLENGE_COOKIE, '', { ...adminChallengeCookieOptions, maxAge: 0 });
    return response;
  } catch {
    return json({ error: 'Admin login so‘rovi noto‘g‘ri.' }, { status: 400 });
  }
}
