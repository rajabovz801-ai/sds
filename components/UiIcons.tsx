import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...props}>
      {children}
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps) { return <IconBase {...props}><path d="M5 12h14M14 7l5 5-5 5" /></IconBase>; }
export function ArrowLeftIcon(props: IconProps) { return <IconBase {...props}><path d="m10 6-6 6 6 6M4 12h16" /></IconBase>; }
export function ArrowUpRightIcon(props: IconProps) { return <IconBase {...props}><path d="M7 17 17 7M8 7h9v9" /></IconBase>; }
export function BotIcon(props: IconProps) { return <IconBase {...props}><rect x="4" y="7" width="16" height="12" rx="4" /><path d="M12 3v4M8 12h.01M16 12h.01M8 16h8" /></IconBase>; }
export function KeyRoundIcon(props: IconProps) { return <IconBase {...props}><circle cx="8" cy="15" r="4" /><path d="m11 12 8-8M16 7l2 2M14 9l2 2" /></IconBase>; }
export function LogInIcon(props: IconProps) { return <IconBase {...props}><path d="M14 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-3" /><path d="M10 12h11M17 8l4 4-4 4" /></IconBase>; }
export function LogOutIcon(props: IconProps) { return <IconBase {...props}><path d="M10 8V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-3" /><path d="M14 12H3M7 8l-4 4 4 4" /></IconBase>; }
export function ShieldCheckIcon(props: IconProps) { return <IconBase {...props}><path d="M12 3 5 6v5c0 4.7 2.8 8 7 10 4.2-2 7-5.3 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></IconBase>; }
export function CheckCircleIcon(props: IconProps) { return <IconBase {...props}><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></IconBase>; }
export function GlobeIcon(props: IconProps) { return <IconBase {...props}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.3 2.5 3.5 5.5 3.5 9S14.3 18.5 12 21M12 3C9.7 5.5 8.5 8.5 8.5 12S9.7 18.5 12 21" /></IconBase>; }
export function LayersIcon(props: IconProps) { return <IconBase {...props}><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></IconBase>; }
export function HeadphonesIcon(props: IconProps) { return <IconBase {...props}><path d="M4 14a8 8 0 0 1 16 0" /><path d="M18 19c1.1 0 2-.9 2-2v-3h-4v5h2ZM6 19c-1.1 0-2-.9-2-2v-3h4v5H6Z" /></IconBase>; }
export function BookOpenIcon(props: IconProps) { return <IconBase {...props}><path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2Z" /><path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7Z" /></IconBase>; }
export function PenToolIcon(props: IconProps) { return <IconBase {...props}><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" /><path d="m13.5 8 3 3M4 20h6" /></IconBase>; }
export function MicIcon(props: IconProps) { return <IconBase {...props}><rect x="9" y="3" width="6" height="12" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8" /></IconBase>; }
export function LayoutGridIcon(props: IconProps) { return <IconBase {...props}><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></IconBase>; }
export function SparklesIcon(props: IconProps) { return <IconBase {...props}><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z" /><path d="m18.5 14 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z" /></IconBase>; }
export function FileTextIcon(props: IconProps) { return <IconBase {...props}><path d="M6 2h8l4 4v16H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" /><path d="M14 2v5h5M8 12h8M8 16h6" /></IconBase>; }
export function UploadCloudIcon(props: IconProps) { return <IconBase {...props}><path d="M7 18H5a3 3 0 0 1-.4-6A6 6 0 0 1 16 9a4.5 4.5 0 0 1 1 8.9" /><path d="m9 14 3-3 3 3M12 11v10" /></IconBase>; }
export function EditIcon(props: IconProps) { return <IconBase {...props}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></IconBase>; }
export function TrashIcon(props: IconProps) { return <IconBase {...props}><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6" /></IconBase>; }
export function ClockIcon(props: IconProps) { return <IconBase {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></IconBase>; }
export function LibraryIcon(props: IconProps) { return <IconBase {...props}><path d="M4 4h5v16H4zM10 4h5v16h-5zM16 5l4-1 2 15-5 1z" /></IconBase>; }
export function UserIcon(props: IconProps) { return <IconBase {...props}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></IconBase>; }
export function SearchIcon(props: IconProps) { return <IconBase {...props}><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></IconBase>; }
export function HomeIcon(props: IconProps) { return <IconBase {...props}><path d="m3 11 9-8 9 8" /><path d="M5 10v10h14V10M9 20v-6h6v6" /></IconBase>; }
export function HelpCircleIcon(props: IconProps) { return <IconBase {...props}><circle cx="12" cy="12" r="9" /><path d="M9.7 9a2.5 2.5 0 1 1 4.1 1.9c-.9.7-1.8 1.2-1.8 2.6M12 17h.01" /></IconBase>; }
