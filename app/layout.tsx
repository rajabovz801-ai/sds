import type { Metadata } from 'next';
import './globals.css';
import './platform.css';
import './polish.css';
import './auth.css';
import './mock-results.css';

export const metadata: Metadata = {
  title: 'ARK Mock — IELTS & CEFR Exam Platform',
  description: 'Professional IELTS and CEFR mock exam platform with cloud tests, dashboard, admin control and result tracking.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  );
}
