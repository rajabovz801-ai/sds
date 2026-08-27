import { DashboardClient } from '@/components/DashboardClient';
import { requireStudent } from '@/lib/auth/server-session';
import { getDashboardData } from '@/lib/dashboard';

export const dynamic = 'force-dynamic';

export default async function MockPage() {
  const student = await requireStudent('/mock');
  const data = await getDashboardData(student.id);
  return <DashboardClient student={student} initialData={data} />;
}
