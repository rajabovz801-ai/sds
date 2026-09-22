import { redirect } from 'next/navigation';
import { ArkLogoIcon } from '@/components/ArkLogoIcon';
import { LocalAuthClient } from '@/components/LocalAuthClient';
import { getActiveServerSession } from '@/lib/auth/server-session';

function safeNext(value: string | string[] | undefined) {
  const path = Array.isArray(value) ? value[0] : value;
  if (!path?.startsWith('/') || path.startsWith('//')) return '/mock';
  if (path === '/login' || path.startsWith('/api/') || path.startsWith('/admin')) return '/mock';
  return path;
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const nextPath = safeNext((await searchParams).next);
  if (await getActiveServerSession()) redirect(nextPath);

  return (
    <main className="googleAuthScreen">
      <section className="googleAuthCard">
        <span className="googleAuthLogo"><ArkLogoIcon /></span>
        <p className="googleAuthKicker">ARK EDUCATION · IELTS</p>
        <LocalAuthClient nextPath={nextPath} />
      </section>
    </main>
  );
}
