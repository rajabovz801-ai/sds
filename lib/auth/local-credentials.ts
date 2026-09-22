import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { NextRequest } from 'next/server';
import { getServiceSupabase } from '@/lib/supabase/server';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const fallbackAttempts = new Map<string, { count: number; expires: number }>();

export function cleanStudentName(value: unknown) {
  if (typeof value !== 'string') return '';
  const name = value.normalize('NFKC').trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 60 || !/^[\p{L}\p{M}][\p{L}\p{M} .'-]*[\p{L}\p{M}]$/u.test(name)) return '';
  return name;
}

export function validPasscode(value: unknown): value is string {
  return typeof value === 'string'
    && value.length >= 8
    && value.length <= 128
    && /[A-Za-z]/.test(value)
    && /[0-9]/.test(value)
    && !/[\u0000-\u001f\u007f]/.test(value);
}

export function issueStudentLoginId() {
  const suffix = randomBytes(5).toString('hex').toUpperCase();
  return `ARK-${suffix.slice(0, 4)}-${suffix.slice(4)}`;
}

export function normalizeStudentLoginId(value: unknown) {
  const id = typeof value === 'string' ? value.trim().toUpperCase() : '';
  return /^ARK-[0-9A-F]{4}-[0-9A-F]{6}$/.test(id) ? id : null;
}

export async function hashStudentPasscode(code: string) {
  const salt = randomBytes(16);
  const key = (await scrypt(code, salt, KEY_LENGTH)) as Buffer;
  return `scrypt.v1.${salt.toString('base64url')}.${key.toString('base64url')}`;
}

export async function checkStudentPasscode(code: string, stored?: string | null) {
  const parts = stored?.split('.') || [];
  const validFormat = parts.length === 4 && parts[0] === 'scrypt' && parts[1] === 'v1';
  const salt = validFormat ? Buffer.from(parts[2], 'base64url') : Buffer.alloc(16);
  const savedKey = validFormat ? Buffer.from(parts[3], 'base64url') : Buffer.alloc(KEY_LENGTH);
  const derived = (await scrypt(code, salt.length === 16 ? salt : Buffer.alloc(16), KEY_LENGTH)) as Buffer;
  return validFormat && salt.length === 16 && savedKey.length === KEY_LENGTH
    && timingSafeEqual(savedKey, derived);
}

export function isArkIeltsRequest(request: NextRequest) {
  const host = request.nextUrl.hostname.toLowerCase();
  return host === 'arkielts.vercel.app' || host.startsWith('arkielts-') || host === 'localhost' || host === '127.0.0.1';
}

export function allowedLocalAuthOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (request.headers.get('sec-fetch-site') === 'cross-site' || !origin) return false;
  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

function bucket(request: NextRequest, suffix: string) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim() || 'unknown';
  const digest = createHash('sha256').update(ip).digest('hex');
  return `ark-ielts:${suffix}:${digest}`;
}

export function registerBucket(request: NextRequest) {
  return bucket(request, 'register');
}

export function loginBucket(request: NextRequest) {
  return bucket(request, 'login');
}

export function accountBucket(loginId: string) {
  return `ark-ielts:account:${createHash('sha256').update(loginId).digest('hex')}`;
}

export async function checkRateLimit(key: string, limit: number, windowSeconds: number) {
  const supabase = getServiceSupabase();
  try {
    const { data, error } = await supabase.rpc('consume_login_rate_limit', {
      p_bucket: key,
      p_window_seconds: windowSeconds,
      p_max_attempts: limit,
      p_increment: true,
    });
    if (error) throw error;
    const row = Array.isArray(data) ? data[0] : data;
    if (typeof row?.allowed !== 'boolean') throw new Error('Unexpected rate limiter response');
    return { allowed: row.allowed, retryAfter: Math.max(1, Number(row.retry_after) || windowSeconds) };
  } catch (error) {
    console.warn('ARK IELTS durable rate limit unavailable; using fallback', error);
    const now = Date.now();
    const previous = fallbackAttempts.get(key);
    const next = previous && previous.expires > now
      ? { count: previous.count + 1, expires: previous.expires }
      : { count: 1, expires: now + windowSeconds * 1000 };
    fallbackAttempts.set(key, next);
    return { allowed: next.count <= limit, retryAfter: Math.max(1, Math.ceil((next.expires - now) / 1000)) };
  }
}

export async function clearRateLimit(keys: string[]) {
  for (const key of keys) fallbackAttempts.delete(key);
  try {
    const { error } = await getServiceSupabase().from('login_rate_limits').delete().in('bucket', keys);
    if (error) throw error;
  } catch (error) {
    console.warn('ARK IELTS login rate limit reset failed', error);
  }
}
