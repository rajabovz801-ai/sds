import { AdminAttemptResetPanel } from '@/components/AdminAttemptResetPanel';
import { AdminClient } from '@/components/AdminClient';
import { AdminDailyTasksPanel } from '@/components/AdminDailyTasksPanel';
import { AdminLargeHtmlUploadBridge } from '@/components/AdminLargeHtmlUploadBridge';
import { AdminMenuPreview } from '@/components/AdminMenuPreview';
import { AdminMockManager } from '@/components/AdminMockManager';
import { AdminPanelSafetyPolish } from '@/components/AdminPanelSafetyPolish';
import { AdminProfessionalLayer } from '@/components/AdminProfessionalLayer';
import { AdminReadableTypography } from '@/components/AdminReadableTypography';
import { AdminResultsFilterFix } from '@/components/AdminResultsFilterFix';
import { AdminSpeakingMockPanel } from '@/components/AdminSpeakingMockPanel';
import { AdminStudentResultsDropdown } from '@/components/AdminStudentResultsDropdown';
import { AdminTestManagerDropdown } from '@/components/AdminTestManagerDropdown';
import { AdminVocabularyQuizPanel } from '@/components/AdminVocabularyQuizPanel';
import { requireAdminServerSession } from '@/lib/auth/admin-server-session';

export default async function AdminPage() {
  await requireAdminServerSession();
  return <div className="adminRoot"><AdminLargeHtmlUploadBridge /><AdminReadableTypography /><AdminPanelSafetyPolish /><AdminClient /><AdminVocabularyQuizPanel /><AdminDailyTasksPanel /><AdminMenuPreview /><AdminProfessionalLayer /><AdminResultsFilterFix /><AdminStudentResultsDropdown /><AdminTestManagerDropdown /><AdminAttemptResetPanel /><AdminMockManager /><AdminSpeakingMockPanel /></div>;
}
