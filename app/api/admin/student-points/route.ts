import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRequest } from '@/lib/adminAuth';
import { getServiceSupabase } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type StudentRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  telegram_username: string | null;
  status: string | null;
};

type PointRow = {
  student_id: string;
  points_awarded?: number | string | null;
  points?: number | string | null;
};

function sumByStudent(rows: PointRow[], field: 'points_awarded' | 'points') {
  const totals = new Map<string, number>();
  for (const row of rows) {
    const studentId = String(row.student_id || '');
    if (!studentId) continue;
    const value = Number(row[field]) || 0;
    totals.set(studentId, (totals.get(studentId) || 0) + value);
  }
  return totals;
}

async function loadBalances() {
  const supabase = getServiceSupabase();
  const [studentQuery, taskQuery, adjustmentQuery] = await Promise.all([
    supabase
      .from('students')
      .select('id,first_name,last_name,telegram_username,status')
      .order('first_name', { ascending: true })
      .order('last_name', { ascending: true })
      .limit(1000),
    supabase
      .from('daily_task_completions')
      .select('student_id,points_awarded')
      .limit(10000),
    supabase
      .from('student_point_adjustments')
      .select('student_id,points')
      .limit(10000),
  ]);

  for (const query of [studentQuery, taskQuery, adjustmentQuery]) {
    if (query.error) throw query.error;
  }

  const taskTotals = sumByStudent((taskQuery.data || []) as PointRow[], 'points_awarded');
  const adminTotals = sumByStudent((adjustmentQuery.data || []) as PointRow[], 'points');

  return ((studentQuery.data || []) as StudentRow[]).map((student) => {
    const taskPts = taskTotals.get(String(student.id)) || 0;
    const adminPts = adminTotals.get(String(student.id)) || 0;
    return {
      id: String(student.id),
      firstName: String(student.first_name || ''),
      lastName: String(student.last_name || ''),
      username: student.telegram_username ? String(student.telegram_username) : null,
      status: String(student.status || 'active'),
      taskPts,
      adminPts,
      totalPts: Math.max(0, taskPts + adminPts),
    };
  });
}

export async function GET(request: NextRequest) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const students = await loadBalances();
    return NextResponse.json({ students }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'PTS ma’lumotlari yuklanmadi.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    const studentId = typeof body?.studentId === 'string' ? body.studentId.trim() : '';
    const operation = body?.operation === 'add' ? 'add' : body?.operation === 'subtract' ? 'subtract' : '';
    const amount = Math.round(Number(body?.amount));
    const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 240) : '';

    if (!studentId) return NextResponse.json({ error: 'O‘quvchini tanlang.' }, { status: 400 });
    if (!operation) return NextResponse.json({ error: 'PTS amalini tanlang.' }, { status: 400 });
    if (!Number.isFinite(amount) || amount < 1 || amount > 10000) {
      return NextResponse.json({ error: 'PTS 1 dan 10 000 gacha bo‘lishi kerak.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id,first_name,last_name')
      .eq('id', studentId)
      .maybeSingle();
    if (studentError) throw studentError;
    if (!student) return NextResponse.json({ error: 'O‘quvchi topilmadi.' }, { status: 404 });

    const [{ data: taskRows, error: taskError }, { data: adjustmentRows, error: adjustmentError }] = await Promise.all([
      supabase.from('daily_task_completions').select('points_awarded').eq('student_id', studentId).limit(10000),
      supabase.from('student_point_adjustments').select('points').eq('student_id', studentId).limit(10000),
    ]);
    if (taskError) throw taskError;
    if (adjustmentError) throw adjustmentError;

    const taskPts = (taskRows || []).reduce((sum, row) => sum + (Number(row.points_awarded) || 0), 0);
    const adminPts = (adjustmentRows || []).reduce((sum, row) => sum + (Number(row.points) || 0), 0);
    const currentPts = Math.max(0, taskPts + adminPts);

    if (operation === 'subtract' && amount > currentPts) {
      return NextResponse.json({ error: `O‘quvchida ${currentPts} PTS bor. Bundan ko‘p ayirib bo‘lmaydi.` }, { status: 400 });
    }

    const signedPoints = operation === 'add' ? amount : -amount;
    const { data: adjustment, error: insertError } = await supabase
      .from('student_point_adjustments')
      .insert({ student_id: studentId, points: signedPoints, reason: reason || null })
      .select('id,student_id,points,reason,created_at')
      .single();
    if (insertError) throw insertError;

    const totalPts = Math.max(0, currentPts + signedPoints);
    return NextResponse.json({
      adjustment,
      student: {
        id: String(student.id),
        firstName: String(student.first_name || ''),
        lastName: String(student.last_name || ''),
        totalPts,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'PTS o‘zgartirilmadi.' }, { status: 500 });
  }
}
