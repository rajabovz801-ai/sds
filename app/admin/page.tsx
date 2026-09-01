import { AdminClient } from '@/components/AdminClient';
import { AdminLargeHtmlUploadBridge } from '@/components/AdminLargeHtmlUploadBridge';
import { AdminMenuPreview } from '@/components/AdminMenuPreview';
import { AdminPanelSafetyPolish } from '@/components/AdminPanelSafetyPolish';
import { AdminProfessionalLayer } from '@/components/AdminProfessionalLayer';
import { AdminReadableTypography } from '@/components/AdminReadableTypography';
import { AdminResultsFilterFix } from '@/components/AdminResultsFilterFix';
import { AdminStudentResultsDropdown } from '@/components/AdminStudentResultsDropdown';
import { AdminTestManagerDropdown } from '@/components/AdminTestManagerDropdown';
import { AdminTestScopeBridge } from '@/components/AdminTestScopeBridge';
import { AdminToolsHub } from '@/components/AdminToolsHub';
import { requireAdminServerSession } from '@/lib/auth/admin-server-session';

export default async function AdminPage() {
  await requireAdminServerSession();
  return <div className="adminRoot"><AdminTestScopeBridge /><AdminLargeHtmlUploadBridge /><AdminReadableTypography /><AdminPanelSafetyPolish /><AdminClient /><AdminMenuPreview /><AdminProfessionalLayer /><AdminResultsFilterFix /><AdminStudentResultsDropdown /><AdminTestManagerDropdown /><AdminToolsHub /></div>;
}
