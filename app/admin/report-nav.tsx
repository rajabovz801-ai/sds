"use client";
import Link from 'next/link';
import {usePathname} from 'next/navigation';
const links=[['reading','Reading'],['listening','Listening'],['mock','Full Mock'],['writing','Writing'],['speaking','Speaking']];
export default function ReportNav(){const pathname=usePathname();return <nav className="admin-report-nav" aria-label="Admin reports">{links.map(([path,label])=><Link key={path} href={'/admin/'+path} aria-current={pathname==='/admin/'+path?'page':undefined}>{label}</Link>)}</nav>}
