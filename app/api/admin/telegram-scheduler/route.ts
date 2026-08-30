import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRequest } from '@/lib/adminAuth';
import { getServiceSupabase } from '@/lib/supabase/server';

function deny(request: NextRequest) {
  const auth = checkAdminRequest(request);
  return auth.ok ? null : NextResponse.json({ error: auth.error }, { status: auth.status });
}

export async function GET(request: NextRequest) {
  const denied = deny(request); if (denied) return denied;
  try {
    const supabase = getServiceSupabase();
    const [{ data: groups, error: gErr }, { data: schedules, error: sErr }] = await Promise.all([
      supabase.from('teddy_bot_targets').select('*').order('title'),
      supabase.from('teddy_bot_schedules').select('*,teddy_bot_schedule_targets(target_id,teddy_bot_targets(id,chat_id,title,enabled))').order('created_at', { ascending: false }),
    ]);
    if (gErr) throw gErr; if (sErr) throw sErr;
    return NextResponse.json({ groups: groups || [], schedules: schedules || [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = deny(request); if (denied) return denied;
  try {
    const body = await request.json();
    const supabase = getServiceSupabase();
    if (body.action === 'send_now') {
      const targetIds = Array.isArray(body.target_ids) ? body.target_ids.map(String) : [];
      const text = String(body.message_text || '').trim();
      if (!targetIds.length || !text) return NextResponse.json({ error: 'Guruh va xabar kerak.' }, { status: 400 });
      const rows = targetIds.map((target_id: string) => ({ target_id, message_text: text, due_at: new Date().toISOString() }));
      const { error } = await supabase.from('teddy_bot_outbox').insert(rows); if (error) throw error;
      return NextResponse.json({ ok: true, queued: rows.length });
    }
    if (body.action === 'save_schedule') {
      const p = body.schedule || {};
      const targetIds = Array.isArray(body.target_ids) ? body.target_ids.map(String) : [];
      if (!String(p.title || '').trim() || !String(p.message_text || '').trim() || !/^\d{2}:\d{2}/.test(String(p.send_time || '')) || !targetIds.length) {
        return NextResponse.json({ error: 'Nomi, xabar, vaqt va kamida bitta guruh kerak.' }, { status: 400 });
      }
      const row = {
        title: String(p.title).trim(), message_text: String(p.message_text).trim(), send_time: String(p.send_time).slice(0,5),
        timezone: 'Asia/Tashkent', weekdays: Array.isArray(p.weekdays) && p.weekdays.length ? p.weekdays.map(Number) : null,
        run_date: p.run_date || null, reminder_after_minutes: Array.isArray(p.reminder_after_minutes) ? p.reminder_after_minutes.map(Number).filter((n:number)=>n>0) : [],
        enabled: p.enabled !== false, sticker_file_id: p.sticker_file_id || null, reminder_sticker_file_id: p.reminder_sticker_file_id || null,
        notion_page_id: p.notion_page_id || null, notion_status: p.notion_status || null, updated_at: new Date().toISOString(),
      };
      let schedule;
      if (p.id) {
        const { data, error } = await supabase.from('teddy_bot_schedules').update(row).eq('id', String(p.id)).select('*').single(); if (error) throw error; schedule = data;
      } else {
        const { data, error } = await supabase.from('teddy_bot_schedules').insert(row).select('*').single(); if (error) throw error; schedule = data;
      }
      await supabase.from('teddy_bot_schedule_targets').delete().eq('schedule_id', schedule.id);
      const { error: linkError } = await supabase.from('teddy_bot_schedule_targets').insert(targetIds.map((target_id:string)=>({ schedule_id: schedule.id, target_id }))); if (linkError) throw linkError;
      return NextResponse.json({ ok: true, schedule });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const denied = deny(request); if (denied) return denied;
  try {
    const body = await request.json(); const supabase = getServiceSupabase();
    if (body.action === 'group_enabled') {
      const { data, error } = await supabase.from('teddy_bot_targets').update({ enabled: Boolean(body.enabled), updated_at: new Date().toISOString() }).eq('id', String(body.id)).select('*').single();
      if (error) throw error; return NextResponse.json({ group: data });
    }
    if (body.action === 'schedule_enabled') {
      const { data, error } = await supabase.from('teddy_bot_schedules').update({ enabled: Boolean(body.enabled), updated_at: new Date().toISOString() }).eq('id', String(body.id)).select('*').single();
      if (error) throw error; return NextResponse.json({ schedule: data });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 }); }
}

export async function DELETE(request: NextRequest) {
  const denied = deny(request); if (denied) return denied;
  try {
    const id = new URL(request.url).searchParams.get('id'); if (!id) return NextResponse.json({ error: 'id kerak' }, { status: 400 });
    const supabase = getServiceSupabase(); const { error } = await supabase.from('teddy_bot_schedules').delete().eq('id', id); if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 }); }
}
