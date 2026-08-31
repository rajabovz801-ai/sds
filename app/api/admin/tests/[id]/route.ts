import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, HTML_TESTS_BUCKET } from '@/lib/supabase/server';
import { checkAdminRequest } from '@/lib/adminAuth';

const tracks = ['ielts', 'cefr'];
const skills = ['reading', 'listening', 'writing', 'speaking', 'full-mock', 'vocabulary'];
const statuses = ['draft', 'published'];
const listeningScopes = ['part-1', 'part-2', 'part-3', 'part-4', 'full-test'];
const readingScopes = ['passage-1', 'passage-2', 'passage-3', 'full-test'];
const MAX_HTML_BYTES = 10 * 1024 * 1024;

function authResponse(request: NextRequest) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return null;
}

function parseTestScope(track: string, skill: string, raw: unknown) {
  if (track !== 'ielts' || (skill !== 'listening' && skill !== 'reading')) return { ok: true, value: null as string | null };
  const value = String(raw || '').trim();
  if (!value) return { ok: true, value: null as string | null };
  const allowed = skill === 'listening' ? listeningScopes : readingScopes;
  return allowed.includes(value) ? { ok: true, value } : { ok: false, value: null as string | null };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = authResponse(request);
  if (denied) return denied;

  let uploadedPath = '';
  try {
    const { id } = await params;
    const contentType = request.headers.get('content-type') || '';
    let body: Record<string, unknown>;
    let file: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      body = Object.fromEntries(form.entries());
      const candidate = form.get('file');
      file = candidate instanceof File && candidate.size > 0 ? candidate : null;
    } else {
      body = await request.json() as Record<string, unknown>;
    }

    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const track = String(body.track || '');
    const skill = String(body.skill || '');
    const status = String(body.status || '');
    const durationMinutes = Number(body.durationMinutes || 60);
    const hasTestScope = Object.prototype.hasOwnProperty.call(body, 'testScope');
    const scope = hasTestScope ? parseTestScope(track, skill, body.testScope) : { ok: true, value: null as string | null };

    if (!title || title.length > 120 || description.length > 500 || !tracks.includes(track) || !skills.includes(skill) || !statuses.includes(status) || !Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 240 || !scope.ok) {
      return NextResponse.json({ error: 'Test ma’lumotlari noto‘g‘ri.' }, { status: 400 });
    }
    if (file && (!/\.html?$/i.test(file.name) || !['text/html', 'application/octet-stream', ''].includes(file.type))) {
      return NextResponse.json({ error: 'Faqat .html yoki .htm fayl qabul qilinadi.' }, { status: 400 });
    }
    if (file && file.size > MAX_HTML_BYTES) {
      return NextResponse.json({ error: 'HTML fayl hajmi 10 MB dan oshmasligi kerak.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data: current, error: currentError } = await supabase.from('tests').select('file_path,test_scope').eq('id', id).maybeSingle();
    if (currentError) throw currentError;
    if (!current) return NextResponse.json({ error: 'Test topilmadi.' }, { status: 404 });

    const update: Record<string, unknown> = {
      title,
      description,
      track,
      skill,
      status,
      duration_minutes: durationMinutes,
      updated_at: new Date().toISOString(),
    };
    if (hasTestScope) update.test_scope = scope.value;

    if (file) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-120);
      uploadedPath = `${track}/${skill}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from(HTML_TESTS_BUCKET).upload(uploadedPath, await file.arrayBuffer(), {
        contentType: 'text/html;charset=utf-8',
        upsert: false,
      });
      if (uploadError) throw uploadError;
      update.file_name = file.name;
      update.file_path = uploadedPath;
    }

    const { data, error } = await supabase.from('tests').update(update).eq('id', id).select('*').single();
    if (error) throw error;

    let storageWarning = false;
    if (file && current.file_path && current.file_path !== uploadedPath) {
      const { error: removeError } = await supabase.storage.from(HTML_TESTS_BUCKET).remove([current.file_path]);
      storageWarning = Boolean(removeError);
    }
    return NextResponse.json({ test: data, fileReplaced: Boolean(file), storageWarning });
  } catch (error) {
    if (uploadedPath) {
      try { await getServiceSupabase().storage.from(HTML_TESTS_BUCKET).remove([uploadedPath]); } catch { /* best effort cleanup */ }
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = authResponse(request);
  if (denied) return denied;

  try {
    const { id } = await params;
    const supabase = getServiceSupabase();
    const { data: row, error: readError } = await supabase.from('tests').select('file_path').eq('id', id).single();
    if (readError) throw readError;

    const { error: deleteError } = await supabase.from('tests').delete().eq('id', id);
    if (deleteError) throw deleteError;

    let storageWarning = false;
    if (row?.file_path) {
      const { error: storageError } = await supabase.storage.from(HTML_TESTS_BUCKET).remove([row.file_path]);
      storageWarning = Boolean(storageError);
    }
    return NextResponse.json({ ok: true, storageWarning });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 });
  }
}
