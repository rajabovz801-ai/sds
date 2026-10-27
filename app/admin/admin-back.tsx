"use client";
import Link from 'next/link';
import {ArrowLeft} from 'lucide-react';
export default function AdminBack({href='/admin',ariaLabel='Back to admin panel'}:{href?:string;ariaLabel?:string}){
 return <Link className="admin-back" href={href} aria-label={ariaLabel}><ArrowLeft size={16} aria-hidden="true"/><span>Admin panel</span></Link>;
}
