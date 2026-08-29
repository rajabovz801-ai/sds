import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRequest } from '@/lib/adminAuth';
import { getServiceSupabase, HTML_TESTS_BUCKET } from '@/lib/supabase/server';

type UploadKind = 'listeningHtml' | 'readingHtml' | 'listeningVideo' | 'readingVideo';

const limits: Record<UploadKind, number> = {
  listeningHtml: 10 * 1024 * 1024,
  readingHtml: 10 * 1024 * 1024,
  listeningVideo: 50 * 1024 * 1024,
  readingVideo: 50 * 1024 * 1024,
};

function safeName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-120) || 'asset';
}

async function ensureMockAssetsBucket() {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.storage.listBuckets();
  if (error) throw error;
  if (data?.some((bucket) => bucket.id === 'mock-assets')) return;
  const { error: createError } = await supabase.storage.createBucket('mock-assets', {
    public: false,
    fileSizeLimit: 50 * 1024 * 1024,
    allowedMimeTypes: ['video/mp4'],
  });
  if (createError && !/already exists/i.test(createError.message || '')) throw createError;
}

export async function POST(request: NextRequest) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    const kind = String(body?.kind || '') as UploadKind;
    const name = String(body?.name || '').trim();
    const type = String(body?.type || '').toLowerCase();
    const size = Number(body?.size || 0);

    if (!Object.prototype.hasOwnProperty.call(limits, kind) || !name || !Number.isFinite(size) || size <= 0 || size > limits[kind]) {
      return NextResponse.json({ error: 'Fayl ma’lumotlari noto‘g‘ri yoki hajmi katta.' }, { status: 400 });
    }

    const isHtml = kind.endsWith('Html');
    if (isHtml && (!/\.html?$/i.test(name) || !['text/html', 'application/octet-stream', ''].includes(type))) {
      return NextResponse.json({ error: 'Mock test uchun faqat HTML fayl qabul qilinadi.' }, { status: 400 });
    }
    if (!isHtml && (!/\.mp4$/i.test(name) || !['video/mp4', 'application/octet-stream', ''].includes(type))) {
      return NextResponse.json({ error: 'Instruction video MP4 formatida bo‘lishi kerak.' }, { status: 400 });
    }

    const bucket = isHtml ? HTML_TESTS_BUCKET : 'mock-assets';
    if (!isHtml) await ensureMockAssetsBucket();

    const skill = kind.startsWith('listening') ? 'listening' : 'reading';
    const path = isHtml
      ? `ielts/${skill}/mock-${crypto.randomUUID()}-${safeName(name)}`
      : `instructions/${skill}/${crypto.randomUUID()}-${safeName(name)}`;

    const supabase = getServiceSupabase();
    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
    if (error || !data?.token) throw error || new Error('Signed upload token yaratilmadi.');

    return NextResponse.json({ bucket, path, token: data.token, kind }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Upload URL server error' }, { status: 500 });
  }
}
