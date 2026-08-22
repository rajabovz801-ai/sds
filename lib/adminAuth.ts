import { NextRequest } from 'next/server';
import { readAdminSession } from '@/lib/auth/admin-session';
import { constantTimeEqual } from '@/lib/auth/secrets';

export type AdminAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 503; error: string };

export function checkAdminRequest(request: NextRequest): AdminAuthResult {
  if (readAdminSession(request)) return { ok: true };

  const expected = process.env.ADMIN_ACCESS_KEY?.trim();
  if (!expected) {
    return {
      ok: false,
      status: 503,
      error: 'ADMIN_ACCESS_KEY serverda sozlanmagan. Vercel Environment Variables ni tekshirib, keyin Redeploy qiling.',
    };
  }

  const received = request.headers.get('x-admin-key')?.trim();
  if (!received || !constantTimeEqual(received, expected)) {
    return { ok: false, status: 401, error: 'Admin access key noto‘g‘ri.' };
  }

  return { ok: true };
}
