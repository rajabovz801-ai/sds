import "./globals.css";
import type { Metadata } from "next";
import {Geist,Literata} from "next/font/google";
const geist=Geist({subsets:["latin"],display:"swap",variable:"--ark-geist"});
const literata=Literata({subsets:["latin"],display:"swap",variable:"--ark-literata"});
export const metadata:Metadata={title:"ARK IELTS · 60 Day Challenge",description:"ARK Education IELTS 60-day learning platform",robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body className={`${geist.variable} ${literata.variable}`}>{children}</body></html>}