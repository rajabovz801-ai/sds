import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = {title:"ARK Education",description:"Platforma yangilanmoqda.",robots:{index:false,follow:false}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="uz"><body>{children}</body></html>}
