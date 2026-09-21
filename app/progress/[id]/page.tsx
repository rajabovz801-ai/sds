import { notFound } from 'next/navigation';
import { AttemptReviewPanel } from '@/components/AttemptReviewPanel';
import { StudentWorkspaceShellClient } from '@/components/StudentWorkspaceShellClient';
import { requireStudent } from '@/lib/auth/server-session';
import { getProgressAttempt } from '@/lib/progressAttempts';

export const dynamic = 'force-dynamic';

export default async function AttemptReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const student = await requireStudent(`/progress/${id}`);
  const attempt = await getProgressAttempt(student.id, id);
  if (!attempt) notFound();

  return (
    <StudentWorkspaceShellClient student={student} active="progress">
      <AttemptReviewPanel attempt={attempt} />
    </StudentWorkspaceShellClient>
  );
}
