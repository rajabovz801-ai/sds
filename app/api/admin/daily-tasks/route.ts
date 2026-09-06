import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRequest } from '@/lib/adminAuth';
import { getServiceSupabase } from '@/lib/supabase/server';

function deny(request: NextRequest) {
  const auth = checkAdminRequest(request);
  return auth.ok ? null : NextResponse.json({ error: auth.error }, { status: auth.status });
}

const DAILY_TASK_WINDOW_MS = 24 * 60 * 60 * 1000;

type CurrentTask = {
  id: string;
  status: string;
  daily_task_enabled: boolean;
  daily_task_started_at: string | null;
  daily_task_expires_at: string | null;
};

function makeUpdate(current: CurrentTask, enabled: boolean, points: number) {
  const now = new Date();
  const currentExpiry = current.daily_task_expires_at ? new Date(current.daily_task_expires_at).getTime() : 0;
  const stillActive = Boolean(current.daily_task_enabled && currentExpiry > now.getTime());
  const update: Record<string, unknown> = {
    daily_task_enabled: enabled,
    daily_task_points: points,
    updated_at: now.toISOString(),
  };
  if (enabled && !stillActive) {
    update.daily_task_started_at = now.toISOString();
    update.daily_task_expires_at = new Date(now.getTime() + DAILY_TASK_WINDOW_MS).toISOString();
  }
  return update;
}

export async function GET(request: NextRequest) {
  const denied = deny(request);
  if (denied) return denied;
  try {
    const supabase = getServiceSupabase();
    const now = new Date().toISOString();

    const [{ error: testExpiryError }, { error: shadowExpiryError }] = await Promise.all([
      supabase.from('tests').update({ daily_task_enabled: false }).eq('daily_task_enabled', true).not('daily_task_expires_at', 'is', null).lte('daily_task_expires_at', now),
      supabase.from('shadowing_lessons').update({ daily_task_enabled: false }).eq('daily_task_enabled', true).not('daily_task_expires_at', 'is', null).lte('daily_task_expires_at', now),
    ]);
    if (testExpiryError) throw testExpiryError;
    if (shadowExpiryError) throw shadowExpiryError;

    const [{ data: tests, error: testsError }, { data: shadowing, error: shadowingError }] = await Promise.all([
      supabase
        .from('tests')
        .select('id,title,track,skill,status,daily_task_enabled,daily_task_points,daily_task_started_at,daily_task_expires_at,updated_at')
        .order('updated_at', { ascending: false }),
      supabase
        .from('shadowing_lessons')
        .select('id,sequence_no,title,status,daily_task_enabled,daily_task_points,daily_task_started_at,daily_task_expires_at,updated_at')
        .order('updated_at', { ascending: false }),
    ]);
    if (testsError) throw testsError;
    if (shadowingError) throw shadowingError;

    const rows = [
      ...(tests || []).map((row) => ({ ...row, source: 'test' as const })),
      ...(shadowing || []).map((row) => ({
        id: row.id,
        title: `Shadowing ${row.sequence_no}. ${row.title}`,
        track: 'tools',
        skill: 'shadowing',
        status: row.status,
        daily_task_enabled: row.daily_task_enabled,
        daily_task_points: row.daily_task_points,
        daily_task_started_at: row.daily_task_started_at,
        daily_task_expires_at: row.daily_task_expires_at,
        updated_at: row.updated_at,
        source: 'shadowing' as const,
      })),
    ].sort((a, b) => new Date(String(b.updated_at || '')).getTime() - new Date(String(a.updated_at || '')).getTime());

    return NextResponse.json({ tests: rows }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const denied = deny(request);
  if (denied) return denied;
  try {
    const body = await request.json() as { id?: string; enabled?: boolean; points?: number; source?: 'test' | 'shadowing' };
    const id = String(body.id || '').trim();
    const enabled = Boolean(body.enabled);
    const points = Math.round(Number(body.points));
    const source = body.source === 'shadowing' ? 'shadowing' : 'test';
    if (!id || !Number.isFinite(points) || points < 0 || points > 100) {
      return NextResponse.json({ error: 'Daily Task ma’lumotlari noto‘g‘ri.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();

    if (source === 'shadowing') {
      const { data: current, error: currentError } = await supabase
        .from('shadowing_lessons')
        .select('id,status,daily_task_enabled,daily_task_started_at,daily_task_expires_at')
        .eq('id', id)
        .maybeSingle();
      if (currentError) throw currentError;
      if (!current) return NextResponse.json({ error: 'Shadowing topilmadi.' }, { status: 404 });
      if (enabled && current.status !== 'published') return NextResponse.json({ error: 'Faqat published material Daily Task bo‘la oladi.' }, { status: 409 });

      const { data, error } = await supabase
        .from('shadowing_lessons')
        .update(makeUpdate(current as CurrentTask, enabled, points))
        .eq('id', id)
        .select('id,sequence_no,title,status,daily_task_enabled,daily_task_points,daily_task_started_at,daily_task_expires_at,updated_at')
        .single();
      if (error) throw error;
      return NextResponse.json({ test: {
        id: data.id,
        title: `Shadowing ${data.sequence_no}. ${data.title}`,
        track: 'tools',
        skill: 'shadowing',
        status: data.status,
        daily_task_enabled: data.daily_task_enabled,
        daily_task_points: data.daily_task_points,
        daily_task_started_at: data.daily_task_started_at,
        daily_task_expires_at: data.daily_task_expires_at,
        updated_at: data.updated_at,
        source: 'shadowing',
      } });
    }

    const { data: current, error: currentError } = await supabase
      .from('tests')
      .select('id,status,daily_task_enabled,daily_task_started_at,daily_task_expires_at')
      .eq('id', id)
      .maybeSingle();
    if (currentError) throw currentError;
    if (!current) return NextResponse.json({ error: 'Test topilmadi.' }, { status: 404 });
    if (enabled && current.status !== 'published') return NextResponse.json({ error: 'Faqat published material Daily Task bo‘la oladi.' }, { status: 409 });

    const { data, error } = await supabase
      .from('tests')
      .update(makeUpdate(current as CurrentTask, enabled, points))
      .eq('id', id)
      .select('id,title,track,skill,status,daily_task_enabled,daily_task_points,daily_task_started_at,daily_task_expires_at,updated_at')
      .single();
    if (error) throw error;
    return NextResponse.json({ test: { ...data, source: 'test' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 });
  }
}
