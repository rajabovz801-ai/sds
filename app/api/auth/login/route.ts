import { NextRequest, NextResponse } from 'next/server';
import { hashAccessCode, normalizeAccessCode } from '@/lib/auth/codes';
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/session';
import { getServiceSupabase } from '@/lib/supabase/server';
import { constantTimeEqual } from '@/lib/auth/secrets';
import {
  ADMIN_CHALLENGE_COOKIE,
  adminChallengeCookieOptions,
  createAdminChallengeToken,
} from '@/lib/auth/admin-session';

type Attempt = { count: number; resetAt: number };
const attempts = new Map<string, Attempt>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function requestIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function addFailure(ip: string, now: number) {
  const active = attempts.get(ip);
  attempts.set(ip, { count: (active?.count || 0) + 1, resetAt: active?.resetAt || now + WINDOW_MS });
}

export async function POST(request: NextRequest) {
  try {
    const ip = requestIp(request);
    const nowMs = Date.now();
    if (attempts.size > 1000) {
      for (const [key, attempt] of attempts) if (attempt.resetAt <= nowMs) attempts.delete(key);
      if (attempts.size > 1000) attempts.clear();
    }
    const activeAttempt = attempts.get(ip);
    if (activeAttempt && activeAttempt.resetAt > nowMs && activeAttempt.count >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: 'Juda ko‘p noto‘g‘ri urinish. 10 daqiqadan keyin qayta urinib ko‘ring.' }, { status: 429, headers: { 'Retry-After': '600' } });
    }
    if (activeAttempt && activeAttempt.resetAt <= nowMs) attempts.delete(ip);

    const body = await request.json();
    const code = normalizeAccessCode(String(body?.code || ''));
    if (!/^\d{4,8}$/.test(code)) {
      addFailure(ip, nowMs);
      return NextResponse.json({ error: 'Kirish kodi noto‘g‘ri formatda.' }, { status: 400 });
    }

    const configuredAdminCode = process.env.ADMIN_ENTRY_CODE?.trim() || '';
    const adminEntryCode = /^\d{4,8}$/.test(configuredAdminCode) ? configuredAdminCode : '';
    if (adminEntryCode && constantTimeEqual(code, adminEntryCode)) {
      attempts.delete(ip);
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
      addFailure(ip, nowMs);
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
      addFailure(ip, nowMs);
      return NextResponse.json({ error: 'Student profili faol emas.' }, { status: 403 });
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
      addFailure(ip, nowMs);
      return NextResponse.json({ error: 'Bu kod allaqachon ishlatilgan.' }, { status: 409 });
    }

    const { error: loginTimeError } = await supabase
      .from('students')
      .update({ last_login_at: now, updated_at: now })
      .eq('id', student.id);
    if (loginTimeError) {
      console.error('Student last_login_at update failed after successful code consumption', loginTimeError);
    }

    attempts.delete(ip);
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
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Login server error' }, { status: 500 });
  }
}
