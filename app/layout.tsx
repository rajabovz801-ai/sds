import type { Metadata } from 'next';
import './globals.css';
import './platform.css';

export const metadata: Metadata = {
  title: 'ARK Mock Platform',
  description: 'ARK Education mock platform for IELTS and CEFR practice.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  );
}
