import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRequest } from '@/lib/adminAuth';
import { getServiceSupabase } from '@/lib/supabase/server';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { id } = await params;
    const body = await request.json();
    const status = body?.status === 'active' ? 'active' : body?.status === 'blocked' ? 'blocked' : '';
    if (!status) return NextResponse.json({ error: 'Student statusi noto‘g‘ri.' }, { status: 400 });

    const supabase = getServiceSupabase();
    const { data: student, error } = await supabase
      .from('students')
      .update({ status })
      .eq('id', id)
      .select('id,first_name,last_name,status')
      .maybeSingle();
    if (error) throw error;
    if (!student) return NextResponse.json({ error: 'Student topilmadi.' }, { status: 404 });

    if (status === 'blocked') {
      const now = new Date().toISOString();
      await Promise.all([
        supabase.from('login_codes').update({ used_at: now }).eq('student_id', id).is('used_at', null),
        supabase.from('test_sessions').update({ status: 'expired', updated_at: now }).eq('student_id', id).eq('status', 'in_progress'),
      ]);
    }

    return NextResponse.json({ student });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Student statusi yangilanmadi.' }, { status: 500 });
  }
}
