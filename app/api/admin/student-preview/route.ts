import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRequest } from '@/lib/adminAuth';
import { getDashboardData } from '@/lib/dashboard';
import { getServiceSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const supabase = getServiceSupabase();
    const requestedId = String(request.nextUrl.searchParams.get('studentId') || '').trim();

    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('id,first_name,last_name,telegram_id,status')
      .eq('status', 'active')
      .order('first_name', { ascending: true })
      .order('last_name', { ascending: true })
      .limit(1000);
    if (studentsError) throw studentsError;

    const rows = students || [];
    const selected = requestedId
      ? rows.find((student) => String(student.id) === requestedId)
      : rows[0];

    if (!selected) {
      return NextResponse.json({
        students: [],
        student: null,
        dashboard: null,
      }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    const dashboard = await getDashboardData(String(selected.id));

    return NextResponse.json({
      students: rows.map((student) => ({
        id: String(student.id),
        firstName: String(student.first_name || ''),
        lastName: String(student.last_name || ''),
        telegramId: String(student.telegram_id || ''),
      })),
      student: {
        id: String(selected.id),
        firstName: String(selected.first_name || ''),
        lastName: String(selected.last_name || ''),
      },
      dashboard,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Student preview yuklanmadi.',
    }, { status: 500 });
  }
}
