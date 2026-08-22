import { ExamSectionsClient } from '@/components/ExamSectionsClient';
import { requireServerSession } from '@/lib/auth/server-session';

export default async function CefrPage() {
  await requireServerSession('/cefr');
  return <ExamSectionsClient track="cefr" />;
}
