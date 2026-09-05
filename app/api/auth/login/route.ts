import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { hashAccessCode, normalizeAccessCode } from '@/lib/auth/codes';
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/session';
import { isStudentAllowedDuringMaintenance } from '@/lib/auth/maintenance';
import { getServiceSupabase } from '@/lib/supabase/server';
import { constantTimeEqual } from '@/lib/auth/secrets';
import {
  ADMIN_CHALLENGE_COOKIE,
  adminChallengeCookieOptions,
  createAdminChallengeToken,
} from '@/lib/auth/admin-session';

type Attempt = { count: number; resetAt: number };
type RateLimitState = { allowed: boolean; retryAfter: number };

const attempts = new Map<string, Attempt>();
const WINDOW_MS = 10 * 60 * 1000;
const WINDOW_SECONDS = WINDOW_MS / 1000;
const MAX_ATTEMPTS = 8;

function requestIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function rateBucket(ip: string) {
  return `login:${createHash('sha256').update(ip).digest('hex')}`;
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
    // Login must remain available if the rate-limit helper itself has a transient
    // database issue. The existing per-instance guard remains as a fallback.
    console.warn('Durable login rate limit unavailable; using local fallback', error);
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
    console.warn('Unable to clear durable login rate limit', error);
  }
}

async function recordFailure(ip: string) {
  await consumeRateLimit(ip, true);
}

export async function POST(request: NextRequest) {
  try {
    const ip = requestIp(request);
    const rateLimit = await consumeRateLimit(ip, false);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Juda ko‘p noto‘g‘ri urinish. Birozdan keyin qayta urinib ko‘ring.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
      );
    }

    const body = await request.json();
    const code = normalizeAccessCode(String(body?.code || ''));
    if (!/^\d{4,8}$/.test(code)) {
      await recordFailure(ip);
      return NextResponse.json({ error: 'Kirish kodi noto‘g‘ri formatda.' }, { status: 400 });
    }

    const configuredAdminCode = process.env.ADMIN_ENTRY_CODE?.trim() || '';
    const adminEntryCode = /^\d{4,8}$/.test(configuredAdminCode) ? configuredAdminCode : '';
    if (adminEntryCode && constantTimeEqual(code, adminEntryCode)) {
      await clearRateLimit(ip);
      const response = NextResponse.json({ adminChallenge: true });
      response.cookies.set(ADMIN_CHALLENGE_COOKIE, createAdminChallengeToken(), adminChallengeCookieOptions);
      return response;
    }

    const supabase = getServiceSupabase();
    const now = new Date().toISOString();
    const codeHash = hashAccessCode(code);

    const { data: access, error: accessError } = await supabase
      .from('login_codes')
      .select('id,student_id,expires_at,used_at')
      .eq('code_hash', codeHash)
      .is('used_at', null)
      .limit(1)
      .maybeSingle();

    if (accessError) throw accessError;
    if (!access || new Date(access.expires_at).getTime() <= Date.now()) {
      await recordFailure(ip);
      return NextResponse.json({ error: 'Kod noto‘g‘ri yoki muddati tugagan.' }, { status: 401 });
    }

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id,telegram_id,telegram_username,first_name,last_name,status')
      .eq('id', access.student_id)
      .eq('status', 'active')
      .maybeSingle();

    if (studentError) throw studentError;
    if (!student) {
      await recordFailure(ip);
      return NextResponse.json({ error: 'Student profili faol emas.' }, { status: 403 });
    }

    if (!isStudentAllowedDuringMaintenance(student.id)) {
      await clearRateLimit(ip);
      return NextResponse.json(
        { error: 'Platformada texnik ishlar olib borilmoqda.', maintenance: true },
        { status: 503, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const token = createSessionToken(
      student.id,
      Number(student.telegram_id),
      student.first_name,
      student.last_name,
    );

    const { data: consumed, error: consumeError } = await supabase
      .from('login_codes')
      .update({ used_at: now })
      .eq('id', access.id)
      .is('used_at', null)
      .select('id')
      .maybeSingle();

    if (consumeError) throw consumeError;
    if (!consumed) {
      await recordFailure(ip);
      return NextResponse.json({ error: 'Bu kod allaqachon ishlatilgan.' }, { status: 409 });
    }

    const { error: loginTimeError } = await supabase
      .from('students')
      .update({ last_login_at: now, updated_at: now })
      .eq('id', student.id);
    if (loginTimeError) {
      console.error('Student last_login_at update failed after successful code consumption', loginTimeError);
    }

    await clearRateLimit(ip);
    const response = NextResponse.json({
      student: {
        id: student.id,
        firstName: student.first_name,
        lastName: student.last_name,
        username: student.telegram_username,
      },
      next: '/mock',
    });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return response;
  } catch (error) {
    console.error('Student login failed', error);
    return NextResponse.json({ error: 'Login server error' }, { status: 500 });
  }
}
