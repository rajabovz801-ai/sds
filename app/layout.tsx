import type { Metadata } from 'next';
import './globals.css';
import './platform.css';
import './polish.css';
import './landing-v2.css';
import './landing-v3.css';
import './landing-gate-polish.css';
import './landing-ios26.css';
import './landing-ios26-light.css';
import './mock-flow.css';
import './skill-flow.css';
import './auth.css';
import './mock-results.css';

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
