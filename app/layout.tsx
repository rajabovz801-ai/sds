import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import './platform.css';
import './landing-home-v4.css';
import './landing-professional-polish.css';
import './auth.css';
import './mock-results.css';
import './workspace-v2.css';
import './dashboard-live.css';
import './dashboard-polish.css';
import './dashboard-artwork.css';
import './dashboard-kpi-icons.css';
import './dashboard-analytics-polish.css';
import './dashboard-daily-tasks.css';
import './daily-tasks-polish.css';
import './student-workspace-shell.css';
import './ielts-library-card-fix.css';
import './practice-hub.css';
import './ui-safety-polish.css';
import './scoreup-inspired-polish.css';
import './student-premium-density.css';
import './dashboard-skill-performance.css';

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
