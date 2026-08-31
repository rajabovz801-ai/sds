import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRequest } from '@/lib/adminAuth';
import { getServiceSupabase, HTML_TESTS_BUCKET } from '@/lib/supabase/server';

const tracks = ['ielts', 'cefr'] as const;
const skills = ['reading', 'listening', 'writing', 'speaking', 'full-mock'] as const;
const statuses = ['draft', 'published'] as const;
const listeningScopes = ['part-1', 'part-2', 'part-3', 'part-4', 'full-test'] as const;
const readingScopes = ['passage-1', 'passage-2', 'passage-3', 'full-test'] as const;
const MAX_DIRECT_HTML_BYTES = 50 * 1024 * 1024;

type Track = typeof tracks[number];
type Skill = typeof skills[number];
type Status = typeof statuses[number];

type Metadata = {
  title: string;
  description: string;
  track: Track;
  skill: Skill;
  status: Status;
  testScope: string | null;
  testScopeProvided: boolean;
  durationMinutes: number;
  fileName: string;
  filePath: string;
  fileSize: number;
};

function authResponse(request: NextRequest) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  return null;
}

function validHtmlName(fileName: string) {
  return /\.html?$/i.test(fileName) && fileName.length <= 180;
}

function safeName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-120);
}

function parseTestScope(track: string, skill: string, raw: unknown) {
  if (track !== 'ielts' || (skill !== 'listening' && skill !== 'reading')) return { ok: true, value: null as string | null };
  const value = String(raw || '').trim();
  if (!value) return { ok: true, value: null as string | null };
  const allowed = skill === 'listening' ? listeningScopes : readingScopes;
  return allowed.includes(value as never) ? { ok: true, value } : { ok: false, value: null as string | null };
}

function parseMetadata(body: Record<string, unknown>): Metadata | null {
  const title = String(body.title || '').trim();
  const description = String(body.description || '').trim();
  const track = String(body.track || '') as Track;
  const skill = String(body.skill || '') as Skill;
  const status = String(body.status || '') as Status;
  const durationMinutes = Number(body.durationMinutes || 60);
  const fileName = String(body.fileName || '').trim();
  const filePath = String(body.filePath || '').trim();
  const fileSize = Number(body.fileSize || 0);
  const testScopeProvided = Object.prototype.hasOwnProperty.call(body, 'testScope');
  const scope = parseTestScope(track, skill, body.testScope);

  if (!title || title.length > 120 || description.length > 500) return null;
  if (!tracks.includes(track) || !skills.includes(skill) || !statuses.includes(status) || !scope.ok) return null;
  if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 240) return null;
  if (!validHtmlName(fileName) || fileSize <= 0 || fileSize > MAX_DIRECT_HTML_BYTES) return null;
  if (!filePath.startsWith(`${track}/${skill}/`) || filePath.includes('..')) return null;

  return { title, description, track, skill, status, testScope: scope.value, testScopeProvided, durationMinutes, fileName, filePath, fileSize };
}

async function objectExists(filePath: string) {
  const supabase = getServiceSupabase();
  const slash = filePath.lastIndexOf('/');
  if (slash <= 0) return false;
  const folder = filePath.slice(0, slash);
  const objectName = filePath.slice(slash + 1);
  const { data, error } = await supabase.storage.from(HTML_TESTS_BUCKET).list(folder, {
    limit: 20,
    search: objectName,
  });
  if (error) throw error;
  return Boolean(data?.some((item) => item.name === objectName));
}

async function cleanup(filePath: string) {
  if (!filePath) return;
  try {
    await getServiceSupabase().storage.from(HTML_TESTS_BUCKET).remove([filePath]);
  } catch {
    // Best-effort cleanup only.
  }
}

