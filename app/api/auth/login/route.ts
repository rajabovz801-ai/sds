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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const code = normalizeAccessCode(String(body?.code || ''));
    if (!/^\d{4,8}$/.test(code)) {
      return NextResponse.json({ error: 'Kirish kodi noto‘g‘ri formatda.' }, { status: 400 });
    }

    const configuredAdminCode = process.env.ADMIN_ENTRY_CODE?.trim() || '';
    const adminEntryCode = /^\d{4,8}$/.test(configuredAdminCode) ? configuredAdminCode : '909090';
    if (constantTimeEqual(code, adminEntryCode)) {
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
      return NextResponse.json({ error: 'Kod noto‘g‘ri yoki muddati tugagan.' }, { status: 401 });
    }

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id,telegram_id,telegram_username,first_name,last_name,status')
      .eq('id', access.student_id)
      .eq('status', 'active')
      .maybeSingle();

    if (studentError) throw studentError;
    if (!student) return NextResponse.json({ error: 'Student profili faol emas.' }, { status: 403 });

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
    if (!consumed) return NextResponse.json({ error: 'Bu kod allaqachon ishlatilgan.' }, { status: 409 });

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
