import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

export const SESSION_COOKIE = 'ark_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  studentId: string;
  telegramId: number;
  exp: number;
};

function sessionSecret() {
  const value =
    process.env.AUTH_SESSION_SECRET?.trim() ||
    process.env.ADMIN_ACCESS_KEY?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim();

  if (!value) throw new Error('Server session secret is not configured');
  return value;
}

function signature(body: string) {
  return createHmac('sha256', sessionSecret()).update(body).digest('base64url');
}

export function createSessionToken(studentId: string, telegramId: number) {
  const payload: SessionPayload = {
    studentId,
    telegramId,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${body}.${signature(body)}`;
}

export function verifySessionToken(token?: string | null): SessionPayload | null {
  if (!token) return null;
  const [body, sentSignature] = token.split('.');
  if (!body || !sentSignature) return null;

  try {
    const expected = Buffer.from(signature(body));
    const received = Buffer.from(sentSignature);
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload.studentId || !payload.telegramId || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function readSession(request: NextRequest) {
  return verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_TTL_SECONDS,
};
