import { MockAttemptClient } from '@/components/MockAttemptClient';
import { PlatformNav } from '@/components/PlatformNav';
import { requireStudent } from '@/lib/auth/server-session';
import { getMockAttempt } from '@/lib/mockAttempts';
import { notFound } from 'next/navigation';

export default async function MockAttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const student = await requireStudent(`/mock/${id}`);
  const initialData = await getMockAttempt(student.id, id);
  if (!initialData) notFound();
  return (
    <div className="platformRoot">
      <PlatformNav student={student} />
      <main className="platformMain">
        <MockAttemptClient id={id} student={student} initialData={initialData} />
      </main>
    </div>
  );
}
