import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRequest } from '@/lib/adminAuth';
import {
  ensureShadowingVideoBucket,
  safeShadowingStorageName,
  SHADOWING_MAX_VIDEO_BYTES,
  SHADOWING_VIDEO_BUCKET,
} from '@/lib/shadowing';
import { getServiceSupabase } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    const name = String(body?.name || '').trim();
    const type = String(body?.type || '').toLowerCase();
    const size = Number(body?.size || 0);

    if (!/\.mp4$/i.test(name) || !['video/mp4', 'application/octet-stream', ''].includes(type)) {
      return NextResponse.json({ error: 'Shadowing video MP4 formatida bo‘lishi kerak.' }, { status: 400 });
    }
    if (!Number.isFinite(size) || size <= 0 || size > SHADOWING_MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: 'Video hajmi 80 MB dan oshmasligi kerak.' }, { status: 400 });
    }

    await ensureShadowingVideoBucket();
    const path = `shadowing/${Date.now()}-${crypto.randomUUID()}-${safeShadowingStorageName(name)}`;
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.storage.from(SHADOWING_VIDEO_BUCKET).createSignedUploadUrl(path);
    if (error || !data?.token) throw error || new Error('Video upload token yaratilmadi.');

    return NextResponse.json({ bucket: SHADOWING_VIDEO_BUCKET, path, token: data.token }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Video upload server xatosi.' }, { status: 500 });
  }
}
