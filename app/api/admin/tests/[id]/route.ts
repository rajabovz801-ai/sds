import { NextRequest, NextResponse } from 'next/server';
import { getServiceSupabase, HTML_TESTS_BUCKET } from '@/lib/supabase/server';
import { checkAdminRequest } from '@/lib/adminAuth';

const tracks = ['ielts', 'cefr'];
const skills = ['reading', 'listening', 'writing', 'speaking', 'full-mock'];
const statuses = ['draft', 'published'];

function authResponse(request: NextRequest) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = authResponse(request);
  if (denied) return denied;

  try {
    const { id } = await params;
    const body = await request.json() as Record<string, unknown>;
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const track = String(body.track || '');
    const skill = String(body.skill || '');
    const status = String(body.status || '');

    if (!title || title.length > 120 || description.length > 500 || !tracks.includes(track) || !skills.includes(skill) || !statuses.includes(status)) {
      return NextResponse.json({ error: 'Test ma’lumotlari noto‘g‘ri.' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const { data, error } = await supabase.from('tests').update({
      title,
      description,
      track,
      skill,
      status,
      updated_at: new Date().toISOString(),
    }).eq('id', id).select('*').single();
    if (error) throw error;
    return NextResponse.json({ test: data });
  } catch (error) {
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
