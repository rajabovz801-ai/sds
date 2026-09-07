import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import './platform.css';
import './landing-home-v4.css';
import './landing-professional-polish.css';
import './landing-skills-showcase.css';
import './landing-ielts-exam.css';
import './auth.css';
import './mobile-public-hardening.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://arkielts.vercel.app'),
  title: 'ARK EDUCATION — IELTS & CEFR Exam Platform',
  description: 'Professional IELTS and CEFR practice platform with realistic exam interfaces, full mock exams, detailed results and progress tracking.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: 'ARK EDUCATION',
    title: 'ARK EDUCATION — IELTS & CEFR Exam Platform',
    description: 'IELTS and CEFR practice with realistic exam interfaces, full mock exams, results and review.',
  },
  twitter: {
    card: 'summary',
    title: 'ARK EDUCATION — IELTS & CEFR Exam Platform',
    description: 'IELTS and CEFR practice with realistic exam interfaces, full mock exams, results and review.',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz" className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
