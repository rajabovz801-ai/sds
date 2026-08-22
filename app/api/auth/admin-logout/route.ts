import { NextResponse } from 'next/server';
import { ADMIN_CHALLENGE_COOKIE, ADMIN_SESSION_COOKIE, adminChallengeCookieOptions, adminSessionCookieOptions } from '@/lib/auth/admin-session';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, '', { ...adminSessionCookieOptions, maxAge: 0 });
  response.cookies.set(ADMIN_CHALLENGE_COOKIE, '', { ...adminChallengeCookieOptions, maxAge: 0 });
  return response;
}
