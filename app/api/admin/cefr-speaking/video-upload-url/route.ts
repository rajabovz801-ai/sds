import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRequest } from '@/lib/adminAuth';
import {
  CEFR_SPEAKING_VIDEO_BUCKET,
  ensureCefrSpeakingVideoBucket,
  safeStorageName,
} from '@/lib/cefrSpeaking';
import { getServiceSupabase } from '@/lib/supabase/server';

const MAX_VIDEO_BYTES = 80 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    const name = String(body?.name || '').trim();
    const type = String(body?.type || '').toLowerCase();
    const size = Number(body?.size || 0);

    if (!/\.mp4$/i.test(name) || !['video/mp4', 'application/octet-stream', ''].includes(type)) {
      return NextResponse.json({ error: 'Instruction video MP4 formatida bo‘lishi kerak.' }, { status: 400 });
    }
    if (!Number.isFinite(size) || size <= 0 || size > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: 'Video hajmi 80 MB dan oshmasligi kerak.' }, { status: 400 });
    }

    await ensureCefrSpeakingVideoBucket();
    const path = `instructions/cefr-speaking/${Date.now()}-${crypto.randomUUID()}-${safeStorageName(name)}`;
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.storage
      .from(CEFR_SPEAKING_VIDEO_BUCKET)
      .createSignedUploadUrl(path);
    if (error || !data?.token) throw error || new Error('Video upload token yaratilmadi.');

    return NextResponse.json({ bucket: CEFR_SPEAKING_VIDEO_BUCKET, path, token: data.token }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Video upload server error' }, { status: 500 });
  }
}
