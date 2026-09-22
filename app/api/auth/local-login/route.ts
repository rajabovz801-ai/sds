import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/session';
import { getServiceSupabase } from '@/lib/supabase/server';
import { accountBucket, allowedLocalAuthOrigin, checkRateLimit, checkStudentPasscode, clearRateLimit, isArkIeltsRequest, loginBucket, normalizeStudentLoginId, validPasscode } from '@/lib/auth/local-credentials';

export async function POST(request: NextRequest) {
  if (!isArkIeltsRequest(request)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!allowedLocalAuthOrigin(request)) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  if (!request.headers.get('content-type')?.startsWith('application/json')) return NextResponse.json({ error: 'Invalid request.' }, { status: 415 });
  try {
    const text = await request.text();
    if (text.length > 4096) return NextResponse.json({ error: 'Request too large.' }, { status: 413 });
    const body = JSON.parse(text);
    const loginId = normalizeStudentLoginId(body?.loginId);
    const passcode = body?.passcode;
    const ipKey = loginBucket(request);
    const userKey = accountBucket(loginId || 'invalid');
    const ipLimit = await checkRateLimit(ipKey, 8, 900);
    const userLimit = await checkRateLimit(userKey, 20, 3600);
    if (!ipLimit.allowed || !userLimit.allowed) return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429, headers: { 'Cache-Control': 'no-store' } });
    if (!loginId || !validPasscode(passcode)) return NextResponse.json({ error: 'Incorrect Student ID or code.' }, { status: 401 });
    const supabase = getServiceSupabase();
    const { data: account, error: accountError } = await supabase.from('ark_ielts_local_accounts')
      .select('student_id,password_hash').eq('login_id', loginId).maybeSingle();
    if (accountError) throw accountError;
    const valid = await checkStudentPasscode(passcode, account?.password_hash);
    if (!valid || !account) return NextResponse.json({ error: 'Incorrect Student ID or code.' }, { status: 401 });
    const { data: student, error: studentError } = await supabase.from('students')
      .select('id,first_name,last_name,status,exam_platform_enabled')
      .eq('id', account.student_id).maybeSingle();
    if (studentError) throw studentError;
    if (!student || student.status !== 'active' || !student.exam_platform_enabled) return NextResponse.json({ error: 'Account unavailable.' }, { status: 403 });
    const now = new Date().toISOString();
    await Promise.all([
      supabase.from('students').update({ last_login_at: now }).eq('id', student.id),
      supabase.from('ark_ielts_local_accounts').update({ last_login_at: now }).eq('student_id', student.id),
      clearRateLimit([ipKey, userKey]),
    ]);
    const response = NextResponse.json({ ok: true, next: '/mock' }, { headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(SESSION_COOKIE, createSessionToken(student.id, null, student.first_name, student.last_name), sessionCookieOptions);
    return response;
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: 'Invalid login form.' }, { status: 400 });
    console.error('ARK IELTS local login failed', error);
    return NextResponse.json({ error: 'Sign in is temporarily unavailable.' }, { status: 500 });
  }
}