export async function POST(request: NextRequest) {
  const denied = authResponse(request);
  if (denied) return denied;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'So‘rov formati noto‘g‘ri.' }, { status: 400 });
  }

  const action = String(body.action || '');

  if (action === 'sign') {
    const fileName = String(body.fileName || '').trim();
    const fileSize = Number(body.fileSize || 0);
    const track = String(body.track || '') as Track;
    const skill = String(body.skill || '') as Skill;

    if (!validHtmlName(fileName)) {
      return NextResponse.json({ error: 'Faqat .html yoki .htm fayl qabul qilinadi.' }, { status: 400 });
    }
    if (!tracks.includes(track) || !skills.includes(skill)) {
      return NextResponse.json({ error: 'Test turi noto‘g‘ri.' }, { status: 400 });
    }
    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_DIRECT_HTML_BYTES) {
      return NextResponse.json({ error: 'HTML fayl hajmi 50 MB dan oshmasligi kerak.' }, { status: 400 });
    }

    try {
      const filePath = `${track}/${skill}/${crypto.randomUUID()}-${safeName(fileName)}`;
      const { data, error } = await getServiceSupabase()
        .storage
        .from(HTML_TESTS_BUCKET)
        .createSignedUploadUrl(filePath);
      if (error) throw error;
      if (!data?.token) throw new Error('Upload token yaratilmadi.');
      return NextResponse.json({ filePath, token: data.token, maxBytes: MAX_DIRECT_HTML_BYTES });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Upload tayyorlanmadi.' }, { status: 500 });
    }
  }

  if (action !== 'create' && action !== 'update') {
    return NextResponse.json({ error: 'Noma’lum upload amali.' }, { status: 400 });
  }

  const metadata = parseMetadata(body);
  if (!metadata) {
    return NextResponse.json({ error: 'Test ma’lumotlari yoki HTML fayl noto‘g‘ri.' }, { status: 400 });
  }

  const supabase = getServiceSupabase();
  try {
    if (!(await objectExists(metadata.filePath))) {
      return NextResponse.json({ error: 'Yuklangan HTML fayl storage’da topilmadi.' }, { status: 400 });
    }

    if (action === 'create') {
      const { data, error } = await supabase.from('tests').insert({
        title: metadata.title,
        description: metadata.description,
        track: metadata.track,
        skill: metadata.skill,
        status: metadata.status,
        test_scope: metadata.testScope,
        duration_minutes: metadata.durationMinutes,
        file_name: metadata.fileName,
        file_path: metadata.filePath,
      }).select('*').single();
      if (error) throw error;
      return NextResponse.json({ test: data, directUpload: true }, { status: 201 });
    }

    const testId = String(body.testId || '').trim();
    if (!testId) {
      await cleanup(metadata.filePath);
      return NextResponse.json({ error: 'Test ID topilmadi.' }, { status: 400 });
    }

    const { data: previous, error: previousError } = await supabase
      .from('tests')
      .select('id,file_path,test_scope')
      .eq('id', testId)
      .single();
    if (previousError || !previous) {
      await cleanup(metadata.filePath);
      return NextResponse.json({ error: 'Tahrirlanayotgan test topilmadi.' }, { status: 404 });
    }

    const update: Record<string, unknown> = {
      title: metadata.title,
      description: metadata.description,
      track: metadata.track,
      skill: metadata.skill,
      status: metadata.status,
      duration_minutes: metadata.durationMinutes,
      file_name: metadata.fileName,
      file_path: metadata.filePath,
      updated_at: new Date().toISOString(),
    };
    if (metadata.testScopeProvided) update.test_scope = metadata.testScope;

    const { data, error } = await supabase.from('tests').update(update).eq('id', testId).select('*').single();
    if (error) throw error;

    if (previous.file_path && previous.file_path !== metadata.filePath) {
      await cleanup(previous.file_path);
    }
    return NextResponse.json({ test: data, fileReplaced: true, directUpload: true });
  } catch (error) {
    await cleanup(metadata.filePath);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'HTML fayl saqlanmadi.' }, { status: 500 });
  }
}
