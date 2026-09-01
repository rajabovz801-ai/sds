import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import './platform.css';
import './landing-home-v4.css';
import './landing-professional-polish.css';
import './auth.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ARK EDUCATION — IELTS & CEFR Exam Platform',
  description: 'Professional IELTS and CEFR practice platform with realistic exam interfaces, full mock exams, detailed results and progress tracking.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz" className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
