import { NextRequest, NextResponse } from 'next/server';
import { checkAdminRequest } from '@/lib/adminAuth';
import { getServiceSupabase } from '@/lib/supabase/server';
import { SPEAKING_PRACTICE_AUDIO_BUCKET } from '@/lib/speakingPracticeStorage';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = checkAdminRequest(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { id } = await params;
    const supabase = getServiceSupabase();
    const { data: recording, error } = await supabase
      .from('speaking_practice_recordings')
      .select('audio_path')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!recording?.audio_path) return new NextResponse('Audio topilmadi.', { status: 404 });

    const { data, error: signError } = await supabase.storage
      .from(SPEAKING_PRACTICE_AUDIO_BUCKET)
      .createSignedUrl(recording.audio_path, 10 * 60);
    if (signError || !data?.signedUrl) throw signError || new Error('Audio URL yaratilmadi.');

    return NextResponse.redirect(data.signedUrl, 307);
  } catch (error) {
    return new NextResponse(error instanceof Error ? error.message : 'Audio server error', { status: 500 });
  }
}
