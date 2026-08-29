import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminServerSession } from '@/lib/auth/admin-server-session';
import { getActiveServerSession } from '@/lib/auth/server-session';

export const dynamic = 'force-dynamic';

export default async function MaintenancePage() {
  if (await getAdminServerSession()) redirect('/admin');
  if (await getActiveServerSession()) redirect('/mock');

  return (
    <main style={{
      minHeight: '100svh',
      display: 'grid',
      placeItems: 'center',
      padding: '28px',
      background: 'linear-gradient(145deg, #fbf8f2 0%, #fffdf9 52%, #f7f3ec 100%)',
      color: '#0d2a4c',
      fontFamily: 'Arial, Helvetica, sans-serif',
    }}>
      <section style={{
        width: 'min(720px, 100%)',
        padding: 'clamp(34px, 6vw, 64px)',
        border: '1px solid rgba(13,42,76,.12)',
        borderRadius: '32px',
        background: 'rgba(255,255,255,.86)',
        boxShadow: '0 24px 70px rgba(28, 43, 64, .10)',
        textAlign: 'center',
      }}>
        <div aria-hidden="true" style={{
          width: '76px',
          height: '76px',
          margin: '0 auto 24px',
          borderRadius: '24px',
          display: 'grid',
          placeItems: 'center',
          background: '#102f55',
          color: '#fff',
          boxShadow: '0 16px 36px rgba(16,47,85,.22)',
          fontSize: '34px',
        }}>⚙</div>

        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 13px',
          borderRadius: '999px',
          background: '#fff3ee',
          color: '#e76452',
          fontSize: '12px',
          fontWeight: 800,
          letterSpacing: '.08em',
          textTransform: 'uppercase',
        }}>ARK Education • System update</div>

        <h1 style={{
          margin: '22px 0 14px',
          fontSize: 'clamp(34px, 6vw, 58px)',
          lineHeight: 1.02,
          letterSpacing: '-.035em',
        }}>Texnik ishlar olib borilmoqda</h1>

        <p style={{
          maxWidth: '560px',
          margin: '0 auto',
          color: '#65758a',
          fontSize: 'clamp(16px, 2.3vw, 19px)',
          lineHeight: 1.7,
        }}>
          Platformada yangilanish ishlari ketmoqda. Hozircha umumiy kirish vaqtincha yopilgan.
          Tez orada odatdagi tartibda yana foydalanishingiz mumkin bo‘ladi.
        </p>

        <div style={{
          margin: '30px auto 0',
          width: 'min(500px, 100%)',
          padding: '16px 18px',
          borderRadius: '18px',
          background: '#f7f9fc',
          border: '1px solid rgba(13,42,76,.08)',
          color: '#6b7d91',
          fontSize: '14px',
          lineHeight: 1.55,
        }}>
          Tushunganingiz uchun rahmat. ARK Education jamoasi platformani yaxshilash ustida ishlamoqda.
        </div>

        <Link href="/login" style={{
          display: 'inline-block',
          marginTop: '24px',
          color: '#8b98a8',
          fontSize: '12px',
          textDecoration: 'none',
        }}>Authorized access</Link>
      </section>
    </main>
  );
}
