import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRequest } from '@/lib/adminAuth';
import { getServiceSupabase } from '@/lib/supabase/server';

function deny(request: NextRequest) {
  const auth = checkAdminRequest(request);
  return auth.ok ? null : NextResponse.json({ error: auth.error }, { status: auth.status });
}

export async function GET(request: NextRequest) {
  const denied = deny(request);
  if (denied) return denied;
  try {
    const { data, error } = await getServiceSupabase()
      .from('tests')
      .select('id,title,track,skill,status,daily_task_enabled,daily_task_points,updated_at')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ tests: data || [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const denied = deny(request);
  if (denied) return denied;
  try {
    const body = await request.json() as { id?: string; enabled?: boolean; points?: number };
    const id = String(body.id || '').trim();
    const enabled = Boolean(body.enabled);
    const points = Math.round(Number(body.points));
    if (!id || !Number.isFinite(points) || points < 0 || points > 100) {
      return NextResponse.json({ error: 'Daily Task ma’lumotlari noto‘g‘ri.' }, { status: 400 });
    }
    const supabase = getServiceSupabase();
    const { data: current, error: currentError } = await supabase.from('tests').select('id,status').eq('id', id).maybeSingle();
    if (currentError) throw currentError;
    if (!current) return NextResponse.json({ error: 'Test topilmadi.' }, { status: 404 });
    if (enabled && current.status !== 'published') return NextResponse.json({ error: 'Faqat published test Daily Task bo‘la oladi.' }, { status: 409 });

    const { data, error } = await supabase.from('tests').update({
      daily_task_enabled: enabled,
      daily_task_points: points,
      updated_at: new Date().toISOString(),
    }).eq('id', id).select('id,title,track,skill,status,daily_task_enabled,daily_task_points,updated_at').single();
    if (error) throw error;
    return NextResponse.json({ test: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 });
  }
}
