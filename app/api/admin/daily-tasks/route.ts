import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRequest } from '@/lib/adminAuth';
import { getServiceSupabase } from '@/lib/supabase/server';

function deny(request: NextRequest) {
  const auth = checkAdminRequest(request);
  return auth.ok ? null : NextResponse.json({ error: auth.error }, { status: auth.status });
}

const DAILY_TASK_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const denied = deny(request);
  if (denied) return denied;
  try {
    const supabase = getServiceSupabase();
    const now = new Date().toISOString();

    // Expired tasks are no longer active. Timestamps are intentionally kept
    // so the admin can still see when the last 24-hour window ended.
    const { error: expiryError } = await supabase
      .from('tests')
      .update({ daily_task_enabled: false })
      .eq('daily_task_enabled', true)
      .not('daily_task_expires_at', 'is', null)
      .lte('daily_task_expires_at', now);
    if (expiryError) throw expiryError;

    const { data, error } = await supabase
      .from('tests')
      .select('id,title,track,skill,status,daily_task_enabled,daily_task_points,daily_task_started_at,daily_task_expires_at,updated_at')
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
    const { data: current, error: currentError } = await supabase
      .from('tests')
      .select('id,status,daily_task_enabled,daily_task_started_at,daily_task_expires_at')
      .eq('id', id)
      .maybeSingle();
    if (currentError) throw currentError;
    if (!current) return NextResponse.json({ error: 'Test topilmadi.' }, { status: 404 });
    if (enabled && current.status !== 'published') return NextResponse.json({ error: 'Faqat published test Daily Task bo‘la oladi.' }, { status: 409 });

    const now = new Date();
    const currentExpiry = current.daily_task_expires_at ? new Date(current.daily_task_expires_at).getTime() : 0;
    const stillActive = Boolean(current.daily_task_enabled && currentExpiry > now.getTime());
    const startsNewWindow = enabled && !stillActive;

    const update: Record<string, unknown> = {
      daily_task_enabled: enabled,
      daily_task_points: points,
      updated_at: now.toISOString(),
    };

    if (startsNewWindow) {
      update.daily_task_started_at = now.toISOString();
      update.daily_task_expires_at = new Date(now.getTime() + DAILY_TASK_WINDOW_MS).toISOString();
    }

    const { data, error } = await supabase.from('tests').update(update)
      .eq('id', id)
      .select('id,title,track,skill,status,daily_task_enabled,daily_task_points,daily_task_started_at,daily_task_expires_at,updated_at')
      .single();
    if (error) throw error;
    return NextResponse.json({ test: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 });
  }
}
