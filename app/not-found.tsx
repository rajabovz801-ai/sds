import Link from 'next/link';
import { ArkLogoIcon } from '@/components/ArkLogoIcon';

export default function NotFound() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f7f3eb', color: '#102b52' }}>
      <section style={{ width: 'min(560px, 100%)', textAlign: 'center', padding: '48px 28px', border: '1px solid rgba(16,43,82,.1)', borderRadius: 24, background: '#fff', boxShadow: '0 18px 50px rgba(16,43,82,.08)' }}>
        <div style={{ width: 54, height: 54, margin: '0 auto 18px', display: 'grid', placeItems: 'center', borderRadius: 16, background: '#102b52', color: '#fff' }}>
          <ArkLogoIcon />
        </div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 800, letterSpacing: '.14em' }}>ERROR 404</p>
        <h1 style={{ margin: '12px 0 10px', fontSize: 'clamp(30px, 6vw, 46px)', lineHeight: 1.05 }}>Sahifa topilmadi</h1>
        <p style={{ margin: '0 auto 28px', maxWidth: 430, color: '#64748b', lineHeight: 1.7 }}>
          Bu manzil mavjud emas yoki sahifa ko‘chirilgan. ARK Education bosh sahifasiga qaytishingiz yoki mock testga kirishingiz mumkin.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/" style={{ padding: '13px 18px', borderRadius: 12, background: '#102b52', color: '#fff', textDecoration: 'none', fontWeight: 800 }}>
            Bosh sahifaga qaytish
          </Link>
          <Link href="/login?next=/mock" style={{ padding: '13px 18px', borderRadius: 12, border: '1px solid rgba(16,43,82,.16)', color: '#102b52', textDecoration: 'none', fontWeight: 800 }}>
            Mock testga kirish
          </Link>
        </div>
      </section>
    </main>
  );
}
