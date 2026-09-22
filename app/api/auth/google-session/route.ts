import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/session';
import { getServiceSupabase } from '@/lib/supabase/server';
import { isArkIeltsRequest } from '@/lib/auth/local-credentials';

function names(user: { email?: string | null; user_metadata?: Record<string, unknown> }) {
  const meta = user.user_metadata || {};
  const full = String(meta.full_name || meta.name || '').trim();
  const parts = full.split(/\s+/).filter(Boolean);
  const fallback = String(user.email || '').split('@')[0] || 'Student';
  return {
    firstName: String(meta.given_name || parts[0] || fallback).trim().slice(0, 80),
    lastName: String(meta.family_name || parts.slice(1).join(' ') || '').trim().slice(0, 80),
    avatarUrl: String(meta.avatar_url || meta.picture || '').trim() || null,
  };
}

export async function POST(request: NextRequest) {
  if (isArkIeltsRequest(request)) {
    return NextResponse.json({ error: 'Please register or sign in using your Student ID.' }, { status: 410, headers: { 'Cache-Control': 'no-store' } });
  }
  try {
    const body = await request.json();
    const accessToken = String(body?.accessToken || '').trim();
    if (!accessToken) return NextResponse.json({ error: 'Google token topilmadi.' }, { status: 400 });

    const supabase = getServiceSupabase();
    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken);
    const user = authData.user;
    if (authError || !user) return NextResponse.json({ error: 'Google sessiyasi yaroqsiz.' }, { status: 401 });

    const isGoogle = user.app_metadata?.provider === 'google'
      || user.identities?.some((identity) => identity.provider === 'google');
    const email = String(user.email || '').trim().toLowerCase();
    if (!isGoogle || !email) return NextResponse.json({ error: 'Faqat Google account bilan kirish mumkin.' }, { status: 403 });

    const profile = names(user);
    const now = new Date().toISOString();

    let { data: student, error: studentError } = await supabase
      .from('students')
      .select('id,first_name,last_name,status,auth_user_id,email')
      .eq('auth_user_id', user.id)
      .maybeSingle();
    if (studentError) throw studentError;

    if (!student) {
      const byEmail = await supabase
        .from('students')
        .select('id,first_name,last_name,status,auth_user_id,email')
        .ilike('email', email)
        .maybeSingle();
      if (byEmail.error) throw byEmail.error;
      student = byEmail.data;
    }

    if (student?.status === 'blocked') {
      return NextResponse.json({ error: 'Bu account bloklangan.' }, { status: 403 });
    }

    if (!student) {
      const created = await supabase
        .from('students')
        .insert({
          auth_user_id: user.id,
          email,
          first_name: profile.firstName,
          last_name: profile.lastName,
          avatar_url: profile.avatarUrl,
          status: 'active',
          exam_platform_enabled: true,
          last_login_at: now,
          updated_at: now,
        })
        .select('id,first_name,last_name,status,auth_user_id,email')
        .single();
      if (created.error) throw created.error;
      student = created.data;
    } else {
      const updated = await supabase
        .from('students')
        .update({
          auth_user_id: user.id,
          email,
          first_name: profile.firstName || student.first_name,
          last_name: profile.lastName || student.last_name,
          avatar_url: profile.avatarUrl,
          exam_platform_enabled: true,
          last_login_at: now,
          updated_at: now,
        })
        .eq('id', student.id)
        .select('id,first_name,last_name,status,auth_user_id,email')
        .single();
      if (updated.error) throw updated.error;
      student = updated.data;
    }

    const token = createSessionToken(student.id, null, student.first_name, student.last_name);
    const response = NextResponse.json({ next: '/mock' });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions);
    return response;
  } catch (error) {
    console.error('Google session login failed', error);
    return NextResponse.json({ error: 'Google login server error.' }, { status: 500 });
  }
}
