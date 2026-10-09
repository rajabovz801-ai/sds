import "./globals.css";
import "./night-theme.css";
import SiteTheme from "./components/site-theme";
import type { Metadata, Viewport } from "next";
export const metadata:Metadata={title:"ARK IELTS · 60 Day Challenge",description:"ARK Education IELTS 60-day learning platform",robots:{index:false,follow:false}};
export const viewport:Viewport={width:"device-width",initialScale:1,viewportFit:"cover"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:'try{document.documentElement.dataset.arkTheme=localStorage.getItem("ark60-theme")==="dark"?"dark":"light"}catch{document.documentElement.dataset.arkTheme="light"}'}}/><link rel="stylesheet" href="/ark-highlight-api.css"/></head><body><SiteTheme/>{children}</body></html>}
