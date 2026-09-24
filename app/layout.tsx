import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "60 Day Mastery",
  description: "A focused 60-day IELTS mastery system",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
