import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/session';
import { getServiceSupabase } from '@/lib/supabase/server';
import {
  allowedLocalAuthOrigin,
  checkRateLimit,
  cleanStudentName,
  hashStudentPasscode,
  isArkIeltsRequest,
  issueStudentLoginId,
  registerBucket,
  validPasscode,
} from '@/lib/auth/local-credentials';

function json(body: unknown, status = 200, headers?: HeadersInit) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

export async function POST(request: NextRequest) {
  if (!isArkIeltsRequest(request)) return json({ error: 'Not found' }, 404);
  if (!allowedLocalAuthOrigin(request)) return json({ error: 'Invalid request origin.' }, 403);
  if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Invalid request.' }, 415);

  try {
    const { allowed, retryAfter } = await checkRateLimit(registerBucket(request), 5, 3600);
    if (!allowed) return json({ error: 'Too many registrations. Please try again later.' }, 429, { 'Retry-After': String(retryAfter) });

    const payload = await request.text();
    if (payload.length > 4096) return json({ error: 'Request too large.' }, 413);
    const body = JSON.parse(payload);
    const firstName = cleanStudentName(body?.firstName);
    const lastName = cleanStudentName(body?.lastName);
    const passcode = body?.passcode;
    const confirmation = body?.confirmPasscode;
    if (!firstName || !lastName) return json({ error: 'Please enter a valid first and last name.' }, 400);
    if (!validPasscode(passcode)) return json({ error: 'Use at least 8 characters, including letters and numbers.' }, 400);
    if (confirmation !== passcode) return json({ error: 'The two codes do not match.' }, 400);

    const supabase = getServiceSupabase();
    const now = new Date().toISOString();
    const passwordHash = await hashStudentPasscode(passcode);
    const created = await supabase
      .from('students')
      .insert({
        first_name: firstName,
        last_name: lastName,
        status: 'active',
        telegram_id: null,
        exam_platform_enabled: false,
        updated_at: now,
      })
      .select('id')
      .single();
    if (created.error || !created.data) throw created.error || new Error('Could not create student');
    const studentId = created.data.id;

    try {
      let loginId = '';
      let saved = false;
      for (let attempt = 0; attempt < 4; attempt += 1) {
        loginId = issueStudentLoginId();
        const result = await supabase.from('ark_ielts_local_accounts').insert({
          student_id: studentId,
          login_id: loginId,
          password_hash: passwordHash,
        });
        if (!result.error) {
          saved = true;
          break;
        }
        if (result.error.code !== '23505') throw result.error;
      }
      if (!saved) throw new Error('Could not allocate unique student login ID');

      const enabled = await supabase.from('students')
        .update({ exam_platform_enabled: true, last_login_at: now, updated_at: now })
        .eq('id', studentId)
        .select('id')
        .single();
      if (enabled.error || !enabled.data) throw enabled.error || new Error('Could not activate student');

      const token = createSessionToken(studentId, null, firstName, lastName);
      const response = json({ ok: true, loginId, firstName, lastName, next: '/mock' }, 201);
      response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
      return response;
    } catch (error) {
      // This row was created by this exact request, so it is safe to roll back.
      const cleanup = await supabase.from('students').delete().eq('id', studentId);
      if (cleanup.error) console.error('ARK IELTS incomplete account cleanup failed', cleanup.error);
      throw error;
    }
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: 'Invalid registration form.' }, 400);
    console.error('ARK IELTS local registration failed', error);
    return json({ error: 'Could not create account. Please try again.' }, 500);
  }
}
