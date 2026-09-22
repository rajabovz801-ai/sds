import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, HTML_TESTS_BUCKET } from '@/lib/supabase/server';
import { checkAdminRequest } from '@/lib/adminAuth';

const skills = ['reading', 'listening'];
const statuses = ['draft', 'published'];
const collections = ['real-exam', 'cambridge', 'gold'];
const listeningScopes = ['part-1', 'part-2', 'part-3', 'part-4', 'full-test'];
const readingScopes = ['passage-1', 'passage-2', 'passage-3', 'full-test'];
const MAX_HTML_BYTES = 10 * 1024 * 1024;

function authResponse(request: NextRequest) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return null;
}

function parseTestScope(skill: string, raw: unknown) {
  const value = String(raw || 'full-test').trim() || 'full-test';
  const allowed = skill === 'listening' ? listeningScopes : readingScopes;
  return allowed.includes(value) ? { ok: true, value } : { ok: false, value: 'full-test' };
}

function parseCollection(raw: unknown) {
  const value = String(raw || 'real-exam').trim() || 'real-exam';
  return collections.includes(value) ? { ok: true, value } : { ok: false, value: 'real-exam' };
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
    const track = String(body.track || 'ielts');
    const skill = String(body.skill || '');
    const status = String(body.status || '');
    const durationMinutes = Number(body.durationMinutes || 60);
    const scope = parseTestScope(skill, body.testScope);
    const collection = parseCollection(body.testCollection);

    if (
      !title || title.length > 120 || description.length > 500 || track !== 'ielts' || !skills.includes(skill) ||
      !statuses.includes(status) || !Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 240 ||
      !scope.ok || !collection.ok
    ) {
      return NextResponse.json({ error: 'Test ma’lumotlari noto‘g‘ri.' }, { status: 400 });
    }
    if (file && (!/\.html?$/i.test(file.name) || !['text/html', 'application/octet-stream', ''].includes(file.type))) {
      return NextResponse.json({ error: 'Faqat .html yoki .htm fayl qabul qilinadi.' }, { status: 400 });
    }
    if (file && file.size > MAX_HTML_BYTES) {
      return NextResponse.json({ error: 'HTML fayl hajmi 10 MB dan oshmasligi kerak.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data: current, error: currentError } = await supabase.from('tests').select('file_path').eq('id', id).maybeSingle();
    if (currentError) throw currentError;
    if (!current) return NextResponse.json({ error: 'Test topilmadi.' }, { status: 404 });

    const update: Record<string, unknown> = {
      title,
      description,
      track: 'ielts',
      skill,
      status,
      test_scope: scope.value,
      test_collection: collection.value,
      duration_minutes: durationMinutes,
      mock_only: false,
      updated_at: new Date().toISOString(),
    };

    if (file) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-120);
      uploadedPath = `ielts/${skill}/${crypto.randomUUID()}-${safeName}`;
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
    const { data: row, error: readError } = await supabase.from('tests').select('file_path').eq('id', id).maybeSingle();
    if (readError) throw readError;
    if (!row) return NextResponse.json({ error: 'Test topilmadi.' }, { status: 404 });

    const [{ count: sessionCount, error: sessionError }, { count: attemptCount, error: attemptError }, { count: mockCount, error: mockError }] = await Promise.all([
      supabase.from('test_sessions').select('id', { count: 'exact', head: true }).eq('test_id', id),
      supabase.from('attempts').select('id', { count: 'exact', head: true }).eq('test_id', id),
      supabase.from('mocks').select('id', { count: 'exact', head: true }).or(`listening_test_id.eq.${id},reading_test_id.eq.${id},writing_test_id.eq.${id},speaking_test_id.eq.${id}`),
    ]);
    if (sessionError) throw sessionError;
    if (attemptError) throw attemptError;
    if (mockError) throw mockError;

    if ((sessionCount || 0) > 0 || (attemptCount || 0) > 0 || (mockCount || 0) > 0) {
      return NextResponse.json({ error: 'Bu test eski natija yoki mock bilan bog‘langan. Avval Yopiq holatga o‘tkazing.' }, { status: 409 });
    }

    const { error: deleteError } = await supabase.from('tests').delete().eq('id', id);
    if (deleteError) throw deleteError;

    let storageWarning = false;
    if (row.file_path) {
      const { error: storageError } = await supabase.storage.from(HTML_TESTS_BUCKET).remove([row.file_path]);
      storageWarning = Boolean(storageError);
    }
    return NextResponse.json({ ok: true, storageWarning });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 });
  }
}
