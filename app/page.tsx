import { redirect } from 'next/navigation';
import { ArkSplashClient } from '@/components/ArkSplashClient';
import { getActiveServerSession } from '@/lib/auth/server-session';
import { getAdminServerSession } from '@/lib/auth/admin-server-session';

export default async function HomePage() {
  if (await getAdminServerSession()) redirect('/admin');
  if (await getActiveServerSession()) redirect('/mock');
  return <ArkSplashClient />;
}
