import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '@/lib/auth/admin-session';

export async function getAdminServerSession() {
  const cookieStore = await cookies();
  return verifyAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

export async function requireAdminServerSession() {
  const session = await getAdminServerSession();
  if (!session) redirect('/login');
  return session;
}
