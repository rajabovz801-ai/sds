import { NextRequest, NextResponse } from 'next/server';
import { readActiveStudentSession } from '@/lib/auth/active-student';
import { getServiceSupabase } from '@/lib/supabase/server';

const MAX_DRAFT_BYTES = 220 * 1024;

async function getOwnedMockSession(request: NextRequest, id: string) {
  const student = await readActiveStudentSession(request);
  if (!student) return { error: NextResponse.json({ error: 'Student sessiyasi faol emas.' }, { status: 403 }) } as const;

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from('test_sessions')
    .select('id,status,mode,expires_at,draft_state,draft_saved_at')
    .eq('id', id)
    .eq('student_id', student.studentId)
    .eq('mode', 'mock')
    .eq('superseded', false)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { error: NextResponse.json({ error: 'Mock test session topilmadi.' }, { status: 404 }) } as const;
  return { student, supabase, session: data } as const;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const owned = await getOwnedMockSession(request, id);
    if ('error' in owned) return owned.error;
    return NextResponse.json({
      state: owned.session.draft_state || {},
      savedAt: owned.session.draft_saved_at || null,
      status: owned.session.status,
      expiresAt: owned.session.expires_at,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Draft o‘qilmadi.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const owned = await getOwnedMockSession(request, id);
    if ('error' in owned) return owned.error;
    if (owned.session.status !== 'in_progress') {
      return NextResponse.json({ error: 'Bu test session yakunlangan.' }, { status: 409 });
    }
    if (new Date(owned.session.expires_at).getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Test vaqti tugagan.' }, { status: 410 });
    }

    const body = await request.json();
    const state = body?.state;
    if (!state || typeof state !== 'object' || Array.isArray(state)) {
      return NextResponse.json({ error: 'Draft state noto‘g‘ri.' }, { status: 400 });
    }
    const encoded = JSON.stringify(state);
    if (Buffer.byteLength(encoded, 'utf8') > MAX_DRAFT_BYTES) {
      return NextResponse.json({ error: 'Draft state juda katta.' }, { status: 413 });
    }

    const now = new Date().toISOString();
    const { error } = await owned.supabase
      .from('test_sessions')
      .update({ draft_state: state, draft_saved_at: now, updated_at: now })
      .eq('id', owned.session.id)
      .eq('status', 'in_progress');
    if (error) throw error;

    return NextResponse.json({ ok: true, savedAt: now });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Draft saqlanmadi.' }, { status: 500 });
  }
}
