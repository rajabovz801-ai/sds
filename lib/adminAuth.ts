import { NextRequest } from 'next/server';
import { readAdminSession } from '@/lib/auth/admin-session';

export type AdminAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 403; error: string };

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function isTrustedMutationOrigin(request: NextRequest) {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return true;

  // Browsers expose Sec-Fetch-Site on normal fetch/form requests. Reject an
  // explicit cross-site request even if a proxy strips Origin.
  const fetchSite = request.headers.get('sec-fetch-site')?.toLowerCase();
  if (fetchSite === 'cross-site') return false;

  // When Origin is present it must match the deployment origin exactly. This
  // blocks cross-origin POST/PATCH/DELETE requests while keeping server-side
  // and same-origin requests compatible.
  const origin = request.headers.get('origin');
  if (origin) {
    try {
      return new URL(origin).origin === request.nextUrl.origin;
    } catch {
      return false;
    }
  }

  return true;
}

export function checkAdminRequest(request: NextRequest): AdminAuthResult {
  if (!readAdminSession(request)) {
    return { ok: false, status: 401, error: 'Admin sessiyasi faol emas.' };
  }

  if (!isTrustedMutationOrigin(request)) {
    return { ok: false, status: 403, error: 'Admin so‘rovi manbasi tasdiqlanmadi.' };
  }

  return { ok: true };
}
