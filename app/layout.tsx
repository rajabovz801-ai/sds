import type { Metadata } from 'next';
import './globals.css';
import './platform.css';
import './polish.css';
import './auth.css';
import './mock-results.css';

export const metadata: Metadata = {
  title: 'ARK Exam Hub — IELTS & CEFR Practice Platform',
  description: 'Professional IELTS and CEFR practice platform with mock tests, cloud test library, dashboard and result tracking.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  );
}
