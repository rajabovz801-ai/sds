import { MockAttemptClient } from '@/components/MockAttemptClient';
import { requireStudent } from '@/lib/auth/server-session';
import { getMockAttempt } from '@/lib/mockAttempts';
import { notFound } from 'next/navigation';

export default async function MockAttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const student = await requireStudent(`/mock/${id}`);
  const initialData = await getMockAttempt(student.id, id);
  if (!initialData) notFound();

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#f7f5f0',
        padding: '24px clamp(14px, 3vw, 42px) 36px',
      }}
    >
      <MockAttemptClient id={id} student={student} initialData={initialData} />
    </main>
  );
}
