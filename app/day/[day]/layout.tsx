import type {ReactNode} from 'react';
import StudyAccessGate from '@/app/components/study-access-gate';
import LessonResumeTracker from '@/app/components/lesson-resume-tracker';
export default function StudyLayout({children}:{children:ReactNode}){return <StudyAccessGate><LessonResumeTracker/>{children}</StudyAccessGate>}
