import { ActiveMockBanner } from '@/components/ActiveMockBanner';
import { StudentDashboardClient } from '@/components/StudentDashboardClient';
import { requireStudent } from '@/lib/auth/server-session';
import { getActiveMockForStudent } from '@/lib/activeMock';
import { getDashboardData } from '@/lib/dashboard';

export const dynamic = 'force-dynamic';

export default async function MockPage() {
  const student = await requireStudent('/mock');
  const [data, activeMock] = await Promise.all([
    getDashboardData(student.id),
    getActiveMockForStudent(student.id),
  ]);
  return <><StudentDashboardClient student={student} initialData={data} /><ActiveMockBanner mock={activeMock} /></>;
}
