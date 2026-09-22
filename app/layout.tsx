import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import './platform.css';
import './landing-ielts-exam.css';
import './auth.css';
import './mobile-public-hardening.css';
import './minimal-entry.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://arkielts.vercel.app'),
  title: 'ARK EDUCATION — IELTS Reading & Listening',
  description: 'IELTS Reading and Listening practice with Real Exam, Cambridge and Gold test collections.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'ARK EDUCATION',
    title: 'ARK EDUCATION — IELTS Reading & Listening',
    description: 'IELTS Reading and Listening tests in Real Exam, Cambridge and Gold collections.',
  },
  twitter: {
    card: 'summary',
    title: 'ARK EDUCATION — IELTS Reading & Listening',
    description: 'IELTS Reading and Listening tests in Real Exam, Cambridge and Gold collections.',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz" className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
