import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { getSessionSecret } from '@/lib/auth/secrets';

export const ADMIN_SESSION_COOKIE = 'ark_admin_session';
export const ADMIN_CHALLENGE_COOKIE = 'ark_admin_challenge';
const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 10;
const ADMIN_CHALLENGE_TTL_SECONDS = 60 * 5;

type AdminSessionPayload = {
  role: 'admin';
  exp: number;
};

type AdminChallengePayload = {
  role: 'admin-challenge';
  exp: number;
};

function signature(body: string) {
  return createHmac('sha256', `${getSessionSecret()}:admin`).update(body).digest('base64url');
}

export function createAdminSessionToken() {
  const payload: AdminSessionPayload = {
    role: 'admin',
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${body}.${signature(body)}`;
}

export function verifyAdminSessionToken(token?: string | null): AdminSessionPayload | null {
  if (!token) return null;
  const [body, sentSignature] = token.split('.');
  if (!body || !sentSignature) return null;

  try {
    const expected = Buffer.from(signature(body));
    const received = Buffer.from(sentSignature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as AdminSessionPayload;
    if (payload.role !== 'admin' || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function readAdminSession(request: NextRequest) {
  return verifyAdminSessionToken(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}

export function createAdminChallengeToken() {
  const payload: AdminChallengePayload = {
    role: 'admin-challenge',
    exp: Math.floor(Date.now() / 1000) + ADMIN_CHALLENGE_TTL_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${body}.${signature(body)}`;
}

export function verifyAdminChallengeToken(token?: string | null): AdminChallengePayload | null {
  if (!token) return null;
  const [body, sentSignature] = token.split('.');
  if (!body || !sentSignature) return null;
  try {
    const expected = Buffer.from(signature(body));
    const received = Buffer.from(sentSignature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as AdminChallengePayload;
    if (payload.role !== 'admin-challenge' || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function readAdminChallenge(request: NextRequest) {
  return verifyAdminChallengeToken(request.cookies.get(ADMIN_CHALLENGE_COOKIE)?.value);
}

export const adminSessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: ADMIN_SESSION_TTL_SECONDS,
};

export const adminChallengeCookieOptions = {
  ...adminSessionCookieOptions,
  maxAge: ADMIN_CHALLENGE_TTL_SECONDS,
};
