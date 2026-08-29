import type { Metadata } from 'next';
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

export const metadata: Metadata = {
  title: 'ARK EDUCATION — IELTS Exam & Practice Platform',
  description: 'Professional IELTS practice platform with realistic exam interfaces, full mock exams, detailed results and progress tracking.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  );
}
