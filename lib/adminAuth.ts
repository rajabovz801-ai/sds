import { NextRequest } from 'next/server';
import { readAdminSession } from '@/lib/auth/admin-session';

export type AdminAuthResult =
  | { ok: true }
  | { ok: false; status: 401; error: string };

export function checkAdminRequest(request: NextRequest): AdminAuthResult {
  if (readAdminSession(request)) return { ok: true };
  return { ok: false, status: 401, error: 'Admin sessiyasi faol emas.' };
}
