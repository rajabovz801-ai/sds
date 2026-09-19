import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRequest } from '@/lib/adminAuth';
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/session';
import { getServiceSupabase } from '@/lib/supabase/server';

const PREVIEW_COOKIE = 'ark_admin_student_preview';
const PREVIOUS_SESSION_COOKIE = 'ark_admin_preview_previous_session';

const previewCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 60 * 60 * 10,
};

export async function POST(request: NextRequest) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const supabase = getServiceSupabase();
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('telegram_id,name')
      .eq('active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (adminError) throw adminError;
    if (!admin?.telegram_id) {
      return NextResponse.json({ error: 'Admin profiliga bog‘langan Telegram ID topilmadi.' }, { status: 409 });
    }

    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id,telegram_id,first_name,last_name,status')
      .eq('telegram_id', admin.telegram_id)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();
    if (studentError) throw studentError;
    if (!student) {
      return NextResponse.json({ error: 'Admin uchun preview student profili topilmadi.' }, { status: 409 });
    }

    const token = createSessionToken(
      String(student.id),
      Number(student.telegram_id),
      String(student.first_name || 'Admin'),
      String(student.last_name || ''),
    );

    const response = NextResponse.json({ ok: true, next: '/mock' });
    const previous = request.cookies.get(SESSION_COOKIE)?.value;
    if (previous && request.cookies.get(PREVIEW_COOKIE)?.value !== '1') {
      response.cookies.set(PREVIOUS_SESSION_COOKIE, previous, previewCookieOptions);
    }
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    response.cookies.set(PREVIEW_COOKIE, '1', previewCookieOptions);
    return response;
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Admin student preview ochilmadi.',
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const response = NextResponse.json({ ok: true, next: '/admin' });
  const previous = request.cookies.get(PREVIOUS_SESSION_COOKIE)?.value;
  if (previous) response.cookies.set(SESSION_COOKIE, previous, sessionCookieOptions);
  else response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(PREVIEW_COOKIE);
  response.cookies.delete(PREVIOUS_SESSION_COOKIE);
  return response;
}
