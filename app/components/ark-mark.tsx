export default function ArkMark({size=44}:{size?:number}) {
  return <svg width={size} height={size} viewBox="0 0 64 64" fill="none" role="img" aria-label="ARK IELTS logo">
    <rect width="64" height="64" rx="16" fill="#203B5C"/>
    <path d="M12 42V31C12 18.85 20.85 10 32 10s20 8.85 20 21v11" stroke="#FFFFFF" strokeWidth="4.4" strokeLinecap="round"/>
    <path d="M19 42V31c0-8 5.2-14 13-14s13 6 13 14v11" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" opacity=".62"/>
    <path d="M32 29V46M21 34l11-7 11 7M17 46c5-3 10-3 15 0 5-3 10-3 15 0M17 46v6c5-3 10-3 15 0 5-3 10-3 15 0v-6" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>;
}