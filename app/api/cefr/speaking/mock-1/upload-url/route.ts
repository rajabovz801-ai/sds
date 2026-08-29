import { NextRequest, NextResponse } from 'next/server';
import { readActiveStudentSession } from '@/lib/auth/active-student';
import {
  CEFR_SPEAKING_AUDIO_BUCKET,
  ensureCefrSpeakingAudioBucket,
  extensionForAudioMime,
  getCefrSpeakingMock,
  normalizeCandidateName,
  safeStorageName,
} from '@/lib/cefrSpeaking';
import { getServiceSupabase } from '@/lib/supabase/server';

const MAX_AUDIO_BYTES = 25 * 1024 * 1024;
const allowedTypes = ['audio/webm', 'audio/ogg', 'audio/mp4', 'application/octet-stream'];

export async function POST(request: NextRequest) {
  try {
    const session = await readActiveStudentSession(request);
    if (!session) return NextResponse.json({ error: 'Student sessiyasi faol emas.' }, { status: 403 });

    const body = await request.json();
    const candidateName = normalizeCandidateName(body?.candidateName);
    const mimeType = String(body?.type || 'audio/webm').toLowerCase().split(';')[0];
    const size = Number(body?.size || 0);
    const durationSeconds = Math.max(0, Math.round(Number(body?.durationSeconds || 0)));

    if (candidateName.length < 2) {
      return NextResponse.json({ error: 'Ismingizni kiriting.' }, { status: 400 });
    }
    if (!allowedTypes.includes(mimeType) || !Number.isFinite(size) || size <= 0 || size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: 'Audio formati yoki hajmi noto‘g‘ri.' }, { status: 400 });
    }

    const mock = await getCefrSpeakingMock();
    if (!mock) return NextResponse.json({ error: 'Speaking Mock topilmadi.' }, { status: 404 });

    await ensureCefrSpeakingAudioBucket();
    const supabase = getServiceSupabase();
    const extension = extensionForAudioMime(mimeType);
    const path = `mock-1/${safeStorageName(candidateName)}-${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const { data: recording, error: recordingError } = await supabase
      .from('cefr_speaking_recordings')
      .insert({
        mock_id: mock.id,
        student_id: session.studentId,
        candidate_name: candidateName,
        audio_path: path,
        mime_type: mimeType,
        size_bytes: size,
        duration_seconds: durationSeconds || null,
        status: 'uploading',
      })
      .select('id')
      .single();
    if (recordingError || !recording) throw recordingError || new Error('Recording yozuvi yaratilmadi.');

    const { data: signed, error: signedError } = await supabase.storage
      .from(CEFR_SPEAKING_AUDIO_BUCKET)
      .createSignedUploadUrl(path);
    if (signedError || !signed?.token) throw signedError || new Error('Audio upload token yaratilmadi.');

    return NextResponse.json({
      recordingId: recording.id,
      bucket: CEFR_SPEAKING_AUDIO_BUCKET,
      path,
      token: signed.token,
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Audio upload server error' }, { status: 500 });
  }
}
