import { ExamSectionsClient } from '@/components/ExamSectionsClient';
import { requireServerSession } from '@/lib/auth/server-session';

export default async function IeltsPage() {
  await requireServerSession('/ielts');
  return <ExamSectionsClient track="ielts" />;
}
