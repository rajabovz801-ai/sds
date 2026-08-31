import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, HTML_TESTS_BUCKET } from '@/lib/supabase/server';
import { checkAdminRequest } from '@/lib/adminAuth';

const tracks = ['ielts', 'cefr'] as const;
const skills = ['reading', 'listening', 'writing', 'speaking', 'full-mock', 'vocabulary'] as const;
const statuses = ['draft', 'published'] as const;
const listeningScopes = ['part-1', 'part-2', 'part-3', 'part-4', 'full-test'] as const;
const readingScopes = ['passage-1', 'passage-2', 'passage-3', 'full-test'] as const;
const MAX_HTML_BYTES = 10 * 1024 * 1024;

function authResponse(request: NextRequest) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return null;
}

function parseTestScope(track: string, skill: string, raw: FormDataEntryValue | null) {
  if (track !== 'ielts' || (skill !== 'listening' && skill !== 'reading')) return { ok: true, value: null as string | null };
  const value = String(raw || '').trim();
  if (!value) return { ok: true, value: null as string | null };
  const allowed = skill === 'listening' ? listeningScopes : readingScopes;
  return allowed.includes(value as never) ? { ok: true, value } : { ok: false, value: null as string | null };
}

export async function GET(request: NextRequest) {
  const denied = authResponse(request);
  if (denied) return denied;

  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.from('tests').select('*').order('updated_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json({ tests: data || [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = authResponse(request);
  if (denied) return denied;

  let uploadedPath = '';
  try {
    const form = await request.formData();
    const title = String(form.get('title') || '').trim();
    const description = String(form.get('description') || '').trim();
    const track = String(form.get('track') || '');
    const skill = String(form.get('skill') || '');
    const status = String(form.get('status') || 'draft');
    const durationMinutes = Number(form.get('durationMinutes') || 60);
    const file = form.get('file');
    const scope = parseTestScope(track, skill, form.get('testScope'));

    if (!title || title.length > 120 || !(file instanceof File)) {
      return NextResponse.json({ error: 'Test nomi va HTML fayl majburiy.' }, { status: 400 });
    }
    if (description.length > 500 || !tracks.includes(track as typeof tracks[number]) || !skills.includes(skill as typeof skills[number]) || !statuses.includes(status as typeof statuses[number]) || !Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 240 || !scope.ok) {
      return NextResponse.json({ error: 'Test ma’lumotlari noto‘g‘ri.' }, { status: 400 });
    }
    if (!/\.html?$/i.test(file.name) || !['text/html', 'application/octet-stream', ''].includes(file.type)) {
      return NextResponse.json({ error: 'Faqat .html yoki .htm fayl qabul qilinadi.' }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_HTML_BYTES) {
      return NextResponse.json({ error: 'HTML fayl hajmi 10 MB dan oshmasligi kerak.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-120);
    uploadedPath = `${track}/${skill}/${crypto.randomUUID()}-${safeName}`;
    const bytes = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage.from(HTML_TESTS_BUCKET).upload(uploadedPath, bytes, {
      contentType: 'text/html;charset=utf-8',
      upsert: false,
    });
    if (uploadError) throw uploadError;

    const { data, error } = await supabase.from('tests').insert({
      title,
      description,
      track,
      skill,
      status,
      test_scope: scope.value,
      duration_minutes: durationMinutes,
      file_name: file.name,
      file_path: uploadedPath,
    }).select('*').single();
    if (error) throw error;
    return NextResponse.json({ test: data }, { status: 201 });
  } catch (error) {
    if (uploadedPath) {
      try { await getServiceSupabase().storage.from(HTML_TESTS_BUCKET).remove([uploadedPath]); } catch { /* best effort cleanup */ }
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 });
  }
}
