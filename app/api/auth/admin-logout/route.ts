import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_CHALLENGE_COOKIE, ADMIN_SESSION_COOKIE, adminChallengeCookieOptions, adminSessionCookieOptions } from '@/lib/auth/admin-session';

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

export async function POST(request: NextRequest) {
  if (!requestOriginAllowed(request)) {
    return NextResponse.json(
      { error: 'Admin logout so‘rovi manbasi tasdiqlanmadi.' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(ADMIN_SESSION_COOKIE, '', { ...adminSessionCookieOptions, maxAge: 0 });
  response.cookies.set(ADMIN_CHALLENGE_COOKIE, '', { ...adminChallengeCookieOptions, maxAge: 0 });
  return response;
}
