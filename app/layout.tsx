import "./globals.css";
import type { Metadata } from "next";
export const metadata:Metadata={title:"ARK IELTS · 60 Day Challenge",description:"ARK Education IELTS 60-day learning platform",robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}