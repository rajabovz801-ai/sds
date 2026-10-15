import type {ReactNode} from 'react';
import StudyAccessGate from '@/app/components/study-access-gate';
export default function StudyLayout({children}:{children:ReactNode}){return <StudyAccessGate>{children}</StudyAccessGate>}
